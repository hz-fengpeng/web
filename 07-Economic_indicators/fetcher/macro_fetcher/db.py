"""SQLite 写入层：观测的修订语义、采集日志与应用元数据。

这个模块守着本次改造最重要的一条规则：**修订值只追加、绝不覆盖**。
`observation` 的主键是 `(indicator_id, period, revision)`，旧修订行必须留着
（见 docs/02-数据层.md §3.3）：GDP 有初步核算/初步核实/最终核实三次发布，
社融信贷有月度修订。直接 UPDATE 会把修订历史抹掉，而且不会有任何症状。

同时守着一条底线：**不编数**。源里没有的期间写 `value=NULL` +
`status='missing'` 的真实空行，而不是留一个看起来合理的数字。
"""

from __future__ import annotations

import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .catalog import Indicator
from .periods import period_end

# 与 src/shared/types.ts 的 ObsStatus 一致
STATUSES = ('ok', 'prelim', 'revised', 'missing', 'merged')

# 应用打开库时要求的结构版本；`src/main/db/migrate.ts` 的 SCHEMA_VERSION
REQUIRED_SCHEMA_VERSION = 2

# 早期版本在 `app_meta` 里留下的键，现在没有任何代码读它们。
# 应用侧「这份库是真是假」那套判断已整个删除（见 docs/02-数据层.md §3.2.0），
# `mark_fetched()` 每次落盘顺手把它们删掉——这是清掉它们的唯一途径。
LEGACY_META_KEYS = ('data_kind', 'mock_catalog_version')


@dataclass(frozen=True)
class Observation:
    """一条待写入的观测。`revision` 由写入层决定，不在这里。"""

    indicator_id: str
    period: str
    value: float | None
    status: str = 'ok'
    released_at: str | None = None

    @property
    def period_end(self) -> str:
        return period_end(self.period)


@dataclass(frozen=True)
class PlannedWrite:
    """一条将要落库的行，带上它是新增还是修订，供 `--dry-run` 打印。"""

    observation: Observation
    revision: int
    status: str
    reason: str  # 'new' | 'revised' | 'filled'


def utc_now() -> str:
    """ISO 时间戳，与库里既有格式一致（`2026-09-25T10:55:50.480Z`）。"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + \
        f'{datetime.now(timezone.utc).microsecond // 1000:03d}Z'


def connect(path: Path, read_only: bool = False) -> sqlite3.Connection:
    """打开库并把 journal 模式压成 DELETE。

    ★ 必须是 DELETE：内置库随安装包发布，打包后 `-wal` / `-shm` 两个
    附属文件不会跟着走（electron-builder.yml 的 extraResources 只带
    `macro.db`）。留一个 WAL 模式的主库，等于发布一份**不完整**的数据文件。
    Node 侧的生成脚本也是这么做的（`PRAGMA journal_mode = DELETE`）。

    `read_only=True` 时用 `mode=ro` 打开，**一条 PRAGMA 都不发**：
    `journal_mode` 的切换会改写库文件头，而 `--dry-run` 承诺「一个字节都不写」。
    WAL 库以只读方式打开时 SQLite 需要 `-shm` 才能读，读不到会报
    `unable to open database file`——那正好，说明库里有未合并的 WAL，
    应该先把附属文件清掉再跑（`clear_sidecars`）。
    """
    if read_only:
        connection = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    else:
        connection = sqlite3.connect(path)
        connection.execute('PRAGMA journal_mode = DELETE')
        connection.execute('PRAGMA foreign_keys = ON')
    connection.row_factory = sqlite3.Row
    return connection


def clear_sidecars(path: Path) -> list[str]:
    """删掉 `-wal` / `-shm` 残留，返回被删掉的文件名。

    `resources/` 下现在就躺着两个（`macro.db-shm` 32KB、`macro.db-wal` 0 字节），
    是上一次 Node 脚本留下的。把它们一起发布出去没有意义，
    而且旧的 `-wal` 配新的主库文件，SQLite 会拿它做恢复——
    恢复出来的是两次写入的混合体（这个坑在 `src/main/db/bootstrap.ts` 里
    有详细记录，那边用反例测试钉住了同样的行为）。
    """
    removed: list[str] = []
    for suffix in ('-wal', '-shm'):
        sidecar = path.with_name(path.name + suffix)
        if sidecar.exists():
            sidecar.unlink()
            removed.append(sidecar.name)
    return removed


def backup(path: Path, stamp: str | None = None) -> Path:
    """落盘前先备份，返回备份文件路径。"""
    stamp = stamp or datetime.now().strftime('%Y%m%d-%H%M%S')
    target = path.with_name(f'{path.name}.bak-{stamp}')
    shutil.copy2(path, target)
    return target


def check_schema(connection: sqlite3.Connection) -> None:
    """确认这是应用能打开的库。宁可在这里失败，也不写坏一份库。"""
    version = get_meta(connection, 'schema_version')
    if version is None:
        raise RuntimeError(
            '库里没有 schema_version——这不是应用生成/迁移过的库。\n'
            '首次生成请先跑一次应用，或从 resources/macro.db 复制一份再改。',
        )
    if int(version) != REQUIRED_SCHEMA_VERSION:
        raise RuntimeError(
            f'库的 schema_version={version}，应用期望 {REQUIRED_SCHEMA_VERSION}。\n'
            '抓取器不认识其它版本，拒绝写入。',
        )
    tables = {
        row['name']
        for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    missing = {'observation', 'fetch_log', 'app_meta'} - tables
    if missing:
        raise RuntimeError(f'库缺少表：{", ".join(sorted(missing))}')


def current_revisions(connection: sqlite3.Connection,
                      indicator_ids: list[str]) -> dict[tuple[str, str], sqlite3.Row]:
    """每个 `(指标, 期间)` 的当前版本（revision 最大那行）。"""
    if not indicator_ids:
        return {}
    marks = ','.join('?' * len(indicator_ids))
    rows = connection.execute(
        f'''SELECT o.* FROM observation o
             JOIN (SELECT indicator_id, period, MAX(revision) AS revision
                     FROM observation
                    WHERE indicator_id IN ({marks})
                    GROUP BY indicator_id, period) latest
               ON o.indicator_id = latest.indicator_id
              AND o.period = latest.period
              AND o.revision = latest.revision''',
        indicator_ids,
    ).fetchall()
    return {(row['indicator_id'], row['period']): row for row in rows}


def plan(indicator: Indicator, observations: list[Observation],
         existing: dict[tuple[str, str], sqlite3.Row]) -> list[PlannedWrite]:
    """算出该写哪些行。**纯函数**，不碰数据库——这样 `--dry-run` 与真正
    落盘走的是同一个判断，两者不可能分叉。"""
    writes: list[PlannedWrite] = []
    for observation in observations:
        if observation.status not in STATUSES:
            raise ValueError(f'{observation.indicator_id}: 未知状态 {observation.status}')
        previous = existing.get((observation.indicator_id, observation.period))

        if previous is None:
            writes.append(PlannedWrite(observation, 0, observation.status, 'new'))
            continue

        value_changed = not _same(previous['value'], observation.value,
                                  indicator.decimals)
        if not value_changed and previous['status'] == observation.status:
            continue

        # 值变了、或只是状态变了，都要追加新版本，旧行留着。
        # 「之前是 missing、现在有值了」也走这条路——数据到货的正常路径。
        filled = previous['value'] is None and observation.value is not None
        if filled:
            reason = 'filled'
        elif value_changed:
            reason = 'revised'
        else:
            reason = 'status'
        writes.append(PlannedWrite(
            observation,
            int(previous['revision']) + 1,
            _written_status(observation.status, reason),
            reason,
        ))
    return writes


def _written_status(status: str, reason: str) -> str:
    """定新行的 `status`。

    `status` 一列其实混了两种语义，得分开对待：

    - **期间语义**：`merged`（1—2月合并）、`prelim`（初步核算）说的是这期
      数据是什么，不随值变化。用 `'revised'` 盖掉它们，界面上「1—2月合并」
      就变成了「已修订」——1 月凭空消失的原因也就跟着看不见了。
    - **值语义**：`revised` 说的是「这个数被改过」。

    所以只有**值真的变了**、且源没有更具体的说法（`ok`）时，才标 `已修订`。
    光是状态从 `prelim` 挪到 `ok`、值一字未动，那不是修订。
    """
    if reason == 'revised' and status == 'ok':
        return 'revised'
    return status


def _same(a: float | None, b: float | None, decimals: int) -> bool:
    """按指标精度比较。库里的值是取整后存的，比较也必须按同一精度，
    否则 `0.1` 与 `0.10000000000000002` 会被判成不同、写出一堆假修订。"""
    if a is None or b is None:
        return a is None and b is None
    return round(float(a), decimals) == round(float(b), decimals)


def apply(connection: sqlite3.Connection, writes: list[PlannedWrite], fetched_at: str) -> int:
    """在一个事务里落盘。返回写入行数。"""
    if not writes:
        return 0
    insert = '''INSERT INTO observation
                  (indicator_id, period, period_end, value, status, released_at, fetched_at, revision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)'''
    with connection:  # 上下文管理器即事务：中途抛错整体回滚
        for write in writes:
            observation = write.observation
            connection.execute(insert, (
                observation.indicator_id,
                observation.period,
                observation.period_end,
                observation.value,
                write.status,
                observation.released_at,
                fetched_at,
                write.revision,
            ))
    return len(writes)


def delete_indicator(connection: sqlite3.Connection, indicator_id: str) -> int:
    """整条删掉一个指标的观测。

    只用于「这个指标没有真实数据源」的情形：库里若还留着它的值，必须清掉——
    没有采集记录的值留在库里，就破坏了「有值的观测都能在 `fetch_log` 里找到
    采集记录」这条不变量（开发文档 §14.4），比空着危险得多。

    ★ 这是整个抓取器**唯一**会删数据的动作，所以它不在 `plan()` 里
    （`plan()` 是纯函数，`--dry-run` 与落盘共用同一份判断）。
    删除只发生在真正落盘的那条分支上。
    """
    with connection:
        cursor = connection.execute('DELETE FROM observation WHERE indicator_id = ?',
                                    (indicator_id,))
    return cursor.rowcount


def log_fetch(connection: sqlite3.Connection, source_id: str, started_at: str,
              finished_at: str, status: str, rows_written: int, message: str,
              indicator_id: str | None = None) -> None:
    if status not in ('ok', 'partial', 'fail'):
        raise ValueError(f'未知采集状态：{status}')
    with connection:
        connection.execute(
            '''INSERT INTO fetch_log
                 (source_id, indicator_id, started_at, finished_at, status, rows_written, message)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (source_id, indicator_id, started_at, finished_at, status, rows_written, message),
        )


def get_meta(connection: sqlite3.Connection, key: str) -> str | None:
    row = connection.execute('SELECT value FROM app_meta WHERE key = ?', (key,)).fetchone()
    return None if row is None else str(row['value'])


def set_meta(connection: sqlite3.Connection, key: str, value: str) -> None:
    with connection:
        connection.execute(
            '''INSERT INTO app_meta (key, value) VALUES (?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value''',
            (key, value),
        )


def delete_meta(connection: sqlite3.Connection, keys: tuple[str, ...]) -> int:
    """删掉指定的 `app_meta` 键，返回实际删掉的行数。"""
    marks = ','.join('?' * len(keys))
    with connection:
        cursor = connection.execute(f'DELETE FROM app_meta WHERE key IN ({marks})', keys)
    return cursor.rowcount


def mark_fetched(connection: sqlite3.Connection, fetched_at: str,
                 source_ids: list[str]) -> None:
    """记下这次采集，并清掉旧版本遗留的元数据键。

    `last_fetch_at` / `data_sources` 是应用要读的（页脚「最近采集」与来源
    健康度）；`schema_version` 显式重申一遍，应用打开库时会读它，写一次
    是幂等的、也留下痕迹。
    """
    set_meta(connection, 'last_fetch_at', fetched_at)
    set_meta(connection, 'data_sources', ','.join(sorted(set(source_ids))))
    set_meta(connection, 'schema_version', str(REQUIRED_SCHEMA_VERSION))
    delete_meta(connection, LEGACY_META_KEYS)


def observation_count(connection: sqlite3.Connection) -> int:
    return int(connection.execute('SELECT COUNT(*) AS c FROM observation').fetchone()['c'])


def counts_by_indicator(connection: sqlite3.Connection,
                        indicator_ids: list[str]) -> dict[str, int]:
    if not indicator_ids:
        return {}
    marks = ','.join('?' * len(indicator_ids))
    rows = connection.execute(
        f'''SELECT indicator_id, COUNT(*) AS c FROM observation
             WHERE indicator_id IN ({marks}) GROUP BY indicator_id''',
        indicator_ids,
    ).fetchall()
    return {row['indicator_id']: int(row['c']) for row in rows}


def counts_all_indicators(connection: sqlite3.Connection) -> dict[str, int]:
    """库里**实际存在**观测的每个指标各有多少行。

    与 `counts_by_indicator` 的差别是问法相反：那个问「这几个指标各有多少行」，
    这个问「库里都有哪些指标」。清理未认领指标时只能用后者——先要知道有谁。
    """
    rows = connection.execute(
        'SELECT indicator_id, COUNT(*) AS c FROM observation GROUP BY indicator_id'
    ).fetchall()
    return {row['indicator_id']: int(row['c']) for row in rows}


def foreign_log_counts(connection: sqlite3.Connection,
                       keep: list[str]) -> dict[str, int]:
    """`source_id` 不在 `keep` 里的采集日志，按来源分别计数。

    和 `counts_all_indicators` 是同一个问法：不是「这些键有几行」，而是
    「库里都有哪些键」。清理时必须先知道有谁。
    """
    if not keep:
        return {}
    marks = ','.join('?' * len(keep))
    rows = connection.execute(
        f'''SELECT source_id, COUNT(*) AS c FROM fetch_log
             WHERE source_id NOT IN ({marks}) GROUP BY source_id''',
        keep,
    ).fetchall()
    return {str(row['source_id']): int(row['c']) for row in rows}


def delete_foreign_log(connection: sqlite3.Connection, keep: list[str]) -> int:
    """删掉 `source_id` 不在 `keep` 里的采集日志，返回实际删除的行数。"""
    if not keep:
        return 0
    marks = ','.join('?' * len(keep))
    with connection:
        cursor = connection.execute(
            f'DELETE FROM fetch_log WHERE source_id NOT IN ({marks})', keep)
    return cursor.rowcount


def valued_counts(connection: sqlite3.Connection,
                  indicator_ids: list[str]) -> dict[str, int]:
    """只数 `value IS NOT NULL` 的行。

    ★ 用来回答「这里还有没有无来源的值要清」，而不是「这里有没有行」。
    两者的区别在无源指标上很要命：它那 60 行空行是我们上一轮**自己写的**
    （`value=NULL`、`status='missing'`），按行数判断的话每跑一次都会
    「清除 60 行无来源的值」再原样写回 60 行——报告里那句话于是变成
    一句假话，而它恰好是这份报告里最该被信任的一句。
    """
    if not indicator_ids:
        return {}
    marks = ','.join('?' * len(indicator_ids))
    rows = connection.execute(
        f'''SELECT indicator_id, COUNT(*) AS c FROM observation
             WHERE value IS NOT NULL AND indicator_id IN ({marks})
             GROUP BY indicator_id''',
        indicator_ids,
    ).fetchall()
    return {row['indicator_id']: int(row['c']) for row in rows}
