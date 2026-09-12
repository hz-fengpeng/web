# 06 DOM：HTML 与 JS 配合

前面的章节（01～05）都是 `node xxx.js`，只有 JS，看不到页面。
这一章补上另一半：**HTML 提供结构，JS 操作这份结构**。

## DOM 是什么

**DOM = Document Object Model，文档对象模型。**
浏览器把 HTML 文本解析成内存里的一棵对象树，这棵树就是 DOM，JS 操作的就是它。

### 从文本到对象树

`.html` 文件本质是一段**文本**，浏览器读到它之后，会解析成一棵树：

```text
document                     ← 整棵树的入口
  └─ html
       ├─ head
       │    ├─ meta
       │    └─ title
       └─ body
            └─ main
                 ├─ h1#demo-title
                 ├─ p.lead
                 └─ ul#env-list
                      ├─ li.env-item
                      └─ li.env-item
```

树上每个节点都是一个**对象**，有属性、有方法、有父子兄弟关系。
下面会写到的 `document.querySelector("#demo-title")`，本质就是「从根出发走这棵树，找到那个节点」。

### 关键转折：JS 不操作文本

这是最容易卡住的地方。`title.textContent = "新标题"` 这行代码**没有修改任何字符串**，
它改的是内存里那个对象的属性：

```text
HTML 文本  ──解析──▶  DOM 树（内存里的对象）  ◀──操作──  JS
                          │
                          └──▶ 浏览器根据它重新渲染像素
```

换个角度，用 C/C++ 的眼光看：

| HTML / CSS 世界 | C / C++ 类比 |
|---|---|
| `.html` 文件 | 源文件，或者一份初始数据 |
| DOM 树 | 程序运行时在内存里构建的数据结构 |
| `querySelector` | 遍历容器找元素 |
| `el.textContent = x` | 改结构体字段 |
| 改完浏览器自动重绘 | 改了内存里的状态，视图跟着更新 |

所以 **DOM 是运行时状态，HTML 只是它的初始值**。
改 DOM 不会改你的 `.html` 文件 —— 刷新一下，一切回到原样。

### 可以马上验证

正因为这俩不是一个东西，DevTools 才会把它们分开：

- **Elements 面板** = 当前的 DOM 树（活的）
- **右键 → 查看网页源代码** = 浏览器收到的原始 HTML 文本（死的）

打开 `01-hello-script.html`：Elements 面板里的 `<h1 id="demo-title">` 写的是
「01 第一个脚本（这行字是 JS 改的）」，而查看源代码里还是「01 第一个脚本」。
**这个差异就是 DOM 存在的证据。**

### 两个补充

**它是标准，不是 JS 的一部分。** DOM 是一份语言无关的接口规范（由 WHATWG 维护），
理论上 Java、Python 都能实现这套接口。JS 只是浏览器里最常用的那个绑定 ——
这也解释了为什么 `document` 在 Node 里不存在：Node 提供了 V8 引擎，
但没有实现 DOM 所需的宿主环境。

**它是活的，所以有成本。** 每改一次 DOM，浏览器可能要重新计算样式、重新布局、重新绘制像素。
所以批量改（先算好，一次性插入）比在循环里改 100 次快得多 ——
这也是后面 React 用虚拟 DOM 攒一批再改的动机。

### 这一章在练什么

围绕这棵树，四个示例就是四个递进的动作：

**接上脚本 → 找到并修改节点 → 感知用户操作 → 把改动组织好。**

## 怎么运行

**直接用浏览器打开 `01-hello-script.html`**，然后按 `F12`（macOS 是 `Cmd + Option + I`）打开 DevTools，
切到 Console 面板看输出。

注意：浏览器里的 `console.log()` **不会**打印到终端，只在 DevTools 里可见。
这就是为什么这一章不能用 `node` 跑 —— 下面「和 Node 的区别」会讲清楚原因。

## 四个示例

| 文件 | 讲什么 |
|---|---|
| `01-hello-script.html` | `<script>` 标签、`defer`、加载时机；浏览器环境和 Node 环境有什么不同 |
| `02-dom-manipulation.html` | 查找元素、读写内容（含 XSS 演示）、切换 class、增删节点、`dataset` |
| `03-events.html` | `addEventListener`、事件对象、**事件委托**、表单与 `preventDefault` |
| `04-todo-app.html` | 综合示例：待办清单，演示「界面 = f(数据)」 |

`.html` 和同名的 `.js` 是一对，注释里的小节顺序和页面上的一致，可以对照着看。
四个页面共用 `styles.css` —— 这也是刻意的分工：**HTML 管结构，CSS 管外观，JS 管行为**，
所以 JS 里看不到具体的样式值，只有"给元素加/减某个 class"。

建议按 01 → 04 顺序看，每看完一个就打开 DevTools，边点边看输出。

## 和 Node 的区别

同一门 JS 语言，两种运行环境提供的东西不一样：

```javascript
// 浏览器（这一章）
window, document, localStorage, fetch, alert      // ✓ 有
process, require, __dirname, fs                   // ✗ 没有

// Node（第 01～05 章）
process, require, __dirname, fs, Buffer            // ✓ 有
window, document, localStorage                     // ✗ 没有
```

`01-hello-script.js` 会把这些名字逐个 `typeof` 一遍，打印在页面上。

还有两个容易踩的差异：

- **输出位置不同**：Node 打到终端，浏览器打到 DevTools Console。
- **顶层 `this`、模块系统不同**：Node 有 `require`/`module`，浏览器用 `<script type="module">` 和 `import`
  （见 `04-modern-js/03-modules.js`）。

## 关于 `file://` 的限制

本章的示例都是普通 `<script src="...">`，所以**直接双击打开 `.html` 就能用**。

但如果之后想在这类页面里用 ES module（`import`）或者 `fetch` 读本地文件，
浏览器的跨域策略会拦住 `file://` 页面。这时需要起一个本地服务器：

```bash
cd js_learn/06-dom
python3 -m http.server 8000
# 然后访问 http://localhost:8000/01-hello-script.html
```

## 几个值得养成的习惯

1. **JS 一律写在单独的 `.js` 文件里**，HTML 中只留 `<script src="..." defer>`。
   只有写两三行的临时验证才用内联 `<script>`。
2. **`console.log` 是前端最重要的调试手段**。这一章的每个文件都在关键位置打了日志，
   改代码时顺手多打几个，比盯着页面猜快得多。
3. **改内容用 `textContent`，不要用 `innerHTML`**（除非你完全掌控那段 HTML）。
   02 里有一个可运行的注入演示，点一下就知道后果。
4. **事件用 `addEventListener`**，不要用 `onclick="..."` 属性或 `el.onclick = fn`。

## 下一步

- 想补 HTML/CSS 基础：`html_css_learn/`
- 想看这套「界面 = f(数据)」的思路被框架化：`React_learn/`
- 想在 Node 里继续深入异步：`05-async/`
