"""测试脚手架：造一个结构与真实库一致的空库。

建库直接用应用的 `src/main/db/schema.sql`，**不在这里另抄一份建表语句**。
抄一份的代价是：schema 改了、测试还绿，等到真跑时才发现列名对不上。
"""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from macro_fetcher import db

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_SQL = REPO_ROOT / 'src' / 'main' / 'db' / 'schema.sql'
FIXTURES = Path(__file__).resolve().parent / 'fixtures'


def make_db(path: Path) -> sqlite3.Connection:
    """用应用的 schema 建一个空库，并把 app_meta 填成应用期望的样子。"""
    connection = db.connect(path)
    connection.executescript(SCHEMA_SQL.read_text(encoding='utf-8'))
    db.set_meta(connection, 'schema_version', str(db.REQUIRED_SCHEMA_VERSION))
    return connection


class DbTestCase(unittest.TestCase):
    """带一个临时库的用例基类。每个用例一个新库，互不干扰。"""

    def setUp(self) -> None:
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.path = Path(self._dir.name) / 'macro.db'
        self.db = make_db(self.path)
        self.addCleanup(self.db.close)
