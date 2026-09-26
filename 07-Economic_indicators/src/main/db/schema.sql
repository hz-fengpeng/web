-- 中国宏观经济数据看板 · 数据库 schema
--
-- ★ 本文件是 v1 基线，已冻结。除修正笔误外不要再改这里。
--
-- 它只负责把「空库」建成 v1。此后所有变更（加表 / 加列 / 加索引）
-- 一律追加到 db/migrate.ts 的 migrations 数组，由 migrate() 按版本补跑。
--
-- 为什么不能直接改：已装机的库里已经有数据，改本文件不会作用于它们，
-- 新旧库 schema 就此分叉，且没有任何地方会报错。

CREATE TABLE IF NOT EXISTS observation (
  indicator_id  TEXT    NOT NULL,
  period        TEXT    NOT NULL,
  period_end    TEXT    NOT NULL,
  value         REAL,
  status        TEXT    NOT NULL DEFAULT 'ok',   -- ok | prelim | revised | missing | merged
  released_at   TEXT,
  fetched_at    TEXT    NOT NULL,
  revision      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (indicator_id, period, revision)
);

CREATE INDEX IF NOT EXISTS idx_obs_lookup
  ON observation(indicator_id, period_end DESC);

-- 采集日志：驱动数据管理页的源健康度展示
CREATE TABLE IF NOT EXISTS fetch_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     TEXT    NOT NULL,
  indicator_id  TEXT,
  started_at    TEXT    NOT NULL,
  finished_at   TEXT,
  status        TEXT    NOT NULL,                -- ok | partial | fail
  rows_written  INTEGER,
  message       TEXT
);

CREATE INDEX IF NOT EXISTS idx_fetch_log_recent
  ON fetch_log(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
