"""主流程里那些「会删数据」的判断。

只测不联网的部分：`_plan_unclaimed` 是纯读 + 登记，跑起来不需要任何源。
"""

from __future__ import annotations

import unittest

from macro_fetcher import db
from macro_fetcher.catalog import Indicator, load_catalog
from macro_fetcher.cli import (
    Outcome, Summary, _known_sources, _plan_foreign_log, _plan_sourced, _plan_unclaimed,
    derive_all,
)
from macro_fetcher.mapping import RULES, UNSOURCED

from .support import DbTestCase


def put(connection, indicator_id: str, periods: list[str]) -> None:
    """直接塞观测。这些用例只关心「谁的行走谁的留」，不关心写入语义。"""
    with connection:
        connection.executemany(
            '''INSERT INTO observation
                 (indicator_id, period, period_end, value, status, fetched_at, revision)
               VALUES (?, ?, ?, 1.0, 'ok', '2026-10-08T00:00:00.000Z', 0)''',
            [(indicator_id, p, f'{p}-01') for p in periods],
        )


class PlanUnclaimed(DbTestCase):
    """未纳入采集范围的指标：既无取数规则、也不在 UNSOURCED 里。"""

    #: 三张表里的真实 id，跟着 mapping.py 走，不另抄一份。★ 目录里 109 个指标
    #: 现在**全部**登记过了，所以「没人认领」只能用目录外的 id 来试——
    #: 这本身是好事：真实库里已经没有未认领的指标了。
    sourced = next(iter(RULES))
    unsourced = next(iter(UNSOURCED))
    unclaimed = 'cn.not.a.real.indicator'

    def test_只清没人认领的(self) -> None:
        put(self.db, self.sourced, ['2021-09', '2021-10'])
        put(self.db, self.unsourced, ['2021-09'])
        put(self.db, self.unclaimed, ['2021-09', '2021-10', '2021-11'])

        summary = Summary()
        _plan_unclaimed(self.db, {}, summary)

        # 登记的清理只针对未认领的那个；有源的和登记无源的一行都不能碰
        self.assertEqual(summary.purges, {self.unclaimed: 3})
        # 这里只是登记，真正的删除在落盘分支上——所以此刻数据还在
        self.assertEqual(db.counts_all_indicators(self.db)[self.unclaimed], 3)

    def test_干净库不动手(self) -> None:
        put(self.db, self.sourced, ['2021-09'])
        put(self.db, self.unsourced, ['2021-09'])

        summary = Summary()
        _plan_unclaimed(self.db, {}, summary)

        self.assertEqual(summary.purges, {})
        self.assertEqual(summary.notes, [])

    def test_目录里没有的_id_要单独点名(self) -> None:
        """库被外部改过时，清掉是对的，但不能一声不吭。"""
        put(self.db, 'cn.not.in.catalog', ['2021-09'])

        summary = Summary()
        _plan_unclaimed(self.db, {}, summary)

        self.assertEqual(summary.purges, {'cn.not.in.catalog': 1})
        self.assertTrue(any('不在指标目录里' in n for n in summary.notes))

    def test_目录里有的不点名(self) -> None:
        from macro_fetcher.catalog import Indicator

        put(self.db, self.unclaimed, ['2021-09'])
        listed = Indicator(
            id=self.unclaimed, name_zh='目录里的指标', name_short='目录里的指标',
            category='growth', unit='%', frequency='month', value_type='index',
            seasonal_adj=False, decimals=1, is_headline=False, tier='P2', note=None,
        )

        summary = Summary()
        _plan_unclaimed(self.db, {listed.id: listed}, summary)

        self.assertFalse(any('不在指标目录里' in n for n in summary.notes))


class PlanForeignLog(DbTestCase):
    """`fetch_log` 里不是本抓取器写的流水。

    真实场景就是一份合成时代的旧库：里面还留着 `source_id='mock'` 的那两条
    流水（535 行和 10465 行）。它们记录的是另一个库的历史——内置文件被整份
    换掉之后，那两次「写入」在这个文件里没有留下任何对应的行。
    """

    def log(self, source_id: str, message: str = '') -> None:
        db.log_fetch(self.db, source_id, '2026-01-01T00:00:00.000Z',
                     '2026-01-01T00:00:01.000Z', 'ok', 1, message)

    def test_登记并清掉外来源的流水(self) -> None:
        self.log('mock', '内置示例数据文件 · 非真实统计数据')
        self.log('mock', '内置 P0/P1/P2 指标示例数据文件')

        summary = Summary()
        _plan_foreign_log(self.db, summary)

        self.assertTrue(any('清除 2 条来源不在采集范围内的流水' in n
                            for n in summary.notes))
        # 只登记，不删——真正的删除在落盘分支上，`--dry-run` 因此能如实预告
        self.assertEqual(db.foreign_log_counts(self.db, _known_sources()), {'mock': 2})

    def test_不碰本次没跑到的源(self) -> None:
        """`--only` 只跑一个指标时，其余源的流水仍然合法。

        按「本次跑到的源」来判的话，一次单指标试跑就会把整份采集记录删掉，
        而且报告里写的是「清除 2 条」——看起来还挺合理。
        """
        for source in _known_sources():
            self.log(source)

        summary = Summary()
        _plan_foreign_log(self.db, summary)

        self.assertEqual(summary.notes, [])
        self.assertEqual(db.foreign_log_counts(self.db, _known_sources()), {})

    def test_干净库不动手(self) -> None:
        summary = Summary()
        _plan_foreign_log(self.db, summary)
        self.assertEqual(summary.notes, [])


class CatalogIsCovered(unittest.TestCase):
    """`_plan_unclaimed` 的判据是 RULES ∪ UNSOURCED ∪ DERIVED，那三张表必须自洽。"""

    def test_两张表不重叠(self) -> None:
        self.assertEqual(set(RULES) & set(UNSOURCED), set(),
                         '同一个指标不能既说有源又说无源')


class DerivedOutcomes(unittest.TestCase):
    """计算指标：由**输入指标的观测**算出来，不写半成品。

    `derive_all` 不联网、也不碰库——它拿的是这一轮已经抓到的观测。
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()
        cls.target = cls.catalog['cn.bond.cn_us_spread']

    def outcome(self, indicator_id: str, values: dict[str, float | None]) -> Outcome:
        return Outcome(self.catalog[indicator_id], [
            db.Observation(indicator_id, period, value, 'ok', period)
            for period, value in values.items()])

    def test_computes_the_spread_in_basis_points(self) -> None:
        derived = derive_all([self.target], [
            self.outcome('cn.bond.gov_10y', {'2026-10-09': 1.6864}),
            self.outcome('us.bond.gov_10y', {'2026-10-09': 5.24}),
        ])
        self.assertEqual(len(derived), 1)
        self.assertTrue(derived[0].ok, derived[0].error)
        row = derived[0].observations[0]
        self.assertEqual(row.period, '2026-10-09')
        # (1.6864 − 5.24) × 100 = −355.36 → 按目录精度取一位 = −355.4
        self.assertAlmostEqual(row.value, -355.4, places=6)
        self.assertEqual(row.status, 'ok')

    def test_only_periods_both_inputs_have(self) -> None:
        """两地交易日不同：只在两边都有报价的日子算，不补、不外推。"""
        derived = derive_all([self.target], [
            self.outcome('cn.bond.gov_10y', {'2026-10-08': 1.6899, '2026-10-09': 1.6864}),
            self.outcome('us.bond.gov_10y', {'2026-10-09': 5.24, '2026-10-10': 5.30}),
        ])
        self.assertEqual([o.period for o in derived[0].observations], ['2026-10-09'])

    def test_a_period_missing_a_value_is_skipped(self) -> None:
        derived = derive_all([self.target], [
            self.outcome('cn.bond.gov_10y', {'2026-10-07': None, '2026-10-09': 1.6864}),
            self.outcome('us.bond.gov_10y', {'2026-10-07': 4.77, '2026-10-09': 5.24}),
        ])
        rows = derived[0].observations
        self.assertEqual([o.period for o in rows], ['2026-10-09'])
        self.assertTrue(all(o.value is not None for o in rows))

    def test_missing_input_is_an_error_not_half_a_number(self) -> None:
        derived = derive_all([self.target], [
            self.outcome('cn.bond.gov_10y', {'2026-10-09': 1.6864}),
        ])
        self.assertFalse(derived[0].ok)
        self.assertIn('us.bond.gov_10y', derived[0].error)
        self.assertEqual(derived[0].observations, [])

    def test_inputs_without_overlap_is_an_error(self) -> None:
        """输入都在、期间却对不上：报出来，不静默变成「没有数据」。"""
        derived = derive_all([self.target], [
            self.outcome('cn.bond.gov_10y', {'2026-10-09': 1.6864}),
            self.outcome('us.bond.gov_10y', {'2026-10-10': 5.24}),
        ])
        self.assertFalse(derived[0].ok)
        self.assertIn('一期都没算出来', derived[0].error)

    def test_indicators_without_a_derived_rule_are_ignored(self) -> None:
        derived = derive_all([self.catalog['cn.bond.gov_10y']], [])
        self.assertEqual(derived, [])


class RebaseOnForeignLog(DbTestCase):
    """接手一份**不是本工具写的**库时，那一次是换库，不是修订。

    判据取自库自己的内容——`fetch_log` 里还有别人写的流水——不是一个
    `app_meta` 标记位：标记位会被忘记设、也会被手工改成任何值，而流水是
    这个工具实际做过的事的痕迹。本工具每次落盘都会 `delete_foreign_log`，
    所以正常重跑时它为空、走的仍是修订。
    """

    indicator_id = 'cn.cpi.yoy'

    def indicator(self):
        from macro_fetcher.catalog import Indicator
        return Indicator(
            id=self.indicator_id, name_zh='居民消费价格指数', name_short='CPI',
            category='price', unit='%', frequency='month', value_type='yoy',
            seasonal_adj=False, decimals=1, is_headline=True, tier='P0', note=None,
        )

    def setup_library(self) -> None:
        """一份带着旧值、且留着一条外来流水的库。"""
        put(self.db, self.indicator_id, ['2021-09'])
        db.log_fetch(self.db, 'mock', '2020-01-01T00:00:00.000Z',
                     '2020-01-01T00:00:01.000Z', 'ok', 10465,
                     '内置示例数据文件 · 非真实统计数据')

    def outcome(self) -> Outcome:
        return Outcome(self.indicator(),
                       [db.Observation(self.indicator_id, '2021-09', 0.7)])

    def test_判据认得出这份库不是我们的(self) -> None:
        self.setup_library()
        self.assertTrue(bool(db.foreign_log_counts(self.db, _known_sources())))

    def test_换库时新值是_revision_0_而不是修订(self) -> None:
        self.setup_library()
        rebase = bool(db.foreign_log_counts(self.db, _known_sources()))

        summary = Summary()
        plan = _plan_sourced(self.db, [self.outcome()], [self.indicator_id],
                             summary, rebase=rebase)

        # 旧行马上就要被清掉，所以新值是 revision 0 的「新增」。
        # 判成修订的话（下面那条反例），界面上会满屏「已修订」——
        # 那是在说统计局改了数，而实际是我们在换掉一份旧库。
        self.assertEqual([(w.revision, w.reason) for w in plan], [(0, 'new')])
        self.assertEqual(plan[0].status, 'ok')

    def test_反例_同一份库不按换库处理就写出假修订(self) -> None:
        # 这个测试断言的是**一个错误判断的后果**，故意的。它让上面那条
        # 断言不是空的：省掉 rebase 判据，这里就会出现 revision=1 /
        # status='revised'，而库里那条旧值还留着，看起来像「上一版的真实统计」。
        self.setup_library()

        summary = Summary()
        plan = _plan_sourced(self.db, [self.outcome()], [self.indicator_id], summary)

        # revision 1 + 落库 status='revised'：界面上这一期就读成「已修订」
        self.assertEqual([(w.revision, w.reason) for w in plan], [(1, 'revised')])
        self.assertEqual(plan[0].status, 'revised')

    def test_清掉外来流水之后就不是换库了(self) -> None:
        self.setup_library()
        db.delete_foreign_log(self.db, _known_sources())
        self.assertFalse(bool(db.foreign_log_counts(self.db, _known_sources())))
