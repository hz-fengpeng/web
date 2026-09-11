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
1. 基础语法 (basics/)
2. 函数与作用域 (functions/)
3. 对象与数组 (objects-arrays/)
4. 现代 JS 特性 (modern-js/)
5. 异步编程 (async/)
6. 练习题 (exercises/)

### 运行方式
```bash
# 使用 Node.js 运行
node filename.js

# 或在浏览器控制台中运行
```

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
