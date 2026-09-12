// ============================================
// 01 函数的类型
// ============================================

// ============================================
// 一、参数和返回值
// ============================================
// 参数**必须**写类型（不写就是隐式 any，strict 下报错），
// 返回值可以推断，但建议写出来 —— 报错会出现在函数内部而不是调用处。

function add(a: number, b: number): number {
  return a + b;
}
console.log("add(1, 2) =", add(1, 2));

// 再看一遍这个对比，它是 04 章那个错误信息的来源：
// function addBad(a, b) { return a + b; }
//   ❌ error TS7006: Parameter 'a' implicitly has an 'any' type.
//      error TS7006: Parameter 'b' implicitly has an 'any' type.

// ============================================
// 二、可选参数、默认值、剩余参数
// ============================================

// 可选参数：在名字后面加 ?
// 规则：可选参数必须排在必选参数**后面**
function greet(name: string, title?: string): string {
  return title === undefined ? `你好，${name}` : `你好，${title}${name}`;
}
console.log(greet("张三"));
console.log(greet("张三", "王"));

// function bad(title?: string, name: string) {}
//   ❌ error TS1016: A required parameter cannot follow an optional parameter.

// 默认值：不传就用默认值。有默认值的参数自动变成"可选的"
function power(base: number, exponent: number = 2): number {
  return base ** exponent;
}
console.log("\npower(3) =", power(3), " power(3, 3) =", power(3, 3));

// 剩余参数：收集成数组，必须是最后一个参数
// 对应 C/C++ 的可变参数，但这里是有类型的
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log("sum(1,2,3,4) =", sum(1, 2, 3, 4));

// C++ 的可变参数对比：
//   template <typename... Args> int sum(Args... args);   ← 类型各不相同的包
//   TS 的 ...numbers: number[]                            ← 全部同一类型

// ============================================
// 三、函数也是一种类型
// ============================================
// 这是 TS 里非常重要的一节：函数可以像值一样被传来传去，
// 所以也需要一个类型来描述"它长什么样"。

// 语法： (参数类型) => 返回值类型
type MathOp = (a: number, b: number) => number;

// 对比 C/C++：
//   int (*op)(int, int);                 ← C 的函数指针
//   std::function<int(int, int)> op;     ← C++11
//   type MathOp = (a: number, b: number) => number;   ← TS

const plus: MathOp = (a, b) => a + b;      // 参数类型可以省略，会从 MathOp 推断出来
const minus: MathOp = (a, b) => a - b;

function calculate(a: number, b: number, op: MathOp): number {
  return op(a, b);
}

console.log("\n--- 函数类型 ---");
console.log("calculate(10, 3, plus)  =", calculate(10, 3, plus));
console.log("calculate(10, 3, minus) =", calculate(10, 3, minus));
console.log("也可以直接传匿名函数：", calculate(10, 3, (a, b) => a * b));

// 传一个签名不匹配的函数会被拦住：
// console.log(calculate(10, 3, (a: string, b: string) => a + b));
//   ❌ error TS2345: Argument of type '(a: string, b: string) => string' is not assignable
//      to parameter of type 'MathOp'.

// 注意箭头函数里的 `=>` 有两个身份，别搞混：
//   类型里的 =>  ：描述"参数 → 返回值"，上面 MathOp 就是这个
//   值里的   =>  ：定义函数本身
//   `type F = (a: number) => number` 里没有函数，只是描述形状。

// ============================================
// 四、回调函数
// ============================================
// 回调就是"把函数当参数传进去"。类型写在参数位置上。

function processItems(items: string[], callback: (item: string, index: number) => void): void {
  items.forEach((item, index) => callback(item, index));
}

console.log("\n--- 回调 ---");
processItems(["苹果", "香蕉", "葡萄"], (item, index) => {
  console.log(`  第 ${index + 1} 个：${item}`);
});

// 一个实用的技巧：回调的参数类型往往不用自己写。
// TS 已经知道 forEach 的回调该长什么样，所以这里 item、index 都能自动推断出来：
[1, 2, 3].forEach((n) => console.log("  自动推断出的 n：", n));

// ============================================
// 五、两个容易困惑的点
// ============================================

// 1. 参数少的函数可以赋给参数多的类型
//    因为传多余的参数本来就是安全的（JS 里多传的参数会被忽略）
const takesTwo: (a: number, b: number) => number = (a) => a;
console.log("\n参数少的函数可以兼容：", takesTwo(1, 2));

// 2. 返回值是 void 的类型，可以接受"有返回值"的函数
//    因为调用方声明了"我不看返回值"，你返回什么是你的事
const noReturn: (a: number) => void = (a) => a * 2;
noReturn(1);
console.log("返回值 void 的类型，也接受有返回值的函数");

// ============================================
// 小结
// ============================================
// - 参数必须标类型，返回值建议标
// - 可选参数 ? 必须在必选参数后面；有默认值的参数自动可选
// - 函数类型写成 (参数) => 返回值，对应 C 的函数指针 / C++ 的 std::function
// - 回调的类型写在参数位置，很多时候能靠上下文推断，不用手写

console.log("\n—— 02-functions/01-function-types.ts 结束 ——");
