// ============================================
// 04 综合示例：待办清单
// ============================================
//
// 核心思想（也是 React 的核心思想）：
//
//      界面 = f(数据)
//
// 不要"点了按钮就去某一行 DOM 上改文字"，而是：
//   1. 数据（todos 数组）是唯一的真相来源
//   2. 数据一变，就调用 render() 把界面整个重画一遍
//   3. 所有交互只做一件事：修改数据
//
// 这样界面永远和数据一致，不会出现"删了数据但忘了删 DOM"的 bug。

const STORAGE_KEY = "js-learn-todos";

// ============================================
// 1. 数据层：只管数据，不碰 DOM
// ============================================

const DEFAULT_TODOS = [
  { id: 1, text: "打开 DevTools 看这份文件的 console 输出", done: true },
  { id: 2, text: "把它改成你自己的待办", done: false },
];

let todos = loadTodos();
let filter = "all";   // all | active | done

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [...DEFAULT_TODOS];
    const parsed = JSON.parse(raw);
    // 存进去的永远是字符串，取出来要检查一下是不是我们想要的结构
    return Array.isArray(parsed) ? parsed : [...DEFAULT_TODOS];
  } catch (error) {
    // 有的浏览器会限制 file:// 页面使用 localStorage，这里兜底，不影响功能
    console.warn("读取 localStorage 失败，使用默认数据：", error.message);
    return [...DEFAULT_TODOS];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.warn("写入 localStorage 失败：", error.message);
  }
}

// ============================================
// 2. 元素引用：启动时查一次，之后一直用这几个变量
// ============================================
// 不要每次用到都去 querySelector 一遍 —— 除了慢，更重要的是
// "元素是什么"只由 HTML 决定，查一次就够了。

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const empty = document.querySelector("#todo-empty");
const count = document.querySelector("#todo-count");
const filterBar = document.querySelector(".filters");
const clearDoneBtn = document.querySelector("#todo-clear-done");
const resetBtn = document.querySelector("#todo-reset");

// ============================================
// 3. 渲染：数据 → 界面
// ============================================
// 每次调用都从零重建整个列表。简单、可预测，不用记住"上次画到哪了"。

function render() {
  // 3.1 按当前筛选条件挑出要显示的条目
  const visible = todos.filter((todo) => {
    if (filter === "active") return !todo.done;
    if (filter === "done") return todo.done;
    return true;
  });

  // 3.2 清空列表，重新构建
  //     条目成千上万时才会考虑增量更新 —— 那是框架帮你做的事。
  list.replaceChildren();

  for (const todo of visible) {
    const li = document.createElement("li");
    li.className = todo.done ? "todo-item todo-item--done" : "todo-item";
    li.dataset.id = String(todo.id);   // 把 id 记在 DOM 上，事件里靠它找回数据

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.dataset.action = "toggle";

    const text = document.createElement("span");
    text.className = "todo-text";
    // 用 textContent：用户输入的内容永远不会被当成 HTML 执行（回顾 02）
    text.textContent = todo.text;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";   // 不写的话，放在 <form> 里的按钮默认是 submit
    removeBtn.className = "todo-remove";
    removeBtn.dataset.action = "remove";
    removeBtn.textContent = "删除";

    li.append(checkbox, text, removeBtn);
    list.append(li);
  }

  // 3.3 空状态与统计
  empty.hidden = visible.length > 0;
  const remaining = todos.filter((todo) => !todo.done).length;
  count.textContent = `共 ${todos.length} 条，未完成 ${remaining} 条`;
}

// ============================================
// 4. 事件层：只负责改数据，改完重画
// ============================================

// 4.1 添加
form.addEventListener("submit", (event) => {
  // 不写这句，浏览器会提交表单并刷新整个页面，前面做的全白费（回顾 03）
  event.preventDefault();

  const text = input.value.trim();
  if (text === "") return;

  todos.push({ id: Date.now(), text: text, done: false });
  input.value = "";
  input.focus();

  saveTodos();
  render();
});

// 4.2 勾选 / 删除 —— 事件委托：
//     一个监听器管住所有条目，包括 render() 之后新增的那些
list.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (!action) return;

  const item = event.target.closest(".todo-item");
  const id = Number(item.dataset.id);          // dataset 读出来是字符串，转回数字
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  if (action === "toggle") {
    todo.done = event.target.checked;          // checkbox 的取值看 checked，不是 value
  } else if (action === "remove") {
    todos = todos.filter((t) => t.id !== id);
  }

  saveTodos();
  render();
});

// 4.3 切换筛选
filterBar.addEventListener("click", (event) => {
  const next = event.target.dataset.filter;
  if (!next) return;

  filter = next;

  for (const btn of filterBar.querySelectorAll(".filter-btn")) {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  }

  render();   // 筛选只是换了个"看数据的方式"，数据本身没变
});

// 4.4 清除已完成
clearDoneBtn.addEventListener("click", () => {
  const removed = todos.length - todos.filter((t) => !t.done).length;
  if (removed === 0) {
    console.log("没有已完成的条目可清除");
    return;
  }

  todos = todos.filter((todo) => !todo.done);
  console.log(`清除了 ${removed} 条已完成`);
  saveTodos();
  render();
});

// 4.5 恢复默认数据
resetBtn.addEventListener("click", () => {
  todos = [...DEFAULT_TODOS];
  saveTodos();
  render();
  console.log("已恢复默认数据");
});

// ============================================
// 5. 启动
// ============================================
// 只要数据准备好了，render() 一调，界面就有了。
// 界面上没有"初始化时手动摆 DOM"的代码 —— 全在 render 里。

render();

console.log("待办清单已启动，当前数据：", todos);

// ============================================
// 动手改一改
// ============================================
// 1. 给每条待办加一个"编辑"按钮：点一下把 span 换成 input，改完写回数据
//    （提示：需要一个 editingId 变量记录"哪一条正在编辑"，render 里判断它）
// 2. 给待办加优先级（高/中/低）和排序，数据里加一个 priority 字段
// 3. 把"筛选"做成 URL 的一部分（location.hash = "done"），刷新后还能保持
// 4. 用 console.log 观察：每次 render() 是不是把整个列表都重建了？
//    在 render 里打印 visible.length 就知道了。

console.log("========== 04-todo-app.js 执行结束 ==========");
