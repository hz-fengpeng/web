// ============================================
// 01 第一个脚本：JS 如何与 HTML 配合
// ============================================
//
// 加载方式： <script src="01-hello-script.js" defer></script>
// defer 保证脚本执行时 DOM 已经构建完成，可以放心地查询和修改元素。
//
// 怎么运行：
//   用浏览器打开 01-hello-script.html，
//   按 F12 / Cmd+Option+I 打开 DevTools，看 Console 面板。
//   这个文件用 `node 01-hello-script.js` 跑会直接报错 —— 下面会解释为什么。

console.log("========== 01-hello-script.js 开始执行 ==========");

// ============================================
// 1. 按 id 找到元素，然后修改它
// ============================================
// HTML 里的 id / class 就是留给 JS 的"钩子"。
// JS 靠选择器把元素找出来，找到之后它就是一个普通对象，
// 可以读属性、调方法 —— 改造它就等于改造页面。

const title = document.querySelector("#demo-title");
console.log("找到的标题元素：", title);
console.log("它当前的文字：", title.textContent);

title.textContent = "01 第一个脚本（这行字是 JS 改的）";

const intro = document.querySelector("#intro");
const now = new Date().toLocaleTimeString();
intro.textContent = `这段文字是 ${now} 由 01-hello-script.js 写入的。`;

// 顺带一提：也可以改标签页上的标题
// document.title = "01 第一个脚本 | 已由 JS 更新";

// ============================================
// 2. 浏览器环境 vs Node 环境
// ============================================
// 同一份 JS 语法，两种环境能拿到的东西不一样：
//   浏览器 = V8 + Web API（DOM、fetch、localStorage……）
//   Node   = V8 + Node API（fs、http、process……）
//
// 用一个具体的检查来感受：下面这些名字，哪些存在？
//
// 注意这里为什么写 globalThis[name] 而不是直接写那个变量名：
// 直接使用一个根本不存在的变量会抛 ReferenceError，程序就中断了；
// 而 typeof 一个不存在的变量是安全的，只会返回 "undefined"。
// （回顾 01-basics/05-understanding-undefined.js）

const names = [
  // 浏览器给的
  "window", "document", "navigator", "location", "localStorage", "fetch", "setTimeout",
  // Node 给的
  "process", "require", "module", "__dirname", "Buffer",
];

const envList = document.querySelector("#env-list");
let missingCount = 0;

for (const name of names) {
  const type = typeof globalThis[name];
  if (type === "undefined") missingCount += 1;

  const li = document.createElement("li");
  li.className = "env-item";
  if (type === "undefined") li.classList.add("env-item--missing");

  const code = document.createElement("code");
  code.textContent = name;

  // append 可以一次塞进去多个节点或字符串
  li.append(code, " → typeof 结果是 " + type);
  envList.append(li);
}

console.log("本次检查中不存在的名字有", missingCount, "个（红色那几行）");

document.querySelector("#env-note").textContent =
  `${names.length} 个名字里有 ${missingCount} 个不存在。` +
  "window、document、localStorage 是浏览器给的；" +
  "process、require、__dirname 是 Node 给的。" +
  "在 HTML 页面里写 const fs = require('fs') 会直接报错，因为浏览器里没有 require。";

// 想直接看 window 上到底有多少东西，可以在 Console 里输入 window 回车。
console.log("window 上一共有", Object.keys(window).length, "个可枚举属性");
console.log("浏览器给当前页面的标识：", navigator.userAgent);

// ============================================
// 3. console 的几种用法
// ============================================
// 都输出到 DevTools Console，不是终端。

console.log("log：最常用，打印普通信息");
console.info("info：信息（多数浏览器里和 log 长得一样）");
console.warn("warn：警告，带黄色图标");
console.error("error：错误，带红色图标");

// 表格：适合打印一批结构相同的对象
console.table([
  { 声明方式: "let", 作用域: "块级", 可重新赋值: "是" },
  { 声明方式: "const", 作用域: "块级", 可重新赋值: "否" },
  { 声明方式: "var", 作用域: "函数", 可重新赋值: "是" },
]);

// %c 占位符：Console 支持一小部分 CSS
console.log("%c这行日志有颜色", "color: #2563eb; font-weight: bold; font-size: 14px");

// 一个常见的坑：打印对象时看到的是"引用"，不是当时的快照
const snapshotDemo = { count: 0 };
console.log("打印对象（点开三角看，显示的会是修改后的值）：", snapshotDemo);
snapshotDemo.count = 1;
console.log("想看当时的值，用 JSON.stringify：", JSON.stringify({ count: 0 }));

// ============================================
// 4. 小结：一次完整的"配合"
// ============================================
//   HTML：  <h1 id="demo-title">、<p id="intro">、<ul id="env-list">
//               ↓  提供"钩子"
//   JS：    document.querySelector("#demo-title")  → 拿到元素对象
//               ↓  修改它的属性
//   页面：  浏览器立刻重绘
//
// 整个过程没有"重新加载页面"。DOM 本身就是一棵随时可以被改的对象树，
// 这就是所谓"动态网页"的起点。

console.log("========== 01-hello-script.js 执行结束 ==========");
