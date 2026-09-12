// ============================================
// 02 查找与修改 DOM
// ============================================
//
// DOM 是一棵对象树，节点之间是父子兄弟关系：
//
//   document
//     └─ html
//          ├─ head
//          └─ body
//               └─ main
//                    ├─ h1#demo-title
//                    └─ ...
//
// 对页面做的操作可以归成三类：
//   1. 找到节点          —— 只读查询：querySelector、children、parentElement
//   2. 改节点自身        —— textContent、classList、style、setAttribute
//   3. 改节点之间的关系  —— append、insertBefore、remove，也就是"增删移动"
//
// 第 3 类常被当成"新增/删除对象"，其实不是：DOM 的树结构本身就是节点上的
// parentNode / firstChild / nextSibling 这些指针，增删只是改这些指针。
// createElement 造出的只是一个"游离"的节点，之后挂上树、摘下来，都是同一批对象。
// 本文件第 4 节会具体演示这一点。
//
// 说明：下面用到了 addEventListener（事件监听）。它的细节在 03-events.html，
//       这里先把它当成"点了按钮就执行这个函数"来用。

// ============================================
// 1. 怎么找到元素
// ============================================

// 最常用：querySelector —— 用 CSS 选择器语法，返回第一个匹配的元素（找不到返回 null）
const fruitList = document.querySelector("#fruit-list");
const firstFruit = document.querySelector(".fruit");
const specialFruit = document.querySelector(".fruit.special");   // 同时满足两个 class

// 按 id 找：更直接，但只能按 id
const sameList = document.getElementById("fruit-list");

// 找多个：querySelectorAll —— 返回 NodeList，可以用 for...of / forEach
const allFruits = document.querySelectorAll(".fruit");

// 老 API：getElementsByClassName / getElementsByTagName
// 返回 HTMLCollection —— 它是"活的"：DOM 一变，它自己跟着变。第 4 节会看到这个差异。
const liveFruits = document.getElementsByClassName("fruit");

console.log("--- 1. 查找元素 ---");
console.log("querySelector('#fruit-list')：", fruitList);
console.log("querySelector('.fruit') 找到的是第一个：", firstFruit.textContent);
console.log("querySelector('.fruit.special')：", specialFruit.textContent);
console.log("querySelectorAll('.fruit').length：", allFruits.length);
console.log("两种写法拿到的是不是同一个元素？", sameList === fruitList);   // true

// NodeList 可以直接遍历
allFruits.forEach((li, index) => {
  console.log(`  第 ${index + 1} 个：${li.textContent}，data-color = ${li.dataset.color}`);
});

// 找不到元素时返回 null —— 后面所有操作都会抛错，所以要先判断
console.log("查一个不存在的元素：", document.querySelector("#does-not-exist"));

// ============================================
// 2. 读和写内容：textContent 与 innerHTML
// ============================================
//
//   读：el.textContent  → 元素里的纯文本（会去掉所有标签）
//   写：el.textContent = "..."  → 内容被当成纯文本（HTML 标签原样显示）
//       el.innerHTML   = "..."  → 内容被当成 HTML 解析后插入页面 ← 危险
//
// 这段字符串模拟"用户输入"。真实项目里它可能来自输入框、URL 参数、接口返回，
// 也就是任何你不完全信任的来源。

const userInput = `<img src="x" onerror="alert('看，这段字符串被当成代码执行了')"> 后面这段是普通文字`;

const htmlBox = document.querySelector("#inner-html-box");
const textBox = document.querySelector("#text-content-box");

document.querySelector("#btn-inject").addEventListener("click", () => {
  htmlBox.innerHTML = userInput;      // ❌ 字符串变成了真正的 HTML 元素，onerror 被执行
  textBox.textContent = userInput;    // ✅ 字符串就是字符串，原样显示

  console.log("innerHTML 写入后，里面那个 <img> 真的被浏览器创建并加载了：");
  console.log("  htmlBox.querySelector('img') =", htmlBox.querySelector("img"));
  console.log("  textBox.querySelector('img')  =", textBox.querySelector("img"), "（null，因为它只是文字）");
});

document.querySelector("#btn-clear-text").addEventListener("click", () => {
  htmlBox.textContent = "";
  textBox.textContent = "";
});

// 顺便认识另外两个：
//   el.innerText   —— 考虑 CSS 渲染结果（隐藏的元素会被排除），读取时可能触发重排，少用
//   el.insertAdjacentText / insertAdjacentHTML —— 在元素的四个方位插入内容

// ============================================
// 3. 改样式：优先换 class，而不是直接写 style
// ============================================
// classList 的常用方法：
//   add / remove / toggle / contains / replace
// toggle 返回切换后的状态，很适合"开/关"这类场景。

const styleBox = document.querySelector("#style-box");

document.querySelector("#btn-toggle-class").addEventListener("click", () => {
  const isOn = styleBox.classList.toggle("highlight");
  console.log("toggle('highlight') 返回：", isOn);
  console.log("  现在的 classList：", styleBox.classList.toString());
  console.log("  contains('highlight')：", styleBox.classList.contains("highlight"));
});

document.querySelector("#btn-set-style").addEventListener("click", () => {
  // 注意：JS 里属性名是驼峰写法，不是 CSS 里带横线的写法
  //   CSS: background-color  →  JS: backgroundColor
  styleBox.style.backgroundColor = "#ffe8e8";
  styleBox.style.borderColor = "#cf222e";
  styleBox.style.fontWeight = "bold";

  console.log("内联样式现在长这样：", styleBox.getAttribute("style"));
  console.log("（这些样式写死在元素上了，优先级很高，CSS 里的规则很难盖过它）");
});

document.querySelector("#btn-reset-style").addEventListener("click", () => {
  styleBox.removeAttribute("style");       // 一次清掉所有内联样式
  styleBox.classList.remove("highlight");
});

// ============================================
// 4. 创建、插入、删除节点
// ============================================
//   document.createElement("标签名")  创建元素（此时还不在页面上）
//   parent.append(child)              追加到末尾（也可以一次传多个）
//   parent.prepend(child)             插到最前面
//   parent.insertBefore(new, ref)     插到某个节点前面
//   el.remove()                       把自己从树上摘掉
//   parent.replaceChildren()          清空所有子节点

const dynamicList = document.querySelector("#dynamic-list");
let autoIndex = 0;

document.querySelector("#btn-add-item").addEventListener("click", () => {
  // 先各拿一份集合，再插入新节点，对比"静态快照"和"实时集合"的差别
  const snapshot = dynamicList.querySelectorAll(".created-item");    // NodeList：快照
  const live = dynamicList.getElementsByClassName("created-item");   // HTMLCollection：实时

  autoIndex += 1;

  const li = document.createElement("li");
  li.className = "created-item";
  li.textContent = `JS 创建的第 ${autoIndex} 条`;
  li.dataset.index = String(autoIndex);          // 会变成 HTML 上的 data-index
  li.title = "鼠标悬停可以看到这个提示";            // 直接写属性，比 setAttribute 顺手

  dynamicList.append(li);

  console.log(`--- 添加第 ${autoIndex} 条 ---`);
  console.log("插入前拿到的 querySelectorAll（静态）：", snapshot.length);
  console.log("插入前拿到的 getElementsByClassName（实时）：", live.length, "← 它跟着变了");
  console.log("新节点的 parentElement 是：", li.parentElement.id);
});

document.querySelector("#btn-remove-last").addEventListener("click", () => {
  const last = dynamicList.lastElementChild;
  if (!last) {
    console.log("列表已经空了，没有可删的。");
    return;
  }

  last.remove();
  console.log("已删除：", last.textContent);
  console.log("  但变量 last 仍然指向那个元素对象，只是它不在页面上了。");
  console.log("  这里和 C++ 的 delete 后指针悬空不同：JS 有垃圾回收，");
  console.log("  只要还有引用，对象就活着；没有任何引用之后才会被回收。");
});

document.querySelector("#btn-clear-items").addEventListener("click", () => {
  dynamicList.replaceChildren();
  autoIndex = 0;
});

// 顺便认识节点之间的关系属性：
console.log("--- 节点关系 ---");
console.log("第一个水果的父节点：", firstFruit.parentElement.id);
console.log("它的下一个兄弟：", firstFruit.nextElementSibling.textContent);
console.log("列表的所有子元素：", fruitList.children.length, "个");
console.log("注意区分：children 只有元素，childNodes 连换行和空格都算");

// ============================================
// 5. 属性与 dataset
// ============================================
//   el.getAttribute("href") / el.setAttribute("href", "...")
//   el.hasAttribute / el.removeAttribute
//
// 另外有一批标准属性直接映射成了 JS 属性，用起来更顺手：
//   el.id、el.className、el.href、el.src、el.value、el.checked、el.disabled

const link = document.querySelector("#link-demo");

console.log("--- 5. 属性 ---");
console.log("getAttribute('href') =", link.getAttribute("href"));
console.log("link.href =", link.href, "（浏览器返回的是补全后的绝对地址）");

// data-* 自定义属性：用来在 DOM 上"挂"自己的数据
//   HTML 里写 data-color="红"  →  JS 里读 el.dataset.color
//   命名规则：data-fruit-color → dataset.fruitColor（横线后面转驼峰）

const colorDisplay = document.querySelector("#color-display");

document.querySelector("#btn-change-data-color").addEventListener("click", () => {
  const colors = ["红", "黄", "紫", "绿", "蓝"];
  const next = colors[Math.floor(Math.random() * colors.length)];

  specialFruit.dataset.color = next;          // 写
  colorDisplay.textContent = next;

  console.log("写 dataset.color 之后，HTML 上的属性也同步变了：");
  console.log("  specialFruit.getAttribute('data-color') =", specialFruit.getAttribute("data-color"));
  console.log("  specialFruit.outerHTML =", specialFruit.outerHTML);
});

document.querySelector("#btn-toggle-disabled").addEventListener("click", () => {
  const target = document.querySelector("#btn-target-disable");
  target.disabled = !target.disabled;         // 标准属性有同名 JS 属性
  console.log("按钮 disabled =", target.disabled);
  console.log("  对应的 HTML 属性：hasAttribute('disabled') =", target.hasAttribute("disabled"));
});

// ============================================
// 小结
// ============================================
// 找元素 → 读/写内容 → 换 class 改样式 → 增删节点 → 读写属性
// 这套动作能做出任何界面。
//
// 但到第 4 节为止，页面的变化都是"我们手动去改某个节点"换来的。
// 元素一多，就很容易忘了同步 —— 删了数据忘了删 DOM，数据就和人看到的不一致了。
// 04-todo-app.html 会换一个思路解决这个问题。

console.log("--- 02-dom-manipulation.js 执行结束 ---");
