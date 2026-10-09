"""`python3 -m macro_fetcher` 的入口。

只做一件事：把 `cli.main` 的返回值变成进程退出码。
逻辑留在 cli.py，好让测试能直接调用 `run()` 而不起子进程。
"""

import sys

from .cli import main

if __name__ == '__main__':
    sys.exit(main())
