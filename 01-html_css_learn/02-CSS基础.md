# 02 CSS 基础、布局与响应式

CSS（Cascading Style Sheets）通过规则选择 HTML 元素，并为它们设置样式。本章先介绍 CSS 的基本规则，再学习如何组织页面布局并适配不同屏幕。

## 引入 CSS

推荐把样式放在独立文件中：

```html
<link rel="stylesheet" href="styles.css">
```

```css
/* styles.css */
body {
  color: #202124;
  background-color: #f7f8fa;
}
```

一条 CSS 规则由选择器和声明块组成。每条声明包含属性和值，并以分号结束。

## 常用选择器

```css
/* 元素选择器：选中所有 p */
p { color: #374151; }

/* 类选择器：可在页面中重复使用 */
.card { border: 1px solid #d1d5db; }

/* id 选择器：匹配唯一元素 */
#page-title { font-size: 2rem; }

/* 后代选择器 */
.card p { line-height: 1.7; }

/* 直接子元素 */
.menu > li { list-style: none; }

/* 属性选择器 */
input[type="email"] { border-color: #2563eb; }

/* 状态伪类 */
a:hover { color: #b42318; }
input:focus-visible { outline: 3px solid #93c5fd; }
```

实际项目优先使用 class。元素选择器适合设置全局基础样式，id 通常留给锚点、表单关联或 JavaScript 定位。

## 层叠、优先级和继承

“Cascading” 意为层叠：多条规则命中同一元素时，浏览器需要决定使用哪一条。

大致优先级为：内联样式 > `#id` > `.class` / 属性 / 伪类 > 元素。优先级相同时，后写的规则覆盖先写的规则。

```css
p { color: gray; }
.notice { color: blue; }
.notice { color: green; } /* 最终是绿色 */
```

`color`、`font-family` 等属性通常会被子元素继承；`margin`、`border` 等通常不会。不要依赖大量 `!important`，它会让覆盖关系难以维护。

## 盒模型

每个元素都可以看成一个盒子，从内到外依次是：

```text
margin（外边距）
  border（边框）
    padding（内边距）
      content（内容）
```

建议全局使用更直观的尺寸计算方式：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

.card {
  width: 320px;
  padding: 24px;
  border: 1px solid #d1d5db;
  margin: 16px;
}
```

在 `border-box` 下，声明的 `width: 320px` 已包含左右 padding 和 border。

### margin 与 padding 如何选择

- `padding` 是组件内部，背景色会覆盖该区域。
- `margin` 是组件外部，用于与周围元素保持距离。
- 一组由 Flexbox 或 Grid 排列的元素，优先在父元素上使用 `gap`。

## 尺寸单位

| 单位 | 含义 | 常见用途 |
|---|---|---|
| `px` | CSS 像素 | 边框、图标、精确的小尺寸 |
| `%` | 相对父元素 | 流式宽度 |
| `rem` | 相对根元素字号 | 字号、间距 |
| `em` | 相对当前元素字号 | 与组件字号一起缩放的尺寸 |
| `vw` / `vh` | 视口宽度/高度的 1% | 特殊的视口尺寸场景 |
| `ch` | “0”字符的近似宽度 | 限制文本行宽 |

```css
.article {
  width: min(100% - 2rem, 70ch);
  margin-inline: auto;
}
```

这段代码让文章最大约 70 个字符宽，小屏幕上仍保留左右边距。

## 颜色与文字

```css
:root {
  --color-text: #1f2937;
  --color-muted: #667085;
  --color-accent: #146c43;
  --space-md: 1rem;
}

body {
  color: var(--color-text);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}

.subtitle {
  color: var(--color-muted);
  font-weight: 500;
}
```

CSS 自定义属性用 `--名称` 声明，通过 `var()` 使用。重复使用的颜色和间距集中声明后更容易维护。

正文需要足够的前景/背景对比度；浅灰色小字号文字通常很难阅读。

## display 与普通文档流

```css
.block { display: block; }
.inline { display: inline; }
.inline-box { display: inline-block; }
.hidden { display: none; }
```

- 块级盒子通常占据一整行，可以设置宽高。
- 行内盒子跟随文字排列，宽高通常由内容决定。
- `inline-block` 跟随文字排列，但可以设置宽高。
- `display: none` 会把元素从布局和可访问树中移除。

## 基础重置

下面是一组适合练习项目的温和基础样式：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

img,
svg {
  display: block;
  max-width: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

## 调试样式

样式没生效时按以下顺序检查：

1. CSS 文件是否成功加载，`href` 路径是否正确。
2. 选择器是否真的匹配元素，class 是否拼错。
3. 属性值是否有效，声明是否被浏览器划掉。
4. 是否被优先级更高或位置更靠后的规则覆盖。
5. 在开发者工具的 Computed 面板查看最终值来自哪条规则。

## 布局基础

先让内容在普通文档流中自然排列，再选择布局工具。Flexbox 适合一个方向的排列，Grid 适合行列同时存在的二维布局。

### Flexbox

```html
<nav class="nav">
  <a href="/">首页</a>
  <a href="/articles">文章</a>
  <a href="/about">关于</a>
</nav>
```

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
```

- `flex-direction`：主轴方向，默认是 `row`。
- `justify-content`：沿主轴排列。
- `align-items`：沿交叉轴对齐。
- `gap`：子元素之间的间距。
- `flex-wrap: wrap`：空间不足时允许换行。

常见的左侧固定、右侧填满：

```css
.profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile__avatar {
  flex: 0 0 4rem;
}

.profile__content {
  flex: 1;
  min-width: 0;
}
```

`min-width: 0` 允许内容区域在空间不足时收缩，长文本才不会把布局撑破。

### Grid

```css
.card-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}
```

自适应列数的常用写法：

```css
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 1.25rem;
}
```

- `fr` 表示网格容器中的剩余空间份数。
- `minmax()` 给列设置最小和最大尺寸。
- `auto-fit` 根据可用宽度自动决定列数。

### 定位

```css
.card {
  position: relative;
}

.card__badge {
  position: absolute;
  inset-block-start: 0.75rem;
  inset-inline-end: 0.75rem;
}
```

| 值 | 行为 |
|---|---|
| `static` | 默认值，处于普通文档流 |
| `relative` | 保留原位置，并成为绝对定位子元素的参照 |
| `absolute` | 脱离普通文档流，相对最近的定位祖先定位 |
| `fixed` | 相对视口固定 |
| `sticky` | 在指定滚动范围内吸附 |

不要用大量绝对定位搭建整个页面。它脱离普通文档流，内容变化和小屏幕下很容易重叠。

## 响应式设计

响应式设计（Responsive Design）是指：**同一个网页能够根据屏幕宽度和可用空间自动调整布局与显示方式**。

例如，同一个文章列表可以这样变化：

```text
电脑宽屏：  [文章 1] [文章 2] [文章 3]

平板屏幕：  [文章 1] [文章 2]
            [文章 3]

手机窄屏：  [文章 1]
            [文章 2]
            [文章 3]
```

这不是为手机、平板和电脑分别制作三个网页，而是让同一份 HTML 通过 CSS 适应不同空间。

- **布局**：决定元素如何排列。
- **响应式布局**：决定元素如何根据可用空间改变排列。
- **响应式网页**：同一个网页在手机、平板和电脑上都能正常阅读和操作。

### 设置移动端视口

响应式页面通常需要在 HTML 的 `head` 中加入：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

它让移动浏览器按照设备的实际宽度显示网页。缺少这项设置时，移动浏览器可能先按照一个较宽的虚拟页面渲染，再把整个页面缩小。

### 使用媒体查询改变布局

媒体查询可以在满足某个条件时应用一组 CSS。下面采用“移动端优先”的方式：默认先写手机样式，再逐步增强较宽屏幕的布局。

```css
/* 默认样式：手机上一列 */
.card-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* 可用宽度达到 48rem 后变成两列 */
@media (min-width: 48rem) {
  .card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 可用宽度达到 64rem 后变成三列 */
@media (min-width: 64rem) {
  .card-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

`48rem` 和 `64rem` 是这个示例的断点。断点应该根据内容何时放不下或出现过多空白来选择，而不是机械地对应某款设备。

### 不只改变列数

响应式设计还经常处理：

- 导航栏空间不足时换行或改变排列方向。
- 表单在宽屏上并排，在窄屏上改为单列。
- 图片不超过所在容器，并保持正确比例。
- 调整页面的内容宽度和左右留白。
- 防止长文字、代码和表格撑破屏幕。

### 组合流式尺寸与媒体查询

并非所有尺寸变化都需要媒体查询。下面的 `.page` 会在小屏幕保留左右间距，并在宽屏限制最大宽度；只有内容需要变成两栏时才使用媒体查询：

```css
.page {
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

.content {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 48rem) {
  .content {
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  }
}
```

这种“移动端优先”的方式先保证窄屏可用，再为更大的空间增加列布局。

## 防止内容溢出

```css
.title {
  overflow-wrap: anywhere;
}

.table-wrapper {
  overflow-x: auto;
}

.media {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
```

还应注意：

- Flex/Grid 子项遇到长内容时常需要 `min-width: 0`。
- 固定宽度应搭配 `max-width: 100%`，或优先使用流式宽度。
- 表格确实无法压缩时，在它的容器上启用横向滚动。

## 状态与动效

交互元素要有清晰的 hover、focus 和 disabled 状态：

```css
.button {
  transition: background-color 160ms ease, transform 160ms ease;
}

.button:hover {
  background-color: #0f5132;
}

.button:focus-visible {
  outline: 3px solid #86efac;
  outline-offset: 3px;
}

.button:active {
  transform: translateY(1px);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

不要移除焦点轮廓，除非提供了同样清楚的替代样式。

## 如何选择布局方式

| 需求 | 建议 |
|---|---|
| 普通文章从上到下排列 | 默认文档流 |
| 导航栏、按钮组、头像与文字 | Flexbox |
| 商品列表、仪表盘、多行多列区域 | Grid |
| 元素角上的徽标 | 父级 relative + 子级 absolute |
| 顶部吸附工具栏 | sticky |

## 学完本章应掌握的 CSS 基本概念

学习 CSS 的重点不是背下所有属性，而是理解浏览器如何选择元素、计算最终样式和排列盒子。遇到新的视觉需求时，你应该能够判断使用哪类属性，并通过开发者工具验证结果。

### 1. CSS 的职责与规则结构

CSS 负责网页的外观、间距、尺寸、布局和不同状态下的表现。一条基本规则由选择器和声明块组成：

```css
.card {
  color: #202124;
  padding: 1rem;
}
```

- `.card` 是选择器，决定规则应用于哪些元素。
- `color` 和 `padding` 是属性。
- `#202124` 和 `1rem` 是对应的值。
- 每条声明通常以分号结束。

HTML 使用 `link` 元素加载外部 CSS 文件。样式没有生效时，首先检查文件路径是否正确。

### 2. 选择器

你应该能够读懂和使用：

- 元素选择器：`p`。
- 类选择器：`.card`。
- id 选择器：`#page-title`。
- 后代和直接子元素选择器：`.card p`、`.menu > li`。
- 属性选择器：`input[type="email"]`。
- 状态伪类：`:hover`、`:focus-visible`、`:disabled`。

实际项目通常优先用 class 设置组件样式。选择器应保持清晰，避免不必要的深层嵌套。

### 3. 层叠、优先级和继承

多个规则命中同一个元素时，浏览器会根据规则来源、重要性、选择器优先级和书写顺序决定最终值。

- `#id` 的优先级通常高于 `.class`，`.class` 通常高于元素选择器。
- 优先级相同时，后写的规则覆盖先写的规则。
- `color` 和 `font-family` 等属性通常会被子元素继承。
- `margin`、`padding` 和 `border` 等盒模型属性通常不会继承。

不要用大量 `!important` 解决覆盖问题。应先在开发者工具中确认是哪条规则覆盖了当前样式。

### 4. 盒模型

每个可见元素都可以看作一个盒子，由内到外是：

```text
content → padding → border → margin
```

- `content` 是内容区域。
- `padding` 是内容与边框之间的空间。
- `border` 是盒子的边框。
- `margin` 是盒子与其他元素之间的空间。
- `box-sizing: border-box` 让声明的宽高包含 padding 和 border，通常更容易计算。

当元素尺寸或间距不符合预期时，应在开发者工具的盒模型视图中检查这四层。

### 5. 尺寸与单位

- `px` 适合边框、图标等精确小尺寸。
- `%` 相对于父元素，适合流式宽度。
- `rem` 相对于根元素字号，常用于字号和间距。
- `em` 相对于当前元素字号。
- `vw`、`vh` 相对于视口尺寸。
- `fr` 表示 Grid 容器中的剩余空间份数。

固定宽度并不总是合适。内容区域通常应该结合 `%`、`max-width`、`min()` 或 `max()`，在窄屏上收缩并在宽屏上限制最大宽度。

### 6. 普通文档流与 `display`

浏览器默认按照 HTML 顺序在普通文档流中排列元素。

- `block` 元素通常从新的一行开始并占据可用宽度。
- `inline` 元素跟随文字排列，其尺寸通常由内容决定。
- `inline-block` 跟随文字排列，但可以设置宽高。
- `none` 会把元素从布局和可访问树中移除。
- `flex` 和 `grid` 会为元素的直接子元素建立新的布局方式。

开始复杂布局之前，应该先保证普通文档流中的内容顺序合理。

### 7. Flexbox

Flexbox 主要处理**一个方向**上的排列，例如导航栏、按钮组、头像与文字。

需要理解：

- `display: flex` 创建 Flex 容器。
- `flex-direction` 设置主轴方向。
- `justify-content` 控制主轴排列。
- `align-items` 控制交叉轴对齐。
- `gap` 设置子元素之间的间距。
- `flex-wrap` 决定空间不足时是否换行。
- `flex` 控制子项如何放大、缩小和使用基础尺寸。

### 8. Grid

Grid 主要处理**行和列同时存在**的二维布局，例如卡片列表和页面主栏、侧栏。

需要理解：

- `display: grid` 创建 Grid 容器。
- `grid-template-columns` 定义列。
- `gap` 设置行列间距。
- `fr` 分配剩余空间。
- `repeat()` 用于重复网格轨道。
- `minmax()` 为轨道设置最小和最大尺寸。
- `auto-fit` 可以根据空间自动改变列数。

### 9. 定位

- `static` 是默认定位方式。
- `relative` 保留元素在文档流中的位置，也可作为绝对定位子元素的参照。
- `absolute` 脱离普通文档流，相对最近的定位祖先定位。
- `fixed` 相对浏览器视口固定。
- `sticky` 在指定滚动区域内吸附。

定位适合徽标、浮层或吸附工具栏等局部需求。不要依赖大量绝对定位搭建整个页面，否则内容变化后容易重叠。

### 10. 响应式设计

响应式设计让同一份 HTML 根据可用空间改变布局，而不是为不同设备分别制作页面。

你应该掌握：

- 在 HTML 中设置移动端 `viewport`。
- 默认先写窄屏样式，再通过 `min-width` 媒体查询增强宽屏布局。
- 根据内容何时拥挤来选择断点，而不是只根据设备名称选择。
- 使用流式尺寸、Flexbox、Grid 和媒体查询共同完成适配。
- 在手机、平板和桌面宽度下检查页面，而不是只看自己的显示器。

### 11. 内容溢出与媒体尺寸

页面不应该因为长单词、图片或表格产生意外的横向滚动。

- 图片通常使用 `max-width: 100%` 或 `width: 100%`，并保持 `height: auto`。
- 长文本可以使用 `overflow-wrap: anywhere`。
- 无法压缩的表格可以在外层容器使用 `overflow-x: auto`。
- Flex 和 Grid 子项在长内容场景下可能需要 `min-width: 0`。
- `aspect-ratio` 和 `object-fit` 可以控制媒体区域的比例和裁切方式。

### 12. 交互状态、可访问性与调试

可交互元素不应只有默认状态：

- 使用 `:hover` 表示鼠标悬停反馈。
- 使用 `:focus-visible` 为键盘用户提供清晰焦点。
- 使用 `:active` 表示正在按下。
- 使用 `:disabled` 表示不可用状态。
- 使用 `prefers-reduced-motion` 尊重用户减少动画的系统设置。

不要直接移除焦点轮廓。颜色需要具有足够对比度，并且不能只依靠颜色传达重要信息。

调试 CSS 时，应能够在浏览器开发者工具中完成：

1. 确认 CSS 文件是否加载成功。
2. 检查选择器是否匹配目标元素。
3. 查看声明是否无效或被其他规则覆盖。
4. 在 Computed 面板确认最终计算值。
5. 在盒模型面板检查元素尺寸和间距。
6. 切换不同视口宽度检查响应式布局。

## 学习自测

如果你能独立回答或完成下面的问题，就已经掌握了入门阶段需要的 CSS 概念：

1. 能否解释选择器、属性和值分别是什么？
2. 能否使用 class 为一组元素设置共同样式？
3. 能否判断两条冲突规则中哪一条会生效，并说明原因？
4. 能否解释 content、padding、border 和 margin 的关系？
5. 能否说明 `px`、`%`、`rem` 和 `fr` 的主要区别？
6. 能否分别用 Flexbox 完成横向导航、用 Grid 完成卡片列表？
7. 能否解释 `relative` 与 `absolute` 通常如何配合？
8. 能否让三列卡片在窄屏上自动变成一列？
9. 能否保证图片、长文本和表格不会意外撑破页面？
10. 能否为按钮添加清晰的 hover、focus、active 和 disabled 状态？
11. 能否在 320px、768px 和 1280px 宽度下检查页面布局？
12. 当样式没有生效时，能否使用开发者工具找出被覆盖或路径错误的原因？
