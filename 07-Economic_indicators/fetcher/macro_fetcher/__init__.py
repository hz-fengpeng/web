"""宏观指标真实数据采集器。

把官方/公开数据源的统计值写进 `resources/macro.db`——那份随应用发布的
SQLite 文件。**应用本身仍然不联网**（渲染进程 `connect-src 'none'`，
主进程没有 fetch）：本包是开发期工具，只负责重新生成产物，
不在安装包里、不在启动流程里、不在 IPC 后面。

设计约束见 fetcher/README.md 与 docs/08-真实数据采集.md。
"""

__all__ = ['__version__']

__version__ = '0.1.0'
