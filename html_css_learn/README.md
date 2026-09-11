# HTML 与 CSS 学习指南

这个目录用于从零学习网页的结构与样式。所有示例都使用浏览器原生支持的 HTML 和 CSS，不需要安装依赖。

## 先建立两个概念

- **HTML 决定内容和结构**：标题、段落、图片、表单分别是什么。
- **CSS 决定外观和布局**：颜色、间距、对齐方式以及不同屏幕下如何排列。

可以把网页想成一间房子：HTML 是房间和门窗的结构，CSS 是尺寸、位置和装修。JavaScript 则负责开关、交互和状态变化。

## 推荐学习顺序

1. [01-HTML基础.md](./01-HTML基础.md)：文档结构、常用标签、语义化、表单和可访问性；配有[基础网页示例](./examples/html-basics/index.html)。
2. [02-CSS基础.md](./02-CSS基础.md)：选择器、盒模型、Flexbox、Grid、定位和响应式设计。
3. [03-练习.md](./03-练习.md)：从修改现有页面到独立完成一个响应式页面。
4. [examples/profile-card/index.html](./examples/profile-card/index.html)：综合示例，边看页面边对照源码。

## 如何运行示例

直接用浏览器打开任意示例目录中的 `index.html` 即可。也可以在当前目录启动一个静态服务器：

```bash
cd html_css_learn
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/examples/profile-card/`。

## 建议的学习方式

每学习一个概念，都完成一次“修改并观察”：

1. 打开浏览器开发者工具（通常是 `F12` 或 `Option + Command + I`）。
2. 在 Elements 面板找到一个元素，观察它的标签、class 和盒模型。
3. 修改对应的 HTML 或 CSS，刷新页面观察结果。
4. 先预测结果，再动手验证。不要只阅读代码。

## 学完后的自测标准

- 能从空文件写出完整的 HTML 文档。
- 能根据内容选择语义化标签，而不是全部使用 `div`。
- 能解释 margin、border、padding 和 content 的关系。
- 能用 Flexbox 完成一维排列，用 Grid 完成二维布局。
- 能让页面在手机和桌面宽度下都易读、无横向滚动。
- 能用浏览器开发者工具定位“样式为什么没有生效”。
