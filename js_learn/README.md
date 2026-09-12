                    JavaScript / TypeScript
                              │
                    ┌─────────┴─────────┐
                    │                   │
                  React               其他方案
                    │
                 Next.js
                    │
                 Web 应用
                    │
              ──────┼──────
                    │
                 Electron
                    │
              桌面应用
          ┌─────────┼─────────┐
          │         │         │
        macOS     Windows    Linux

# JavaScript 学习路径

## 从 C/C++ 到 JavaScript

### 主要区别
- **动态类型**：不需要声明变量类型
- **解释执行**：无需编译，直接运行
- **原型继承**：不同于 C++ 的类继承
- **异步编程**：Promise、async/await
- **垃圾回收**：自动内存管理

### 学习顺序
1. 基础语法 (01-basics/)
2. 函数与作用域 (02-functions/)
3. 对象与数组 (03-objects-arrays/)
4. 现代 JS 特性 (04-modern-js/)
5. 异步编程 (05-async/)
6. HTML 与 JS 配合 (06-dom/)
7. 练习题 (exercises/)

### 运行方式
```bash
# 第 1～5 章：纯 JS，用 Node.js 运行
node js_learn/01-basics/01-variables.js

# 第 6 章：JS 操作页面，必须用浏览器打开 .html
# 直接双击，或：
open js_learn/06-dom/01-hello-script.html
# 然后按 F12 / Cmd+Option+I 打开 DevTools，看 Console 面板
```

前 5 章只讲 JS 语言本身，`console.log` 打在终端里；第 6 章开始接触页面，
`console.log` 打在浏览器 DevTools 里。**两者的输出位置不同，别找错地方。**

### 像 GDB 一样调试 Node.js

Node.js 自带命令行调试器，可以在终端中设置断点、单步执行、查看调用栈和变量。它的使用方式与 GDB 比较接近。

以异步回调示例为例，在仓库根目录执行：

```bash
node inspect js_learn/05-async/01-callbacks.js
```

调试器会在第一条可执行语句之前暂停，并显示 `debug>` 提示符。

#### 常用命令

| Node.js 调试命令 | 简写 | 类似的 GDB 命令 | 作用 |
|---|---|---|---|
| `cont` | `c` | `continue` | 继续运行到下一个断点 |
| `next` | `n` | `next` | 执行下一行，不进入函数内部 |
| `step` | `s` | `step` | 执行下一步，进入函数内部 |
| `out` | `o` | `finish` | 跳出当前函数 |
| `backtrace` | `bt` | `bt` | 查看当前调用栈 |
| `list(10)` | | `list` | 查看当前位置附近的源代码 |
| `setBreakpoint(21)` | `sb(21)` | `break 21` | 在指定行设置断点 |
| `clearBreakpoint(...)` | `cb(...)` | `clear` | 删除断点 |
| `breakpoints` | | `info breakpoints` | 查看所有断点 |
| `watch("data")` | | `display data` | 添加监视表达式 |
| `watchers` | | `display` | 查看所有监视表达式的值 |
| `repl` | | `print` | 进入表达式检查环境 |
| `restart` | `r` | `run` | 重新运行当前脚本 |
| `kill` | | `kill` | 终止当前脚本 |
| `help` | | `help` | 查看调试器帮助 |

#### 设置断点并运行

进入调试器后，可以在同步代码和异步回调内部设置断点：

```text
debug> sb(6)
debug> sb(9)
debug> sb(22)
debug> sb(37)
debug> sb(44)
debug> sb(51)
debug> sb(65)
debug> c
```

行号会随着文件修改而变化。如果断点没有落在可执行语句上，调试器可能把它移动到附近可以暂停的位置。

程序暂停后，可以查看附近代码、调用栈并单步执行：

```text
debug> list(5)
debug> bt
debug> n
debug> s
debug> c
```

#### 查看变量和表达式

使用 `repl` 进入表达式检查环境：

```text
debug> repl
> new Date().toISOString()
> data
```

在 REPL 中按 `Ctrl+C` 可以返回 `debug>` 提示符。变量必须存在于当前暂停位置的作用域中，否则会得到未定义错误。

也可以提前监视一个表达式：

```text
debug> watch("data")
debug> watchers
```

#### 调试异步回调

对下面的代码执行 `next` 时，Node.js 只会注册定时器，不会等待一秒并立即进入回调：

```javascript
setTimeout(() => {
  console.log("定时器执行");
}, 1000);
```

要调试回调，应在回调函数内部设置断点，然后执行 `cont`：

```text
debug> sb(回调内部的行号)
debug> c
```

同步代码执行完后，只要还有定时器、网络连接或其他待处理任务，Node.js 进程就不会退出。定时器到期后，事件循环会调用回调，并命中回调内部的断点。

此时执行：

```text
debug> bt
```

看到的是当前异步回调的调用栈，而不是最初注册定时器时的同步调用栈。这可以帮助理解同步执行、事件循环和异步回调之间的关系。

#### 在代码中主动设置断点

也可以在代码中加入 `debugger` 语句：

```javascript
console.log("开始");

debugger;

console.log("继续执行");
```

使用 `node inspect` 或其他调试器运行时，程序会在 `debugger` 处暂停。正常使用 `node filename.js` 运行时，`debugger` 不会产生暂停效果。

## 为什么 Node.js 可以运行 JS 文件

### 核心组件

**V8 引擎**
- Node.js 使用 Google 开发的 V8 引擎（Chrome 浏览器用的同一个引擎）
- V8 负责解析和执行 JavaScript 代码，将 JS 转换成机器码

**运行时环境**
- Node.js 在 V8 之上添加了额外的 API 和功能
- 提供了文件系统访问（`fs`）、网络操作（`http`）、进程管理等浏览器中没有的能力

### 与浏览器的区别

```javascript
// 浏览器环境
console.log(window);     // ✓ 可用
console.log(document);   // ✓ 可用
console.log(process);    // ✗ 不存在

// Node.js 环境
console.log(global);     // ✓ 可用
console.log(process);    // ✓ 可用
console.log(window);     // ✗ 不存在
console.log(document);   // ✗ 不存在
```

### 简单类比

- **浏览器** = V8 引擎 + Web APIs（DOM、fetch、localStorage 等）
- **Node.js** = V8 引擎 + Node APIs（fs、http、path 等）

两者都能运行 JavaScript，但提供的运行环境不同。Node.js 让 JS 脱离了浏览器，可以用来开发服务器、命令行工具、桌面应用等。
