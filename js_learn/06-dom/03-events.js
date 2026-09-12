// ============================================
// 03 事件
// ============================================
//
// 事件模型可以理解成：浏览器在监听各种"发生了什么"，
// 一旦发生，就把所有登记过的处理函数挨个调用一遍，并把一个"事件对象"传给它们。
//
//   addEventListener("事件名", 处理函数)
//
// 处理函数就是一个普通函数，参数是事件对象 event，内容由浏览器填好：
//   event.type          事件名，比如 "click"
//   event.target        实际触发事件的元素
//   event.currentTarget 绑定监听器的元素（等价于处理函数里的 this）
//   event.preventDefault()  阻止默认行为
//   event.stopPropagation() 阻止向上冒泡
//
// ⚠️ 这个文件必须在浏览器里打开 03-events.html 才有输出，
//    光看代码不点按钮是看不出名堂的。

console.log("========== 03-events.js 已加载，开始操作页面吧 ==========");

// ============================================
// 1. addEventListener 与 onclick
// ============================================
// onclick 是"属性"，给同一个属性赋值两次，后一次会覆盖前一次。
// addEventListener 是"往列表里追加"，可以挂任意多个。

const onClickBtn = document.querySelector("#btn-onclick");
const listenerBtn = document.querySelector("#btn-listener");

onClickBtn.onclick = () => console.log("onclick 第一个处理函数");
onClickBtn.onclick = () => console.log("onclick 第二个处理函数（第一个被覆盖了，永远不会执行）");

listenerBtn.addEventListener("click", () => console.log("listener 第一个处理函数"));
listenerBtn.addEventListener("click", () => console.log("listener 第二个处理函数（两个都会执行）"));

// 所以结论是：一律用 addEventListener。
// 顺带一提，同一个元素、同一个事件名、同一个函数引用重复添加，只会生效一次。

// ============================================
// 2. 事件对象：target 与 currentTarget
// ============================================
// 事件冒泡：点在子元素上，事件会一层层往上"冒"给祖先元素。
// 所以监听器挂在父容器上，也能收到子元素被点的消息。

const targetDemo = document.querySelector("#target-demo");
const targetOutput = document.querySelector("#target-output");

targetDemo.addEventListener("click", (event) => {
  // 用 closest 把"实际点到的元素"换算成"我想操作的那个元素"
  const clickedButton = event.target.closest("button");
  const name = clickedButton ? clickedButton.dataset.name : "（不是按钮）";

  console.log("--- 2. 事件对象 ---");
  console.log("event.type          =", event.type);
  console.log("event.target        =", event.target);
  console.log("event.currentTarget =", event.currentTarget, "（永远是 #target-demo）");
  console.log("换算出的按钮：", name);

  targetOutput.textContent =
    `event.target 是 <${event.target.tagName.toLowerCase()}>` +
    `，event.currentTarget 是 <${event.currentTarget.tagName.toLowerCase()}>` +
    `，识别出的按钮：${name}`;
});

// ============================================
// 3. 事件委托
// ============================================
// 不用给每个 × 按钮单独挂监听器（也就不会因为新增元素而漏挂），
// 只在父级 <ul> 上挂一个，靠 event.target 判断用户点的是什么。

const tagList = document.querySelector("#tag-list");
const initialTags = ["HTML", "CSS", "JavaScript"];

tagList.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".tag__remove");

  if (removeBtn) {
    const tag = removeBtn.closest(".tag");
    console.log("删除标签：", tag.firstChild.textContent.trim());
    tag.remove();
    return;
  }

  const tag = event.target.closest(".tag");
  if (tag) {
    console.log("点到了标签本体：", tag.textContent.trim(), "（不是删除按钮）");
  }
});

document.querySelector("#btn-add-tag").addEventListener("click", () => {
  const names = ["Vue", "React", "Next.js", "Node.js", "TypeScript", "Vite"];
  const name = names[Math.floor(Math.random() * names.length)];

  const li = document.createElement("li");
  li.className = "tag";
  li.textContent = name + " ";

  const removeBtn = document.createElement("button");
  removeBtn.className = "tag__remove";
  removeBtn.title = "删除";
  removeBtn.textContent = "×";

  li.append(removeBtn);
  tagList.append(li);

  console.log("新增标签：", name, "—— 它没有自己的监听器，但照样能删（事件冒泡到 ul）");
});

document.querySelector("#btn-reset-tags").addEventListener("click", () => {
  tagList.replaceChildren();

  for (const name of initialTags) {
    const li = document.createElement("li");
    li.className = "tag";
    li.textContent = name + " ";

    const removeBtn = document.createElement("button");
    removeBtn.className = "tag__remove";
    removeBtn.title = "删除";
    removeBtn.textContent = "×";

    li.append(removeBtn);
    tagList.append(li);
  }

  console.log("标签已恢复");
});

// ============================================
// 4. 表单与 preventDefault
// ============================================

const form = document.querySelector("#signup-form");
const nameInput = document.querySelector("#signup-name");
const namePreview = document.querySelector("#name-preview");
const formOutput = document.querySelector("#form-output");

// input 事件：内容每变一次就触发，适合做实时预览
nameInput.addEventListener("input", (event) => {
  const value = event.target.value.trim();
  namePreview.textContent = value === "" ? "（还没有输入）" : value;
});

// submit 事件绑在 <form> 上，而不是提交按钮上 ——
// 因为"在输入框里按回车"也能提交表单，绑在按钮上就漏了。
form.addEventListener("submit", (event) => {
  // ↓↓↓ 试着把这行注释掉再提交一次，感受一下页面刷新
  event.preventDefault();

  // 读表单里的数据有两种方式：
  //   1. 直接读元素的 value
  //   2. 用 FormData 一次收走所有带 name 属性的字段（推荐）
  const formData = new FormData(form);

  console.log("--- 4. 表单提交 ---");
  console.log("input.value          =", nameInput.value);
  console.log("new FormData(form)   =", [...formData.entries()]);
  console.log("formData.get('name') =", formData.get("name"), "← 靠 HTML 里的 name 属性取值");

  formOutput.textContent = `提交成功（页面没有刷新）：name = ${formData.get("name")}`;
  form.reset();                                  // 清空表单
  namePreview.textContent = "（还没有输入）";
});

// 其他表单元素的取值方式，顺便记一下：
//   <input type="checkbox">  → el.checked   （布尔值，不是 value）
//   <input type="radio">     → el.checked，一组里只会有一个为 true
//   <select>                 → el.value     （选中项的 value）
//   <input type="file">      → el.files     （FileList）
//   <input type="number">    → el.value 是字符串，要 Number(el.value) 转换

// ============================================
// 5. 常用事件示例
// ============================================

const eventLog = document.querySelector("#event-demo-log");
const logLines = ["（按发生顺序记录，只保留最近 12 条）"];

function logEvent(name, detail = "") {
  const time = new Date().toLocaleTimeString();
  logLines.push(`[${time}] ${name.padEnd(11)} ${detail}`);
  if (logLines.length > 13) logLines.shift();
  eventLog.textContent = logLines.join("\n");
}

const demoInput = document.querySelector("#event-demo-input");

demoInput.addEventListener("input", (e) => logEvent("input", `value="${e.target.value}"`));
demoInput.addEventListener("change", (e) => logEvent("change", `value="${e.target.value}"（值定了）`));
demoInput.addEventListener("focus", () => logEvent("focus"));
demoInput.addEventListener("blur", () => logEvent("blur"));
demoInput.addEventListener("keydown", (e) => {
  logEvent("keydown", `key="${e.key}" code="${e.code}"`);
  if (e.key === "Enter") logEvent("→ 回车", "表单里按回车会触发 submit");
});

const hoverBtn = document.querySelector("#event-demo-hover");
// mouseenter / mouseleave 不冒泡，所以只能直接绑在元素上，没法用委托
hoverBtn.addEventListener("mouseenter", () => logEvent("mouseenter"));
hoverBtn.addEventListener("mouseleave", () => logEvent("mouseleave"));

// ============================================
// 6. 取消监听
// ============================================
// removeEventListener 必须传"同一个函数引用"。
// 下面这个 handleOnce 是具名函数，所以能引用到它自己；
// 如果写成 addEventListener("click", () => {...})，那个匿名函数就再也拿不到了。

const onceBtn = document.querySelector("#btn-count-once");
let clickCount = 0;

function handleOnce(event) {
  clickCount += 1;
  console.log(`按钮第 ${clickCount} 次被点击 → 立刻注销自己，之后就只响应这一次`);

  event.currentTarget.removeEventListener("click", handleOnce);
  onceBtn.textContent = "已失效（再点没反应）";
  onceBtn.disabled = true;   // 视觉效果上也关掉
}

onceBtn.addEventListener("click", handleOnce);

document.querySelector("#btn-restore-once").addEventListener("click", () => {
  clickCount = 0;
  onceBtn.textContent = "这个按钮只响应一次";
  onceBtn.disabled = false;
  onceBtn.addEventListener("click", handleOnce);
  console.log("已恢复");
});

// 上面这种"只执行一次"的需求，现代写法有个更简单的选项：
//   el.addEventListener("click", handler, { once: true });
// 浏览器执行一次后会自动注销，省掉了手动 removeEventListener。

// ============================================
// 小结
// ============================================
// 找元素（02） + 监听事件（03） = 页面能对用户做出反应。
// 到现在为止，还差最后一环：数据一多，"手动改 DOM"就会变成负担。
// 04-todo-app.html 用一个小应用把前面所有东西串起来。

console.log("========== 03-events.js 执行结束 ==========");
