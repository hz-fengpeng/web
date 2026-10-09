# macro_fetcher —— 宏观数据抓取器

把**真实**的宏观统计数据写进 `resources/macro.db` —— 那个文件随项目提交、随安装包发布，
是应用唯一的数据来源。

**它不在应用里运行。** 抓取是开发期的一次性动作：在这台机器上跑、跑完把 `macro.db`
提交进仓库、随安装包发布。应用本身仍然 `connect-src 'none'`、主进程没有任何 `fetch`
（[§9.2](../docs/05-工程化与交付.md)）——**每个用户不会因为装了它就去直连统计局**。
这是原设计的核心约束，本轮没有打破它。

## 怎么跑

```bash
cd fetcher
python3 -m venv .venv
./.venv/bin/pip install -e .          # 唯一的第三方依赖是 akshare

# 先看差异，不落盘
./.venv/bin/python -m macro_fetcher --tier P0 --dry-run
# 确认无误再写
./.venv/bin/python -m macro_fetcher --tier P0
```

`--dry-run` 是真·不落盘：库以只读方式打开（写模式会发 `PRAGMA journal_mode`，
那是会改写文件头的）。落盘前默认把原库备份成 `macro.db.bak-<时间戳>`，
不想留备份就加 `--no-backup`。

| 参数 | 作用 |
|---|---|
| `--tier P0` | 指标层级，逗号分隔；`all` 表示全部已登记指标。默认 `P0` |
| `--only cn.cpi.yoy,…` | 只跑这几个指标。**流水清理按全量源判断**，单指标试跑不会删掉别的源的记录 |
| `--from YYYY-MM` | 起始期间，默认 `2021-09`（库自己的窗口起点，改大只会少抓历史） |
| `--keep-unsourced` | 保留无源指标在库里的旧值。**默认清掉**——见下 |

## 数据从哪来

**全部经 akshare**，登记的三个上游是：

| `fetch_log.source_id` | 上游 | 覆盖 |
|---|---|---|
| `eastmoney` | 东方财富数据中心 | 15 个指标：CPI / PPI / PMI / 社零 / 工业增加值 / GDP / 货币供应 / 贷款 / 海关 / 财政 / 外储 / LPR |
| `nbs` | 国家统计局 | 2 个：城镇调查失业率、GDP 当季同比（走 `macro_china_nbs_nation`） |
| `safe` | 国家外汇管理局 | 1 个：人民币中间价 |

这三个 id **必须**与 `src/main/db/bootstrap.ts` 的 `REAL_SOURCES` 逐字一致，
否则数据管理页会把每个源都显示成「从未采集」（`bootstrap.test.ts` 有测试钉住）。

为什么用 akshare 而不是自己解析、它替我们做了什么、以及**它做不了什么**，
写在 `macro_fetcher/sources/akshare_src.py` 的模块说明里。一句话：上游字段名是易腐的
巧合（东财的 `BASE_SAME` 在 CPI 表里是百分比、在 PPI 表里也是，但含义要靠报表定），
社区在跟这些变动；而**口径仍然是我们自己的判断**，放在 `mapping.py`。

### 抓不到的时候：不绕过

国家统计局对高频访问会返回一个**混淆过的 JS 挑战页**（HTTP 200，内容是
`<noscript>Please enable JavaScript…`）。这**不是**要解决的技术问题——它是站点在
表达「慢一点」。适配器把它翻译成一句能读的话，`cli.py` 让该指标单独失败，其余指标
照常跑完；整轮结束时进程退出码为 1，报告里列出哪几个失败。

**不要去逆向那个挑战页。** 那是对一个政府站点做访问控制规避，不是抓取技巧。
遇到它，等几分钟再跑。

## 覆盖范围：P0 的 23 个里，18 个有源、5 个留空

没有免费数据源的指标**不实现**，但也**不编数**——它们在库里是 `value=NULL`、
`status='missing'` 的真实空行，界面上如实显示「暂无数据」。5 条各自的理由
（上游不发布 / 渠道取不到）写在 `mapping.py` 的 `UNSOURCED` 里，**每条都必须带理由**：
没有理由的空白是「忘了配」，不是「没有源」，`tests/test_mapping.py` 会因此变红。

三步清理（观测、无源指标的旧值、来源不明的流水）的完整说明见
[docs/02-数据层.md](../docs/02-数据层.md) 的 §3.2.7。

留空换来的是一条能站住的不变量：**库里每一条有值的观测都来自一次真实的采集**
（`bootstrap.test.ts` 拿 `fetch_log` 当凭据守着它）。抓取器每次运行都会清掉
「没人认领」的指标——既没有取数规则、也不在 `UNSOURCED` 里的那些。第一次改造时
这类残留有 7911 行（占全库 76%），而 `data_kind` 已经写成 `real`；界面、图表、
CSV 一起对着这批合成值说「真实统计数据」。

## 写入语义

- **绝不 DELETE 观测，除上面那条清理**。逐 `(indicator_id, period)` 比对当前最大
  `revision`：新期间插入 `revision=0 / status='ok'`；值变了插入 `revision=max+1 /
  status='revised'`，**旧行保留**（修订历史是主键的一部分）；值没变跳过。
- **接手一份不是本工具写的库，那一次是「换库」，不是「修订」**。判据取自库自己的
  内容：`fetch_log` 里还有不是本抓取器写的流水，就说明这份库来历不明，此时先清掉
  里面的旧观测，真实值从 `revision 0` 开始。不区分的话会产生一批假的「已修订」——
  界面上读起来像统计局改了数，而实际是我们在换库。第一次落盘实测产生了 2140 行
  这样的「修订」。本工具每次落盘都 `delete_foreign_log`，所以正常重跑走的仍是修订
  （[§14.3](../docs/08-真实数据采集.md)）。
- 1—2 月合并的指标没有单独的 1 月，2 月记 `period='YYYY-02'`、`status='merged'`。
  合并不适用于 CPI / PPI / PMI / 失业率——它们按月单独发布。
- `app_meta` 里 `schema_version` **必须保持 `2`**：它决定应用能不能打开这个库。
  每次落盘由 `mark_fetched()` 重申，**并顺手删掉早期版本留下的 `data_kind` /
  `mock_catalog_version` 两个键**（应用侧已没有任何代码读它们）。这是清掉那两个键的
  唯一途径——不要手工 SQL 改这个文件。
- 落盘后清掉 `-wal` / `-shm`：随包发布的那个文件必须是单个 `macro.db`。

## `catalog.json`：指标目录的镜像

Python 读不了 TS，而指标元数据的事实源是 `src/shared/indicators.ts`——
所以 `catalog.json` 由 Node 生成，**不手写**（[约定](../docs/README.md)：不誊抄代码
已经声明的事实）。改了 `indicators.ts` 就要重新生成：

```bash
npm run catalog:export    # 生成 catalog.json 与 tests/fixtures/period_end.json
npm test                  # 其中一条会断言这两个文件没有过期
```

`tests/fixtures/period_end.json` 是 `src/shared/period.ts` 的期间运算对照表，
由 `tools/export-periods.mjs` 从 TS 侧导出，给 `tests/test_periods.py` 逐条比对——
两端的期间解析必须给出同一个 `period_end`。

## 测试

```bash
npm run test:py     # 112 例，全部离线：fixtures 是录制的 JSON，不碰网络
npm test            # TS 侧，含 catalog.json 的过期检查
```

Python 侧**没有一个用例联网**，这是刻意的：默认测试一旦依赖上游，就会变慢、
会因对端抖动而红，然后就会有人把它标记成 `skip`——从那一刻起它就不再是测试。
解析与换算的输入是录制的样本，放在 `tests/fixtures/`。要验证真接口，
手动跑一次 `--dry-run`，那是人看着的。

## 已经装过旧版本的用户：启动时就直接换掉

应用**每次启动都用内置库覆盖 userData 里那份**（`bootstrap.ts` 的 `restoreUserDb`），
不判断本机那份是什么、也不问它有没有被改过。所以老用户手上那份合成库在第一次启动
新版本时就被盖掉了，不必自己去找「重置数据」。

敢无条件覆盖，是因为**应用从不写 `observation`**：唯一的写入者（给旧库补指标定义的
`catalog.ts`）已随假数据逻辑一起删除，`migrate()` 只写 `schema_version`。userData
里那份文件因此只是内置库的运行期副本，覆盖它不丢任何东西；换来的是一条结构性保证——
界面手上的库与随包发布的那一份一致，不需要靠一个可以被写坏的标记位来判断。
