// ============================================
// 05 空值安全（strictNullChecks）
// ============================================
//
// 这是 TS 最有价值的功能，也是最容易让人觉得"啰嗦"的地方。
// 它解决的是 JS 里最经典的一类崩溃：
//
//   TypeError: Cannot read properties of undefined (reading 'name')
//
// 这类错误在 JS 里要跑到那一行才会炸，在 TS 里写的时候就被拦住了。

// ============================================
// 一、strict 模式下的规则
// ============================================
// null 和 undefined 不能赋给别的类型。它们各自算一种独立的类型。

// const name: string = null;
//   ❌ error TS2322: Type 'null' is not assignable to type 'string'.
// const name2: string = undefined;
//   ❌ error TS2322: Type 'undefined' is not assignable to type 'string'.

// 想允许空值，就必须**显式写出来**
let nickname: string | null = null;
nickname = "小明";                    // ✅
console.log("可空变量：", nickname);

// 换句话说：类型里没写 null，就保证一定不是 null。
// 这条规则让"可能为空"变成了类型系统的一部分，而不是靠脑子记。

// 对比一下 JS：
//   没有 strictNullChecks 时，string 类型其实包含了 null 和 undefined，
//   所以每个变量都可能是空的 —— 等于什么都没保证。
//   strict 打开后，string 才真正是"字符串"。

// ============================================
// 二、用之前先判断
// ============================================
// 和 04 里的 unknown 一样：可空的值，用之前必须先把空值排除掉。

function getLength(text: string | null): number {
  // console.log(text.length);
  //   ❌ error TS18047: 'text' is possibly 'null'.

  if (text === null) {
    return 0;
  }
  // 在这个 if 之后，TS 已经知道 text 不可能是 null 了
  return text.length;
}

console.log("\ngetLength(null) =", getLength(null));
console.log("getLength('hello') =", getLength("hello"));

// ============================================
// 三、可选链 ?.
// ============================================
// 用来安全地访问"可能是空的"东西。任何一环为空，整个表达式就是 undefined，
// 不会像 JS 那样直接抛 TypeError。

type Address = { city: string; street?: string };
type Person = { name: string; address?: Address };

const people: Person[] = [
  { name: "张三", address: { city: "北京", street: "长安街" } },
  { name: "李四", address: { city: "上海" } },
  { name: "王五" },   // 没有 address
];

console.log("\n--- 可选链 ---");
for (const person of people) {
  // 不用可选链的话要写一长串判断：
  //   person.address && person.address.street ? ... : "(未填写)"
  const street = person.address?.street ?? "(未填写)";
  console.log(`${person.name} 住在 ${person.address?.city ?? "(不知道)"} ${street}`);
}

// 可选链可以连着用，也可以用在方法调用和下标上：
//   obj?.a?.b?.c
//   obj.method?.()        ← 方法存在才调用
//   arr?.[0]              ← 用在数组下标上

// ============================================
// 四、空值合并 ?? —— 注意别和 || 搞混
// ============================================
// ?? 只在左边是 null 或 undefined 时才取右边。
// || 是在左边"假值"时就取右边 —— 而 0、""、false 都是假值。

const count = 0;
const text = "";
const enabled = false;

console.log("\n--- ?? 和 || 的区别 ---");
console.log("0  || 10 →", count || 10, "  ← 0 是假值，被换掉了（多半不是你想要的）");
console.log("0  ?? 10 →", count ?? 10, "   ← 0 不是空值，保留");
console.log('"" || "默认" →', text || "默认", "  ← 空字符串被换掉了");
console.log('"" ?? "默认" →', `"${text ?? "默认"}"`, " ← 空字符串保留");
console.log("false || true →", enabled || true, "  ← 被换掉了");
console.log("false ?? true →", enabled ?? true, "  ← 保留");

// 规则很简单：
//   要区分"没填"和"填了空值" → 用 ??
//   只是想要一个兜底值（空值也算空）→ 用 ||
//
// 表单和配置项里几乎总是该用 ??。写成 || 是实际项目里很常见的 bug。

// ============================================
// 五、可选属性 / 可选参数
// ============================================

type User = {
  name: string;
  age?: number;        // 可选属性：可能不存在
};

function introduce(user: User, greeting?: string): string {
  const hello = greeting ?? "你好";
  const ageText = user.age === undefined ? "年龄保密" : `${user.age} 岁`;
  return `${hello}，${user.name}（${ageText}）`;
}

console.log("\n--- 可选属性 / 可选参数 ---");
console.log(introduce({ name: "张三", age: 20 }));
console.log(introduce({ name: "李四" }));
console.log(introduce({ name: "王五" }, "早上好"));

// 注意 `age?: number` 和 `age: number | undefined` 的区别：
//   前者：这个属性**可以不写**
//   后者：这个属性必须写，但值可以是 undefined
// 前者更宽松，日常用它。

// ============================================
// 六、非空断言 ! —— 危险，尽量别用
// ============================================
// 在表达式后面加 ! 表示"我保证它不是空"，TS 就此闭嘴。
// 它不做任何运行时检查，只是让你绕过检查。

const maybeText: string | null = "确定有值";
const length = maybeText!.length;      // 我说了算 —— 但如果判断错了，运行时就崩
console.log("\n非空断言的结果：", length);
console.log("（这里安全是因为确实有值；换成 null 就会在运行时抛 TypeError）");

// 什么时候可以用：
//   TS 推断不出来，但你在逻辑上确信的地方。比如
//   `map.get(key)!` —— 你刚刚才 set 过这个 key。
// 什么时候不该用：
//   为了"让报错消失"。那样等于把类型错误推到了运行时，等于退回 JS。

// 更好的替代品（第 04 章会讲）：
//   判空后抛错、类型守卫、给个默认值 —— 都能让 TS 真正被说服。

// ============================================
// 小结
// ============================================
// - strict 下 null / undefined 不能赋给别的类型，要允许就得写进类型里
// - 用之前先判断，TS 会顺着你的判断自动收窄
// - ?. 安全访问，?? 提供默认值
// - ?? 和 || 的区别是：?? 只认 null/undefined，|| 把所有假值都算上
// - ! 是绕过检查，不是解决问题
//
// 和 C/C++ 对比：TS 没有"空引用"，但有 null 和 undefined。
// 这套规则相当于强制你检查每一个可能为空的指针 —— 只不过是在编译期。

console.log("\n—— 05-null-safety.ts 结束 ——");
