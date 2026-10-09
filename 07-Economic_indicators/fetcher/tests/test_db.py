"""写入语义：修订只追加、缺失不覆盖、幂等。

这一层是抓取器里唯一会破坏数据的部分，所以用例写得比实现还长。
"""

from __future__ import annotations

import sqlite3
import unittest

from macro_fetcher import db
from macro_fetcher.catalog import Indicator

from .support import DbTestCase, make_db

CPI = Indicator(
    id='cn.cpi.yoy', name_zh='居民消费价格指数', name_short='CPI 同比',
    category='price', unit='%', frequency='month', value_type='yoy',
    seasonal_adj=False, decimals=1, is_headline=True, tier='P0', note=None,
)


def obs(period: str, value: float | None, status: str = 'ok') -> db.Observation:
    return db.Observation(CPI.id, period, value, status, released_at='2026-09-09')


def write(connection: sqlite3.Connection, observations: list[db.Observation]) -> int:
    """走一遍「读现状 → 算计划 → 落盘」，与真实运行时同一条路径。"""
    existing = db.current_revisions(connection, [CPI.id])
    return db.apply(connection, db.plan(CPI, observations, existing), '2026-10-08T00:00:00.000Z')


def rows(connection: sqlite3.Connection, period: str) -> list[sqlite3.Row]:
    return connection.execute(
        'SELECT * FROM observation WHERE indicator_id = ? AND period = ? ORDER BY revision',
        (CPI.id, period),
    ).fetchall()


class RevisionSemantics(DbTestCase):
    def test_new_period_gets_revision_zero(self) -> None:
        self.assertEqual(write(self.db, [obs('2026-08', 0.4)]), 1)
        stored = rows(self.db, '2026-08')
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0]['revision'], 0)
        self.assertEqual(stored[0]['status'], 'ok')
        self.assertEqual(stored[0]['period_end'], '2026-08-31')

    def test_unchanged_value_is_not_rewritten(self) -> None:
        write(self.db, [obs('2026-08', 0.4)])
        self.assertEqual(write(self.db, [obs('2026-08', 0.4)]), 0)
        self.assertEqual(len(rows(self.db, '2026-08')), 1)

    def test_revision_is_appended_and_old_row_kept(self) -> None:
        write(self.db, [obs('2026-08', 0.4)])
        self.assertEqual(write(self.db, [obs('2026-08', 0.5)]), 1)
        stored = rows(self.db, '2026-08')
        self.assertEqual([r['revision'] for r in stored], [0, 1])
        # 旧修订必须留着。GDP 有初步核算/初步核实/最终核实三次发布，
        # 抹掉旧值不会有任何症状，只是历史悄悄没了。
        self.assertEqual(stored[0]['value'], 0.4)
        self.assertEqual(stored[1]['value'], 0.5)
        self.assertEqual(stored[1]['status'], 'revised')

    def test_status_change_alone_is_recorded(self) -> None:
        """状态变了也要留痕，但值没动就不能说「已修订」。"""
        write(self.db, [obs('2026-08', 0.4, 'prelim')])
        self.assertEqual(write(self.db, [obs('2026-08', 0.4, 'ok')]), 1)
        stored = rows(self.db, '2026-08')
        self.assertEqual(len(stored), 2)
        self.assertEqual(stored[0]['status'], 'prelim')  # 旧行留着，链没断
        self.assertEqual(stored[1]['status'], 'ok')

    def test_missing_then_filled_counts_as_revision(self) -> None:
        write(self.db, [obs('2026-08', None, 'missing')])
        write(self.db, [obs('2026-08', 0.4)])
        stored = rows(self.db, '2026-08')
        self.assertEqual([r['value'] for r in stored], [None, 0.4])
        # 补上缺口不是「修订」：之前根本没有值可修
        self.assertEqual(stored[1]['status'], 'ok')

    def test_period_semantics_survive_a_value_revision(self) -> None:
        """`merged` / `prelim` 说的是期间口径，不能被「已修订」盖掉。

        盖掉的后果不是报错，是界面上「1—2月合并」变成「已修订」——
        1 月为什么不存在，从此在界面上看不出来。
        """
        write(self.db, [obs('2026-02', 5.4, 'merged')])
        write(self.db, [obs('2026-02', 5.6, 'merged')])
        self.assertEqual([r['status'] for r in rows(self.db, '2026-02')], ['merged', 'merged'])

        write(self.db, [obs('2026Q2', 4.8, 'prelim')])
        write(self.db, [obs('2026Q2', 4.9, 'prelim')])
        self.assertEqual([r['status'] for r in rows(self.db, '2026Q2')], ['prelim', 'prelim'])

    def test_merged_jan_feb_is_a_normal_row(self) -> None:
        # 1—2 月合并记到 2 月，落在库里就是一个普通的月度期间
        self.assertEqual(write(self.db, [obs('2026-02', 5.4, 'merged')]), 1)
        stored = rows(self.db, '2026-02')
        self.assertEqual(stored[0]['status'], 'merged')
        self.assertEqual(stored[0]['period_end'], '2026-02-28')

    def test_unknown_status_rejected(self) -> None:
        with self.assertRaises(ValueError):
            db.plan(CPI, [obs('2026-08', 0.4, '大概没问题')], {})

    def test_comparison_uses_indicator_precision(self) -> None:
        # 浮动误差不该造出假修订：0.1 与 0.1 + 1e-17 是同一个数。
        write(self.db, [obs('2026-08', 0.1)])
        self.assertEqual(write(self.db, [obs('2026-08', 0.1 + 1e-17)]), 0)
        # 但精度内的真实变化要认出来
        self.assertEqual(write(self.db, [obs('2026-08', 0.2)]), 1)


class MissingNeverOverwrites(DbTestCase):
    def test_absent_period_does_not_erase_existing_value(self) -> None:
        """源这一轮取不到某期，不等于那期的数不存在。

        抓取器只把**这次拿到的**期间交给 plan；拿不到的期间根本不会出现在
        输入里。用例钉住这一点：已入库的值不受影响。
        """
        write(self.db, [obs('2026-07', 0.5), obs('2026-08', 0.4)])
        write(self.db, [obs('2026-08', 0.4)])  # 这次只取到 8 月
        self.assertEqual(len(rows(self.db, '2026-07')), 1)
        self.assertEqual(rows(self.db, '2026-07')[0]['value'], 0.5)


class Idempotence(DbTestCase):
    def test_second_run_writes_nothing(self) -> None:
        batch = [obs('2026-06', 0.2), obs('2026-07', 0.5), obs('2026-08', 0.4)]
        self.assertEqual(write(self.db, batch), 3)
        self.assertEqual(write(self.db, batch), 0)
        self.assertEqual(db.observation_count(self.db), 3)


class SchemaGuard(DbTestCase):
    def test_missing_schema_version_is_refused(self) -> None:
        with self.db:
            self.db.execute("DELETE FROM app_meta WHERE key = 'schema_version'")
        with self.assertRaises(RuntimeError) as ctx:
            db.check_schema(self.db)
        self.assertIn('schema_version', str(ctx.exception))

    def test_wrong_schema_version_is_refused(self) -> None:
        # 应用只认 2。写坏一个版本号，应用下次启动会直接拒绝打开——
        # 宁可在这里失败。
        db.set_meta(self.db, 'schema_version', '3')
        with self.assertRaises(RuntimeError):
            db.check_schema(self.db)

    def test_valid_schema_passes(self) -> None:
        db.check_schema(self.db)


class MetaAndLog(DbTestCase):
    def test_mark_fetched_records_run_and_drops_legacy_keys(self) -> None:
        # 老库会带着这两个键（早期版本「这份库是真是假」那套判断留下的）。
        # 现在没有任何代码读它们，落盘时顺手删掉——这是清掉它们的唯一途径。
        db.set_meta(self.db, 'data_kind', 'real')
        db.set_meta(self.db, 'mock_catalog_version', '2')
        db.set_meta(self.db, 'last_fetch_at', '2020-01-01T00:00:00.000Z')

        db.mark_fetched(self.db, '2026-10-08T00:00:00.000Z', ['eastmoney', 'nbs', 'eastmoney'])

        self.assertEqual(db.get_meta(self.db, 'last_fetch_at'), '2026-10-08T00:00:00.000Z')
        self.assertEqual(db.get_meta(self.db, 'data_sources'), 'eastmoney,nbs')
        # 应用打开库时读它，写坏一个版本号应用下次启动会直接拒绝打开，宁可在这里失败
        self.assertEqual(db.get_meta(self.db, 'schema_version'), '2')
        for key in db.LEGACY_META_KEYS:
            self.assertIsNone(db.get_meta(self.db, key), f'{key} 没被清掉')

    def test_delete_meta_returns_rows_removed(self) -> None:
        db.set_meta(self.db, 'a', '1')
        self.assertEqual(db.delete_meta(self.db, ('a', 'b')), 1)
        self.assertEqual(db.delete_meta(self.db, ('a', 'b')), 0)

    def test_fetch_log_roundtrip(self) -> None:
        db.log_fetch(self.db, 'eastmoney', '2026-10-08T00:00:00.000Z',
                     '2026-10-08T00:01:00.000Z', 'ok', 42, 'CPI/PPI/PMI 正常')
        row = self.db.execute('SELECT * FROM fetch_log').fetchone()
        self.assertEqual(row['source_id'], 'eastmoney')
        self.assertEqual(row['rows_written'], 42)
        self.assertIsNone(row['indicator_id'])

    def test_fetch_log_rejects_unknown_status(self) -> None:
        with self.assertRaises(ValueError):
            db.log_fetch(self.db, 'nbs', 'a', 'b', '成功', 0, '')


class DeleteIndicator(DbTestCase):
    def test_delete_removes_all_revisions(self) -> None:
        write(self.db, [obs('2026-07', 0.5), obs('2026-08', 0.4)])
        write(self.db, [obs('2026-08', 0.5)])
        self.assertEqual(len(rows(self.db, '2026-08')), 2)
        self.assertEqual(db.delete_indicator(self.db, CPI.id), 3)
        self.assertEqual(db.observation_count(self.db), 0)


class CurrentRevisions(DbTestCase):
    def test_picks_max_revision_per_period(self) -> None:
        write(self.db, [obs('2026-07', 0.5)])
        write(self.db, [obs('2026-07', 0.6)])
        current = db.current_revisions(self.db, [CPI.id])
        self.assertEqual(len(current), 1)
        self.assertEqual(current[(CPI.id, '2026-07')]['value'], 0.6)
        self.assertEqual(current[(CPI.id, '2026-07')]['revision'], 1)

    def test_empty_input_short_circuits(self) -> None:
        self.assertEqual(db.current_revisions(self.db, []), {})


class Sidecars(DbTestCase):
    def test_clear_sidecars_removes_only_sidecars(self) -> None:
        wal = self.path.with_name(self.path.name + '-wal')
        shm = self.path.with_name(self.path.name + '-shm')
        wal.write_bytes(b'')
        shm.write_bytes(b'x' * 32)
        removed = db.clear_sidecars(self.path)
        self.assertEqual(sorted(removed), ['macro.db-shm', 'macro.db-wal'])
        self.assertFalse(wal.exists())
        self.assertFalse(shm.exists())
        # 主库必须还在——发布的是它，误删就白抓了
        self.assertTrue(self.path.exists())
        self.assertEqual(db.clear_sidecars(self.path), [])


class JournalMode(DbTestCase):
    def test_connection_is_delete_journaled(self) -> None:
        # ★ 内置库随安装包发布，-wal/-shm 不会跟着走。
        # 留一个 WAL 模式的主库 = 发布一份不完整的数据文件。
        mode = self.db.execute('PRAGMA journal_mode').fetchone()[0]
        self.assertEqual(str(mode).lower(), 'delete')

    def test_writes_survive_close_without_sidecars(self) -> None:
        write(self.db, [obs('2026-08', 0.4)])
        self.db.close()
        reopened = make_db(self.path)
        self.addCleanup(reopened.close)
        self.assertEqual(db.observation_count(reopened), 1)
        self.assertFalse(self.path.with_name(self.path.name + '-wal').exists())


class UnclaimedCounts(DbTestCase):
    """`counts_all_indicators`：清理未认领指标前要先知道库里都有谁。"""

    def test_lists_every_indicator_present(self) -> None:
        db.apply(self.db, db.plan(CPI, [obs('2021-09', 0.7), obs('2021-10', 1.5)],
                                  db.current_revisions(self.db, [CPI.id])),
                 '2026-10-08T00:00:00.000Z')
        other = Indicator(
            id='cn.keqiang.growth', name_zh='克强指数', name_short='克强指数',
            category='growth', unit='%', frequency='month', value_type='index',
            seasonal_adj=False, decimals=1, is_headline=False, tier='P2', note=None,
        )
        db.apply(self.db, db.plan(other, [db.Observation(other.id, '2021-09', 8.4, 'ok')],
                                  db.current_revisions(self.db, [other.id])),
                 '2026-10-08T00:00:00.000Z')

        self.assertEqual(db.counts_all_indicators(self.db),
                         {CPI.id: 2, other.id: 1})
        # 问法相反的那个仍然只回答被问到的指标，两者不能互相顶替
        self.assertEqual(db.counts_by_indicator(self.db, [CPI.id]), {CPI.id: 2})

    def test_empty_db(self) -> None:
        self.assertEqual(db.counts_all_indicators(self.db), {})


class ValuedCounts(DbTestCase):
    """`valued_counts`：只数有值的行，用来判断「还有没有合成值要清」。"""

    def test_空行不算数(self) -> None:
        write(self.db, [obs('2021-09', None, 'missing'), obs('2021-10', None, 'missing')])
        self.assertEqual(db.valued_counts(self.db, [CPI.id]), {})
        self.assertEqual(db.counts_by_indicator(self.db, [CPI.id]), {CPI.id: 2})

    def test_有值才计数(self) -> None:
        write(self.db, [obs('2021-09', 0.7), obs('2021-10', None, 'missing')])
        self.assertEqual(db.valued_counts(self.db, [CPI.id]), {CPI.id: 1})
