# React 学习项目

这是一个渐进式的 React 学习项目，包含从基础到进阶的示例。

## React 是什么

React 不是一门新语言，它是一个用 JavaScript 写的**库**。

### JavaScript 是什么
- 一门编程语言
- 浏览器原生支持
- 可以直接操作 DOM（网页元素）

### JSX 是什么

**JSX 既不是 JavaScript，也不是 HTML，它是第三种东西。**

准确说：JSX 是 **JS 的语法扩展**（syntax extension）——长得像 HTML，住在 `.jsx` 文件里，**编译之后一点不剩**。

| | 住在哪 | 浏览器认识吗 | 属性写法 | 编译后 |
|---|---|---|---|---|
| **HTML** | `.html` 文件 | ✅ 认识 | `class="box"` `onclick="fn()"` | 不变 |
| **JS** | `.js` 文件 | ✅ 认识 | 不涉及 | 不变 |
| **JSX** | `.jsx` 文件 | ❌ **不认识** | `className="box"` `onClick={fn}` | **变成纯 JS 函数调用** |

浏览器不认识 JSX，这正是需要 Vite 的原因之一（见「Vite 是什么」）。

**和 JS 的区别：只有一条**

JSX 是 JS 的**超集**——多出来的只有一件事：可以在 JS 里直接写标签。

```javascript
const a = 1 + 1                    // 普通 JS，JSX 文件里也能写
const b = <div>hello</div>         // 只有 JSX 能写，浏览器不认
```

标签那部分编译后就没了，变成普通的 JS 函数调用：

```javascript
const b = <div>hello</div>
//        ↓ 编译
const b = jsx("div", { children: "hello" })
```

所以 JSX **只是书写形式**，不是新语言，也不产生新东西。它之于 JS，就像 `#define` 宏之于 C——编译期展开，产物里找不到它。

**但 JSX 也不是 HTML**

虽然长得几乎一样，有两条实质区别。

1. **属性名不是一套规则**

| HTML | JSX |
|---|---|
| `class="box"` | `className="box"` |
| `for="x"` | `htmlFor="x"` |
| `onclick="fn()"` | `onClick={fn}` |
| `tabindex="1"` | `tabIndex={1}` |

2. **值是什么，差别更大**

- HTML 的 `onclick="fn()"` 是**一个字符串**，浏览器回头去执行它
- JSX 的 `onClick={fn}` 是**一个真正的函数对象**

证据：追踪 React 渲染 `<button onClick={...}>` 时调用的 DOM API，`setAttribute` 记录里**根本没有 onClick**——React 没把它写成 HTML 属性，而是自己在内部管理事件（就是「合成事件」）。

**`{}` 里只能写表达式**

从 JS 角度最容易踩的坑：`{}` 里**只能放表达式，不能放语句**。

```
❌ 写 if 语句
   <div>{ if (x) { return 1 } }</div>
   → ERROR: Unexpected "if"

✅ 写三元表达式
   <div>{ x > 0 ? '正' : '负' }</div>

✅ 写函数调用、方法链
   <div>{ getName() }{ list.map(i => <li key={i}>{i}</li>) }</div>
```

原因：表达式**有值**，语句没有。而 `{}` 是要把里面的东西**求值成一个结果**塞进 `children` 的——所以只能放有值的东西。

这也解释了为什么 JSX 里见不到 `for` 循环，只有 `.map()`：`for` 是语句，`.map()` 是表达式（返回一个新数组）。

**JSX 是表达式，不是语句**

这条决定了它能用在哪：

```javascript
const a = cond ? <p>yes</p> : <p>no</p>             // 能赋值
const b = [<li key="1">1</li>, <li key="2">2</li>]  // 能进数组
foo(<div />)                                        // 能当参数传
```

**一个流传很广的错误说法**

「JSX 必须用 `className`，因为 `class` 是 JS 保留字」——这个理由是错的：

```javascript
console.log({ class: 'foo', for: 'bar' })
// { class: 'foo', for: 'bar' }      ← 现代 JS 里完全合法
```

而且在 React 里直接写 `class` 其实**也能生效**，只是会警告：

```
用 class     → <div class="box">内容</div>   控制台警告：Invalid DOM property `class`. Did you mean `className`?
用 className → <div class="box">内容</div>   无警告
```

所以准确的说法是：**这是 React 定的命名约定，不遵守会警告**。记住约定照写就行，别去记那个错误的原因。

**和 C/C++ 对照**

```
JSX  ≈  语法糖 / 宏        编译期展开，产物里消失
JS   ≈  宿主语言           最终真正运行的东西
```

区别在于 JSX 不是纯文本替换（像 `#define` 那样），它是**结构化的**——`<div>` 的标签和属性会被解析成一棵树，再生成函数调用。这点更像 C++ 的 range-based for：写起来是语法糖，编译后是普通的迭代器调用。

所以你写的 `.jsx` 文件里，**JS 和 JSX 是混在一起的**：`{}` 外面是 JS，`{}` 里面还是 JS，只有标签那部分是 JSX。这也是为什么说「JSX 让你在 JS 里写 UI」——它没有另起炉灶搞一门模板语言，而是直接扩展了 JS 本身。

> 更详细的语法和用法见「学习路径」里的 **02 - JSX 语法**。

### React 是什么
- 一个 JavaScript **库**（用 JS 写的工具）
- 用来构建用户界面（UI）
- 让开发网页应用更简单、更高效

### 核心区别

**用原生 JS 写界面：**
```javascript
// 需要手动操作 DOM
const button = document.createElement('button')
button.textContent = '点击次数: 0'
let count = 0

button.addEventListener('click', () => {
  count++
  button.textContent = '点击次数: ' + count  // 手动更新
})

document.body.appendChild(button)
```

**用 React 写界面：**
```javascript
function Counter() {
  const [count, setCount] = useState(0)
  
  return (
    <button onClick={() => setCount(count + 1)}>
      点击次数: {count}
    </button>
  )
  // React 自动更新界面
}
```

### React 的优势

1. **声明式编程** - 你只需描述界面"应该是什么样"，不用关心"怎么更新"
2. **组件化** - 把界面拆分成可复用的小块
3. **自动更新** - 数据变化时，React 自动更新界面
4. **虚拟 DOM** - React 在内存中计算最小的更新，避免整棵树重建
   （注意：它快是相对于"每次重建整棵树"，**不等于**比手工最优化的 DOM 操作更快。真正的价值是让你「写起来简单」和「更新量小」兼得，详见「React 的 render 和浏览器的 render」一节）

### 简单类比

- **JavaScript** = 语言（像中文、英文）
- **React** = 工具/框架（像写作模板，让你更高效地用这门语言）

你已经会 JS 了，学 React 就是学习如何用 JS 以更好的方式构建网页应用。React 本质上还是 JavaScript，只是提供了一套更好的开发模式。

## Vite 是什么

Vite 是一个**前端构建工具**，让你能快速启动和开发 React 项目。

### Vite 的作用

简单说，Vite 帮你做这些事：

1. **启动开发服务器** - 让你在浏览器中看到代码效果
2. **热更新** - 修改代码后，浏览器自动刷新，不用手动刷新
3. **处理 JSX** - 浏览器不认识 JSX，Vite 把它转成浏览器能理解的 JS
4. **打包代码** - 开发完成后，把代码打包成可以部署的文件

### 为什么需要 Vite

浏览器不能直接运行 React 代码，因为：
- 浏览器不认识 JSX 语法
- 浏览器不认识 `import` 语句（ES6 模块）
- 需要把多个文件合并优化

Vite 就像一个**翻译器 + 服务器**，让你能愉快地写 React 代码。

### Vite 的特点

- **超快** - 启动速度比老工具（webpack）快很多
- **简单** - 配置很少，开箱即用
- **现代** - 专为现代浏览器设计

### 类比

- 你写的 React 代码 = 原材料
- Vite = 厨房（提供工具和环境）
- 最终网页 = 做好的菜

### 常用命令

```bash
npm run dev      # 启动开发服务器（边写边看效果）
npm run build    # 打包项目（准备上线）
npm run preview  # 预览打包后的效果
```

你现在只需要知道：**Vite 让你能方便地开发 React 项目**。运行 `npm run dev` 后，Vite 就在后台帮你处理所有复杂的事情，你只需专注写代码就行。

## 项目是怎么运行起来的

当你运行 `npm run dev` 后，整个项目的启动流程如下：

### 1. npm 查找命令
```json
// package.json 中定义了
"scripts": {
  "dev": "vite"
}
```
npm 看到 `dev` 对应的是 `vite` 命令，于是执行 Vite

### 2. Vite 启动开发服务器
- Vite 读取 `vite.config.js` 配置
- 启动一个本地服务器（通常是 http://localhost:5173）
- 监听文件变化

### 3. 浏览器访问时的加载流程

```
浏览器请求 http://localhost:5173
    ↓
Vite 返回 index.html
    ↓
浏览器解析 HTML，看到：
<script type="module" src="/src/main.jsx"></script>
    ↓
浏览器请求 /src/main.jsx
    ↓
Vite 把 JSX 转成 JS，返回给浏览器
    ↓
main.jsx 执行：
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
    ↓
React 把 <App /> 组件渲染到 <div id="root"> 里
    ↓
App.jsx 引入了 10 个示例组件
    ↓
所有组件渲染完成，你看到完整页面
```

**展开：「Vite 把 JSX 转成 JS，返回给浏览器」是什么意思？**

这句话的重点是：**Vite 不生成任何 .js 文件**。它在内存里把 JSX 转成 JS，直接把结果当作 HTTP 响应发回浏览器。磁盘上从头到尾不会多出一个编译后的文件。

浏览器请求 `/src/main.jsx` 时，Vite 真正返回的内容长这样（`curl -i http://localhost:5173/src/main.jsx` 抓到的真实响应）：

```javascript
// 响应头：Content-Type: text/javascript

import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=70204f9d";
const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import App from "/src/App.jsx";
import "/src/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(React.StrictMode, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "/Volumes/DATA/code/前端/web/04-React_learn/src/main.jsx",
    lineNumber: 8,
    columnNumber: 5
  }, this) }, void 0, false, { /* 以下省略 */ })
);
//# sourceMappingURL=data:application/json;base64,...
```

对比你写的 `src/main.jsx`，Vite 做了三件事，每一件都是为了「让浏览器能跑」：

**1. JSX 变成函数调用**

`<App />` 变成了 `jsxDEV(App, {}, ...)`。开发版叫 `jsxDEV`，会额外带上 `fileName` / `lineNumber` 方便定位错误；打包上线后会换成精简版的 `jsx`。

**2. import 路径被重写**

| 你写的 | 浏览器收到的 | 为什么必须换 |
|---|---|---|
| `from 'react'` | `from "/node_modules/.vite/deps/react.js?v=..."` | `'react'` 是**裸模块名**，浏览器不认识，得换成能请求的 URL |
| `from './App'` | `from "/src/App.jsx"` | 省略了扩展名，浏览器也不认，得补全 |
| `import './index.css'` | `import "/src/index.css"` | CSS 被包装成了 JS 模块，执行时动态插入 `<style>` 标签（这样改样式也能热更新） |

**3. 末尾内联一段 sourcemap**

那段 base64 解出来，装的是你写的**原始 JSX 源码**。这就是为什么在 F12 里打断点、看报错堆栈，显示的都是 `.jsx` 原文和正确行号——浏览器实际执行的是编译后的 JS，靠 sourcemap 映射回了源码。

> 图中没画但同样重要：`index.html` 也不是原样返回的，Vite 会往里注入 `/@react-refresh`（热更新）和 `/@vite/client`（和服务器通信的 WebSocket 客户端）。第 6 节「修改代码时发生什么」就是它俩在干活。

**动手验证**

```bash
npm run dev                                  # 启动开发服务器
curl -i http://localhost:5173/src/main.jsx   # 另开一个终端，看真实响应
ls src/                                      # 目录里不会多出任何 .js 文件
```

**和 C/C++ 对照**

| | 对应命令 | 什么时候编译 |
|---|---|---|
| **JIT**（运行中编译） | `npm run dev` | 开发时，请求哪个文件才转哪个 |
| **AOT**（提前编译） | `npm run build` | 上线前，一次性全部编译好写进 `dist/` |

第 5 节说的「按需编译」就是这个 JIT 特性，也是 Vite 冷启动快的原因。**只有 `npm run build` 才会真正往磁盘写文件**，详见后面的「项目发布上线」。

**展开：`ReactDOM.createRoot` 是「接管」不是「创建」**

`createRoot` 这个名字容易让人以为「React 创建了一个 DOM」。**恰恰相反**——它是**接管一个已经存在的 DOM 元素**。名字里的 "Root" 指的是 **React 内部的根对象**，不是 DOM 的根。

流程图上最后一行其实是两个动作：

```javascript
ReactDOM.createRoot( document.getElementById('root') )  .render( <App /> )
//      ↑ 拿到句柄                   ↑ 接管容器              ↑ 往句柄里写内容
```

在 jsdom 里实测（故意给容器预置一段内容）：

```
createRoot 刚调用完 : <p>我是写死在 index.html 里的</p>        ← 容器一个字节都没动
render 刚调用完     : <p>我是写死在 index.html 里的</p>        ← 还是旧的！
等 50ms 之后        : <button class="btn">点击次数: 0</button>  ← 这才出现
```

三个值得记住的点：

**① `createRoot` 不创建也不修改 DOM** —— 它只返回一个 `ReactDOMRoot` 句柄对象，身上只有 `render` 和 `unmount` 两个方法。真正创建 DOM 的是 `render`。

**② `render()` 是异步的** —— 调用完的那一瞬间 DOM 没变，React 18 把渲染工作排进了调度队列。所以**别在 `render()` 的下一行马上读 DOM**，会读到旧内容。

**③ 首次 render 会顶掉容器里原有的内容，重复 render 是「原地更新」不是「往后追加」** —— 调两次 `render`，容器子节点始终是 1 个。这正是「虚拟 DOM 计算最小更新」的实际表现。

**容器必须先存在**，否则直接报错：

```javascript
ReactDOM.createRoot(document.getElementById('not-exist'))
// Error: createRoot(...): Target container is not a DOM element.
```

**用 C/C++ 对照**

```c
FILE *fp = fopen("已存在的文件.txt", "w");   // 打开已存在的对象，返回句柄
```

`fopen` 不创建文件，只拿到操作权并返回句柄；`FILE*` 本身不是文件内容，是个控制结构；真正写数据是后面的 `fprintf`（对应 `root.render`）。`ReactDOMRoot` 就是这个 `FILE*`。

**一句话**：`createRoot` 是「接手一间已经盖好的毛坯房」（房子是 index.html 盖的），`render` 才是「往里搬家具」。

### 4. 详细的文件执行顺序

**index.html** (入口)
```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

**↓**

**src/main.jsx** (启动 React)
```javascript
import App from './App'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

**↓**

**src/App.jsx** (主组件)
```javascript
import Example01 from './examples/01-BasicComponent'
// ... 引入其他示例
return <div>所有示例组件</div>
```

**↓**

**各个示例组件** (01-05)
```javascript
function Example01() {
  return <div>示例内容</div>
}
```

### 5. Vite 在背后做的事

1. **实时编译** - 你访问哪个文件，Vite 才编译哪个（按需编译，所以快）
2. **模块转换** - 把 JSX 转成普通 JS
3. **热更新 (HMR)** - 你修改代码后，Vite 检测到变化，只更新改变的部分，不刷新整个页面
4. **依赖处理** - 自动处理 `import` 语句，找到对应的文件

### 6. 修改代码时发生什么

```
你保存文件
    ↓
Vite 检测到文件变化
    ↓
Vite 重新编译这个文件
    ↓
通过 WebSocket 通知浏览器
    ↓
浏览器只更新改变的组件（不刷新整页）
    ↓
你立即看到效果
```

这就是为什么你修改代码后，浏览器几乎瞬间就能看到变化！

### 类比理解

想象一个餐厅：
- **index.html** = 餐厅大门
- **main.jsx** = 前台（接待客人，安排座位）
- **App.jsx** = 菜单（列出所有菜品）
- **各个组件** = 厨房里的各道菜
- **Vite** = 服务员（把菜从厨房端到桌上，还能随时加菜）

当你访问网站时，就像进入餐厅点菜，Vite 把所有组件"端"到浏览器里显示出来。

## React 的 render 和浏览器的 render

**「渲染」这个词被两个不同的东西共用了**，这是学 React 时最容易混淆的一点：

| | 干什么 | 谁负责 |
|---|---|---|
| **React 的 render** | 决定 DOM 树**长什么样、该改哪些节点** | React |
| **浏览器的 render** | 把 DOM + CSS 变成屏幕上的**像素** | 浏览器渲染引擎 |

它们**先后发生，互不替代**：React 干完自己的活，把 DOM 树交给浏览器，浏览器才开始画。

### 实测：React 干的是前者

拦截所有 DOM 操作 API，再让 React 渲染一个 `<div class="box"><h1>标题</h1></div>`：

```
render 阶段 React 实际调用的：
1. createElement("h1")
2. createElement("div")
3. appendChild(<h1>)
4. setAttribute("class", "box")
5. appendChild(<div>)
```

**就是 `document.createElement` / `appendChild` / `setAttribute`**——和第一节「核心区别」里手写的原生 JS 完全是同一套 API。React 没有任何特权通道，它没法命令浏览器「把这块涂成蓝色」，它唯一能做的就是调用这些 DOM API。

### 一个反向证据

上面这些是在 **jsdom** 里跑的。jsdom 是纯 JS 的 DOM 模拟器，**没有布局引擎、没有像素、没有屏幕，什么都画不出来**——但 React 在里面跑得好好的，DOM 树也建得完全正确。

如果 React 是那个「把界面画出来」的东西，它在 jsdom 里根本没法工作。**这恰好证明 React 不负责「画」。**

### 浏览器接着做了什么

React 改完 DOM 之后，浏览器自己有一套流水线：

```
DOM 变了
    ↓
样式计算（Recalculate Style） —— 哪个元素该有什么样式
    ↓
布局 / 回流（Layout）         —— 算每个元素的位置和大小
    ↓
绘制（Paint）                —— 填充像素
    ↓
合成（Composite）            —— 图层合成，交给 GPU 上屏
```

这四步 React 一步都插不上手，全是浏览器渲染引擎（Chrome 是 Blink）的活。而且这四步是**最贵**的——React 真正在优化的，是「**让 DOM 少改几次，别老是触发这一整套流程**」。

### 补充：React 内部的「render 阶段」恰恰不碰 DOM

React 内部把工作分成两个阶段，名字起得更容易让人误会：

- **render 阶段** —— 纯计算，算出「要改什么」，**不碰 DOM**，可中断
- **commit 阶段** —— 真正调用 DOM API，把改动提交上去

也就是说，React 用 "render" 这个词，指的恰恰是**碰 DOM 之前**的那一步，跟「画出来」半点关系都没有。

### 那 React 存在的意义是什么

既然调的还是同一套 API，为什么不直接手写？对比两段代码：

```javascript
// 原生：数据变了，你得自己算该改哪个节点、怎么改
count++
button.textContent = '点击次数: ' + count     // ← 自己找到节点，自己改
```

```javascript
// React：你只说"界面 = 什么数据"
<button>点击次数: {count}</button>            // ← 怎么改 DOM，React 去算
```

差别不在「谁画像素」——两次都是浏览器画。差别在于**「改 DOM 这件事由谁负责」**：

- **手写**：你得自己维护「数据和 DOM 的同步逻辑」，界面一复杂就容易漏改、错改
- **React**：你只描述结果，它来算差量、决定调哪几个 DOM API

所以第一节说的「自动更新」要理解准确：**React 自动的是「算差量 + 调 DOM API」，不是「画屏幕像素」**。

**React 替代的是「你手动操作 DOM」这件事，不是「浏览器渲染」这件事。**

### 用 C/C++ 对照

```
浏览器渲染引擎  ≈  显卡驱动 / GPU          ← 真正干绘制的
React           ≈  Qt / GTK 这类 GUI 框架   ← 决定什么时候调底层绘制调用
```

你在 Qt 里调 `label->setText("hello")`——Qt 不会自己去画像素，它最终还是要落到平台的原生绘制调用上。多了一层框架，底下那台渲染机没换。React 之于 DOM，就是 Qt 之于 X11/Win32。

**一句话**：浏览器是画画的，React 是决定「画什么、什么时候重画」的。React 想画也画不了——它会的只是调 DOM API。

### 动手验证

打开 F12 → **Performance** 面板 → 点录制 → 操作一下页面 → 停止录制。火焰图里能清楚看到两类不同的东西：

- 一堆 **JS 调用栈**（React 在里面算差量、调 DOM API）
- **Layout / Paint / Composite Layers** 这些块（浏览器在算位置、填像素）

它们是**前后相继的两件事**，不是同一件——这就是本节说的「两个 render」。

## 开始学习

1. 安装依赖:
```bash
npm install
```

2. 启动开发服务器:
```bash
npm run dev
```

3. 在浏览器中打开显示的地址（通常是 http://localhost:5173）

## 学习路径

### 01 - 基础组件
- 了解什么是 React 组件
- 组件的基本结构
- 函数组件的写法

### 02 - JSX 语法
- JSX 是什么
- 如何在 JSX 中使用 JavaScript 表达式
- 列表渲染和条件渲染

### 03 - Props（属性）
- Props 的作用
- 如何传递和接收 props
- 组件复用

### 04 - State（状态）
- useState Hook 的使用
- 状态更新和组件重新渲染
- 受控组件

### 05 - 事件处理
- React 中的事件命名规则
- 常见事件类型
- 事件处理函数的写法

### 06 - useEffect Hook
- 理解副作用（side effects）的概念
- useEffect 的基本用法
- 依赖数组的作用
- 清理函数的使用
- 常见应用场景（API 请求、定时器、订阅）

### 07 - 条件渲染
- if/else 语句
- 三元运算符
- && 运算符（短路运算）
- switch 语句
- 根据不同条件显示不同内容

### 08 - 列表渲染和 key
- 使用 map 方法渲染列表
- key 的作用和重要性
- 列表的增删改查操作
- 列表过滤
- 完整的待办事项示例

### 09 - 表单处理
- 受控组件的概念
- 各种表单元素（input、select、checkbox、textarea）
- 表单验证
- 错误提示
- 表单提交处理

### 10 - Context（上下文）
- 解决 props 层层传递（Props Drilling）的问题
- createContext / Provider / useContext
- 主题切换、用户认证等实际场景
- 用自定义 Hook 封装 Context

### 11 - useCallback
- 函数组件里的函数为什么每次渲染都是新的
- 配合 React.memo 避免子组件被无谓地重新渲染
- 依赖数组的坑：闭包陷阱（stale closure）
- 实际场景：useEffect 里注册和清理事件监听
- 什么时候不该用 useCallback

### 12 - useRef
- useRef 和 useState 的区别（改了不触发渲染）
- 拿到真实的 DOM 元素（命令式操作 DOM）
- 存不该触发渲染的值：定时器 id、上一次的值
- 惰性初始化：只创建一次的东西（第三方 SDK 实例）
- 什么情况下不该用 useRef

## 建议

- 仔细阅读每个示例的注释
- 尝试修改代码，观察变化
- 在浏览器中打开开发者工具，查看组件结构
- 动手实践是最好的学习方式！

## 项目发布上线

当你完成开发，想要把项目发布到互联网上让别人访问时，需要经过以下步骤：

### 开发 vs 发布的区别

**开发环境 (npm run dev)**
- Vite 启动开发服务器
- 代码实时编译，支持热更新
- 包含调试信息
- 文件没有压缩优化
- **只能在你的电脑上访问**

**生产环境 (发布上线)**
- 代码被打包成静态文件
- 文件被压缩优化
- 去掉调试信息
- **可以部署到服务器，让全世界访问**

### 发布流程

#### 1. 打包项目
```bash
npm run build
```

这个命令会：
- 把所有 JSX 转成普通 JS
- 把多个文件合并
- 压缩代码（去掉空格、注释，缩短变量名）
- 优化图片和资源
- 生成一个 `dist` 文件夹

#### 2. dist 文件夹的内容
```
dist/
├── index.html          # 入口 HTML
├── assets/
    ├── index-abc123.js   # 打包后的 JS（带哈希值）
    └── index-def456.css  # 打包后的 CSS
```

这些文件就是最终要上传到服务器的内容。

#### 3. 部署到服务器

有很多方式，常见的有：

**方式 1: 使用免费托管平台（推荐初学者）**
```bash
# Vercel (推荐，最简单)
npm install -g vercel
vercel

# Netlify
npm install -g netlify-cli
netlify deploy

# GitHub Pages
npm run build
# 把 dist 文件夹推送到 gh-pages 分支
```

**方式 2: 传统服务器**
```bash
# 1. 打包
npm run build

# 2. 把 dist 文件夹上传到服务器
# 可以用 FTP、SCP 等工具

# 3. 配置 Nginx 或 Apache 指向 dist 文件夹
```

**方式 3: 云服务**
- 阿里云 OSS
- 腾讯云 COS
- AWS S3

#### 4. 完整发布流程示例

```bash
# 1. 确保代码没问题
npm run dev  # 本地测试

# 2. 打包
npm run build

# 3. 预览打包后的效果（可选）
npm run preview  # 在本地预览生产版本

# 4. 部署（以 Vercel 为例）
vercel  # 或者推送到 GitHub，Vercel 自动部署
```

### 打包前后的对比

**开发时的代码 (src/App.jsx)**
```javascript
import Example01 from './examples/01-BasicComponent'

function App() {
  return (
    <div className="container">
      <h1>React 学习示例</h1>
      <Example01 />
    </div>
  )
}

export default App
```

**打包后的代码 (dist/assets/index-abc123.js)**
```javascript
// 被压缩成一行，变量名被缩短
(function(){const e=React.createElement;function t(){return e("div",{className:"container"},e("h1",null,"React 学习示例"))}...})()
```

### 为什么要打包

1. **性能优化** - 文件更小，加载更快
2. **兼容性** - 转换成所有浏览器都能运行的代码
3. **安全性** - 源代码被混淆，不容易被看懂
4. **合并文件** - 减少 HTTP 请求次数

### 类比理解

- **开发环境** = 厨房（你在这里做菜，可以随时调整）
- **打包** = 把菜装进外卖盒
- **部署** = 把外卖送到客户手里

开发时你需要 Vite 这个"厨房"，但客户（用户）只需要"外卖盒"（dist 文件夹）就能吃到菜（看到网页）。

### 实际操作建议（最简单的方式）

对于初学者，最简单的发布方式：

1. 把代码推送到 GitHub
2. 在 Vercel 或 Netlify 上连接你的 GitHub 仓库
3. 它们会自动检测到是 Vite 项目，自动打包和部署
4. 你会得到一个网址，比如 `your-project.vercel.app`
5. 以后每次推送代码，自动重新部署

## 前端代码是如何被访问的

当你访问一个网站时，**前端代码确实会被下载到你的浏览器**。

### 访问网站时发生了什么

```
你输入网址 www.example.com
    ↓
浏览器向服务器请求 index.html
    ↓
服务器返回 index.html（几 KB）
    ↓
浏览器解析 HTML，发现需要：
  - main.js (200 KB)
  - style.css (50 KB)
  - logo.png (30 KB)
    ↓
浏览器再次请求这些文件
    ↓
服务器返回所有文件
    ↓
浏览器执行 JS，渲染页面
    ↓
你看到完整的网页
```

### 验证一下

你可以打开任何网站，按 F12 打开开发者工具，切换到 **Network（网络）** 标签，刷新页面，你会看到：

```
index.html          5 KB
main.js           250 KB
style.css          45 KB
logo.png           30 KB
font.woff2         80 KB
...
```

所有这些文件都被下载到了你的浏览器。

### 前端 vs 后端的区别

**前端代码（会下载）**
- HTML、CSS、JavaScript
- 图片、字体等资源
- React 组件代码（打包后的 JS）
- **在用户的浏览器中运行**

**后端代码（不会下载）**
- Node.js、Python、Java 等服务器代码
- 数据库查询逻辑
- API 接口实现
- **在服务器上运行，用户看不到**

### 实际例子

比如一个登录页面：

**前端代码（会被下载）**
```javascript
// 这段代码在用户浏览器中运行
function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  const handleLogin = async () => {
    // 发送请求到后端
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  }
  
  return <form>...</form>
}
```

**后端代码（不会被下载）**
```javascript
// 这段代码在服务器上运行，用户看不到
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  // 查询数据库
  const user = db.query('SELECT * FROM users WHERE username = ?', username)
  // 验证密码
  if (checkPassword(password, user.password)) {
    res.json({ success: true })
  }
})
```

### 为什么要这样设计

**优点：**
- 前端代码下载一次，可以快速交互
- 减轻服务器压力（计算在用户浏览器进行）
- 用户体验好（不用每次点击都等服务器响应）

**缺点：**
- 前端代码可以被看到（所以不能放敏感信息）
- 首次加载可能较慢（需要下载所有代码）

### 安全问题

因为前端代码会被下载，所以：

**❌ 不能放在前端的：**
```javascript
// 危险！用户可以看到
const API_KEY = 'sk-1234567890abcdef'
const DATABASE_PASSWORD = 'admin123'
```

**✅ 应该放在后端的：**
```javascript
// 安全，在服务器上
const API_KEY = process.env.API_KEY
const db = connectDatabase(process.env.DB_PASSWORD)
```

### 浏览器缓存

为了提高速度，浏览器会缓存（保存）下载过的文件：

```
第一次访问：下载 500 KB
第二次访问：从缓存读取，0 KB 下载
```

这就是为什么第二次打开网站通常更快。

### 类比理解

- **前端代码** = 菜单和点餐机（给顾客用的，可以看到）
- **后端代码** = 厨房和配方（顾客看不到，只有厨师知道）

你去餐厅可以拿到菜单（前端），但看不到厨房里怎么做菜（后端）。

### React 项目的情况

你的 React 项目打包后：

```
dist/
├── index.html (5 KB)
└── assets/
    ├── index-abc123.js (200 KB)  ← 包含所有 React 组件代码
    └── index-def456.css (30 KB)
```

用户访问时，这些文件都会被下载到浏览器，然后 React 在浏览器中运行，渲染出页面。

所以是的，**前端代码都会被下载**，这是 Web 的基本工作原理！
