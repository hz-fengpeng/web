# 01 HTML 基础

HTML（HyperText Markup Language）是一种标记语言。它使用标签描述页面内容的含义和层级，不负责业务逻辑。

## 本章示例

学习本章时，可以在浏览器中打开 [examples/html-basics/index.html](./examples/html-basics/index.html)，一边查看页面，一边阅读带注释的 HTML 源码。示例覆盖了本章介绍的主要元素，并且不需要安装任何依赖。

## 最小完整文档

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的第一个页面</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>你好，HTML</h1>
    <p>这是页面中可见的内容。</p>
  </body>
</html>
```

- `<!doctype html>`：告诉浏览器按现代 HTML 标准解析。
- `<html lang="zh-CN">`：文档根元素；`lang` 帮助搜索引擎和读屏软件识别语言。
- `<head>`：放元信息、页面标题和外部资源，通常不直接显示。
- `<meta charset="UTF-8">`：避免中文乱码。
- `viewport`：让移动设备按真实屏幕宽度渲染页面。
- `<body>`：放用户实际看到的页面内容。

## 标签、元素和属性

```html
<a class="primary-link" href="https://example.com">访问示例网站</a>
```

- `<a>` 和 `</a>` 是开始、结束标签。
- 整段代码是一个元素。
- `class` 和 `href` 是属性，提供额外信息。
- `访问示例网站` 是元素内容。

元素可以嵌套，但不能交叉：

```html
<!-- 正确 -->
<p>学习 <strong>HTML</strong> 很有用。</p>

<!-- 错误：结束顺序与开始顺序不一致 -->
<p>学习 <strong>HTML</p></strong>
```

## 内容类标签

### 标题和段落

```html
<h1>文章主标题</h1>
<h2>第一章</h2>
<p>这是一个完整段落，其中有<strong>重要内容</strong>和<em>需要强调的语气</em>。</p>
```

一个页面通常只有一个描述主要内容的 `h1`。标题级别表达层级，不要仅为了字体大小而跳级；字体大小应交给 CSS。

### 列表

```html
<ul>
  <li>无顺序要求的项目</li>
  <li>另一个项目</li>
</ul>

<ol>
  <li>打开编辑器</li>
  <li>编写代码</li>
  <li>在浏览器中验证</li>
</ol>
```

`ul` 是无序列表，`ol` 是有序列表，两者的直接子元素应是 `li`。

### 链接和图片

```html
<a href="./about.html">了解更多</a>
<a href="https://example.com" target="_blank" rel="noopener noreferrer">在新窗口打开</a>
<img src="./images/avatar.jpg" alt="张三微笑着面对镜头" width="320" height="320">
```

- 相对路径 `./about.html` 指向当前目录；`../` 表示上一级目录。
- 新窗口链接应添加 `rel="noopener noreferrer"`。
- `alt` 描述图片内容。纯装饰图片使用 `alt=""`，不能省略该属性。
- 明确图片尺寸可以减少页面加载时的布局跳动。

## 使用语义化结构

```html
<body>
  <header>
    <a href="/">网站名称</a>
    <nav aria-label="主导航">
      <a href="/articles">文章</a>
      <a href="/about">关于</a>
    </nav>
  </header>

  <main>
    <article>
      <h1>文章标题</h1>
      <section>
        <h2>章节标题</h2>
        <p>章节内容。</p>
      </section>
    </article>
    <aside>相关阅读</aside>
  </main>

  <footer>版权与联系方式</footer>
</body>
```

常见语义元素：

| 标签 | 含义 |
|---|---|
| `header` | 页面或区域的头部 |
| `nav` | 主要导航链接 |
| `main` | 页面唯一的主要内容 |
| `article` | 可独立分发的内容，如文章或动态 |
| `section` | 有主题的一组内容，通常包含标题 |
| `aside` | 与主内容间接相关的补充信息 |
| `footer` | 页面或区域的尾部 |
| `div` | 没有更合适语义时使用的通用块容器 |
| `span` | 没有更合适语义时使用的行内容器 |

语义化的目标不是完全消灭 `div`，而是让结构能表达内容含义。

## 表单

```html
<form action="/subscribe" method="post">
  <div>
    <label for="email">邮箱</label>
    <input id="email" name="email" type="email" autocomplete="email" required>
  </div>

  <div>
    <label for="role">身份</label>
    <select id="role" name="role">
      <option value="student">学生</option>
      <option value="developer">开发者</option>
    </select>
  </div>

  <label>
    <input name="agreement" type="checkbox" required>
    我同意相关条款
  </label>

  <button type="submit">提交</button>
</form>
```

关键点：

- `label` 的 `for` 应与控件 `id` 对应，点击文字也能聚焦控件。
- `name` 是表单提交时使用的字段名。
- 使用正确的 `type`，浏览器才能提供校验和合适的移动端键盘。
- 按钮放在表单中时明确写出 `type="submit"` 或 `type="button"`。
- `placeholder` 不能代替 `label`，因为输入后提示文字会消失。

## 表格

表格用于二维数据，不应用于页面布局。

```html
<table>
  <caption>本周学习时间</caption>
  <thead>
    <tr>
      <th scope="col">日期</th>
      <th scope="col">时长</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">周一</th>
      <td>45 分钟</td>
    </tr>
  </tbody>
</table>
```

## 可访问性基础

- 页面必须能只用键盘操作，焦点状态要清楚可见。
- 用真正的 `button` 执行操作，用 `a` 导航到地址，不要用可点击的 `div` 冒充。
- 图片提供合适的 `alt`；输入框提供可见的 `label`。
- 标题顺序要反映文档层级。
- 优先使用原生语义标签；只有原生语义不足时才考虑 ARIA。

## 常见错误

```html
<!-- 不推荐：重复 id -->
<div id="card"></div>
<div id="card"></div>

<!-- 不推荐：把块级结构放进段落 -->
<p><div>内容</div></p>

<!-- 不推荐：用 br 制造布局间距 -->
<p>第一段</p><br><br><p>第二段</p>
```

`id` 在页面中必须唯一；重复样式使用 `class`。视觉间距使用 CSS 的 `margin`、`padding` 或 `gap`。

## 动手观察

打开本章示例后，尝试依次完成：

1. 把文章标题和正文换成自己的内容。
2. 在无序列表和表格中各增加一项。
3. 删除图片的 `alt`，再使用开发者工具查看元素；然后恢复准确的描述。
4. 点击“提交报名”但不填写必填项，观察浏览器提供的原生校验。
5. 只用 Tab、Shift + Tab 和 Enter 操作导航链接与表单。

## 学完本章应掌握的 HTML 基本概念

学习 HTML 的重点不是背下所有标签，而是理解浏览器如何根据 HTML 建立页面结构，并能根据内容含义选择合适的元素。

### 1. HTML 的职责

HTML 负责描述网页的**内容和结构**，例如什么是标题、段落、导航、图片或表单。CSS 负责外观和布局，JavaScript 负责交互与数据变化。

### 2. 文档的基本结构

你应该能够不看示例写出一个包含以下内容的完整文档：

- `<!doctype html>`：使用现代 HTML 标准。
- `<html lang="zh-CN">`：页面根元素和文档语言。
- `<head>`：字符编码、移动端视口、页面标题和资源引用。
- `<body>`：用户能够看到和操作的页面内容。

### 3. 标签、元素和属性

```html
<a class="article-link" href="./article.html">阅读文章</a>
```

- `a` 是标签名称。
- 从开始标签到结束标签的整体是一个元素。
- `class` 和 `href` 是属性。
- `阅读文章` 是元素的文本内容。

有些元素没有结束标签，例如 `img`、`input`、`meta` 和 `link`。

### 4. 嵌套关系与文档树

HTML 元素通过嵌套形成父子关系：

```html
<article>
  <h2>文章标题</h2>
  <p>文章内容</p>
</article>
```

这里 `article` 是父元素，`h2` 和 `p` 是它的子元素。浏览器解析 HTML 后会建立一个树形结构，也就是 DOM（Document Object Model）。标签必须按正确顺序闭合，不能交叉嵌套。

### 5. 语义化

语义化是根据内容的含义选择标签，而不是根据默认外观选择标签：

- 页面主标题使用 `h1`，正文段落使用 `p`。
- 页面导航使用 `nav`，主要内容使用 `main`。
- 独立文章使用 `article`，有主题的区域使用 `section`。
- 能使用具体语义标签时，不要全部写成 `div`。

语义清晰的 HTML 更容易维护，也有利于搜索引擎和读屏软件理解页面。

### 6. 常用内容元素

你应该知道以下元素分别适合表达什么内容：

| 内容 | 常用元素 |
|---|---|
| 标题 | `h1` 到 `h6` |
| 段落与强调 | `p`、`strong`、`em` |
| 列表 | `ul`、`ol`、`li` |
| 链接 | `a` |
| 图片及说明 | `img`、`figure`、`figcaption` |
| 页面区域 | `header`、`nav`、`main`、`article`、`section`、`aside`、`footer` |
| 通用容器 | `div`、`span` |

不需要一次记住所有 HTML 标签。遇到不熟悉的内容时，先判断它的含义，再查询合适的元素。

### 7. 链接、图片与路径

- `a` 的 `href` 表示目标地址。
- `img` 的 `src` 表示图片地址，`alt` 描述图片内容。
- `./` 从当前目录开始，`../` 返回上一级目录。
- `https://...` 是完整的外部地址。
- 页面内可以通过 `href="#section-id"` 跳转到对应的 `id`。

路径错误是图片或样式加载失败的常见原因。遇到问题时，应在开发者工具的 Network 或 Console 面板检查请求地址。

### 8. 表单

表单用于收集用户输入。需要理解：

- `form` 包含一组表单控件。
- `label` 描述控件，并通过 `for` 与控件的 `id` 关联。
- `name` 是提交数据时使用的字段名。
- `type` 决定输入类型，例如 `text`、`email`、`radio` 和 `checkbox`。
- `required` 表示必填，属于没有值的布尔属性。
- `button` 应明确写出 `type="submit"` 或 `type="button"`。

### 9. 表格

表格只用于有明确行列关系的数据。`table` 表示表格，`tr` 表示行，`th` 表示表头单元格，`td` 表示普通数据单元格。不要使用表格排列整个网页。

### 10. `id` 与 `class`

- `id` 用于标识页面中的唯一元素，也可用于页内跳转和表单关联。
- `class` 可以在多个元素上重复使用，通常用于应用 CSS 样式。
- 同一个页面中不能出现重复的 `id`。

### 11. 可访问性

一个基础 HTML 页面至少应该做到：

- 标题层级清楚且顺序合理。
- 图片具有准确的 `alt`，纯装饰图片使用空的 `alt=""`。
- 输入控件具有可见的 `label`。
- 使用 `a` 进行导航，使用 `button` 执行操作。
- 只使用键盘也能访问链接和操作表单。

### 12. HTML、CSS 和 JavaScript 的关系

```text
HTML       内容与结构
CSS        外观与布局
JavaScript 交互与状态变化
```

三者各有职责。学习 HTML 时，应先保证没有 CSS 和 JavaScript 的情况下，页面内容仍然完整、顺序合理并且可以理解。

## 学习自测

如果你能独立回答或完成下面的问题，就已经掌握了入门阶段需要的 HTML 概念：

1. 能否从空文件写出一个完整的 HTML 页面？
2. 能否解释标签、元素、属性和内容的区别？
3. 能否画出一段嵌套 HTML 的父子关系？
4. 能否解释 `div` 与 `main`、`article`、`section` 的使用区别？
5. 能否正确编写链接、图片、列表和带标题层级的文章？
6. 能否创建一个包含 label、输入框和提交按钮的表单？
7. 能否创建一个具有表头的二维数据表格？
8. 能否解释 `id`、`class`、相对路径和 `alt` 的用途？
9. 能否只使用键盘操作自己编写的页面？
10. 当图片没有显示时，能否使用开发者工具检查路径？
