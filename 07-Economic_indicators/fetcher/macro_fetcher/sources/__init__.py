"""数据源适配器。

每个适配器只做一件事：把某个源的原始响应变成 `SourcePoint` 列表。
**换算、合并、发布日都不在这里**——那些是 mapping / transforms / releases 的事。
适配器里出现业务口径，就说明它在该只做搬运的地方做了判断。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SourcePoint:
    """源给出的一个观测，值已经过 transform，但**还没取整**。

    取整统一在写库前按目录里的 `decimals` 做，只有一处，不会两边不一致。
    """

    indicator_id: str
    period: str
    value: float | None
    #: 'ok' 或 'merged'（1—2 月合并）。其余状态由写入层决定。
    status: str = 'ok'


class SourceError(RuntimeError):
    """源侧不可恢复的问题：报表名写错、目录路径找不到、匹配到多条。

    与「这段时间没数据」严格区分：前者立刻失败，后者是正常结果。
    """


__all__ = ['SourcePoint', 'SourceError']
