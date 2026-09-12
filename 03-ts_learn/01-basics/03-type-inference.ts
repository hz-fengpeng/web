// ============================================
// 03 类型推断：什么时候不用手写类型
// ============================================
//
// TS 会自己猜类型。大部分时候不用写标注，写太多反而是坏味道
// —— 把显而易见的类型再抄一遍，只会让代码变啰嗦。
//
// 规则很简单：**能从右边看出来，就不用写。**
//   const age: number = 20;   // ← 多余，右边明摆着是数字
//   const age = 20;           // ← 同样清楚
//
// 类比 C++ 的 auto：
//   auto count = 0;           // C++ 从初始值推断
//   const count = 0;          // TS 也是一样

// ============================================
// 一、基础推断
// ============================================

const count = 42;             // 推断成 number
const title = "学习 TS";       // 推断成 string
const done = false;           // 推断成 boolean
const list = [1, 2, 3];       // 推断成 number[]

console.log("推断出来的类型，可以直接验证：");
console.log("count:", count, " title:", title, " done:", done, " list:", list);

// 想确认 TS 到底推断成了什么，把鼠标悬停在变量上（编辑器会显示），
// 或者故意赋一个错的值，看报错信息里写着什么类型：
// const wrong: string = count;
//   ❌ error TS2322: Type 'number' is not assignable to type 'string'.
//      ↑ 这句话就是 TS 在告诉你：count 的类型是 number

// ============================================
// 二、let 和 const 推断出的类型不一样！
// ============================================
// 这是 TS 里一个很容易忽略的细节。

let mutable = 1;      // 推断成 number
const immutable = 1;  // 推断成 1 ← 字面量类型，不是 number

// 为什么？因为 let 可以被改，TS 只能保守地认为"它是任何数字"；
// 而 const 永远不会变，TS 就精确地知道"它只能是 1"。

type One = 1;

const ok1: One = immutable;   // ✅ immutable 的类型就是 1
// const ok2: One = mutable;
//   ❌ error TS2322: Type 'number' is not assignable to type '1'.
//       ↑ number 是"所有数字"，范围比 1 大，所以不能赋给它

console.log("\nconst 推断成字面量类型：", immutable, "（类型是 1，不是 number）");

// 这个特性在配合"字面量类型"和联合类型时非常有用（见 03-objects/03）。

// ============================================
// 三、对象属性的推断
// ============================================
// 对象里的属性**不会**被推断成字面量，因为属性是可以改的

const user = { name: "张三", age: 20 };   // 推断成 { name: string; age: number }

user.name = "李四";                       // ✅ 可以改成别的字符串
// user.name = 1;
//   ❌ error TS2322: Type 'number' is not assignable to type 'string'.
// user.gender = "男";
//   ❌ error TS2339: Property 'gender' does not exist on type '{ name: string; age: number; }'.

console.log("对象推断：", user);

// 想让它推成字面量、并且只读，用 as const（等价于 C++ 的 constexpr + 只读）
const config = {
  host: "localhost",
  port: 8000,
} as const;
// config 的类型是 { readonly host: "localhost"; readonly port: 8000; }

console.log("as const 之后：", config.host, config.port);
// config.port = 3000;
//   ❌ error TS2540: Cannot assign to 'port' because it is a read-only property.

// ============================================
// 四、函数返回值的推断
// ============================================

// 返回值能推断出来，通常不用写
function add(a: number, b: number) {
  return a + b;              // 推断返回 number
}

// 但**参数**必须写。不写就是隐式 any，strict 模式下直接报错：
// function addBad(a, b) { return a + b; }
//   ❌ error TS7006: Parameter 'a' implicitly has an 'any' type.

// 参数为什么必须写？因为 TS 只看函数体是猜不出来的 ——
// 函数体里 a 和 b 干什么都行，类型信息只能由调用方和声明方约定。
// 这一点和 C++ 不同：C++ 的模板函数能从调用处反推类型。

console.log("\n函数返回值推断：add(1, 2) =", add(1, 2));

// 复杂函数的返回值建议显式写出来，好处是：
//   1. 报错会出现在函数内部（写错的地方），而不是所有调用处
//   2. 相当于给函数写了文档
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("除数不能为 0");
  return a / b;
}
console.log("divide(10, 2) =", divide(10, 2));

// ============================================
// 五、什么时候必须手写类型
// ============================================
// 只有这几种情况：

// 1. 函数参数（见上）
function greet(name: string): string {
  return `你好，${name}`;
}

// 2. 变量初始值是 null / undefined（TS 猜不出来你以后想放什么）
let current: string | null = null;

// 3. 空数组 / 空对象（推断不出元素类型）
const items: string[] = [];
// const items2 = [];   // ⚠️ 会被推断成 any[]，然后随着 push 演化成 string[]
items.push("张三");      // 显式标注之后这里是安全的

// 4. 你希望类型比推断结果"更宽"或"更窄"时
//    比如希望它是 string 而不是字面量，或者反过来

// 5. 函数的返回值（上面说过，为了报错位置更准）

console.log("\n必须手写的场景也都跑通了：", greet("张三"), current, items);

// ============================================
// 小结
// ============================================
// - 能推断就推断，别把类型抄两遍
// - let 推断成"宽类型"，const 推断成"字面量类型"
// - 对象属性不推成字面量；要字面量 + 只读就用 as const
// - 函数参数必须写；返回值可写可不写，建议写
// - 空数组、null 初始化必须写

console.log("\n—— 03-type-inference.ts 结束 ——");
