// ============================================
// 04 any / unknown / never / void
// ============================================
//
// 这四个是 TS 里的"特殊类型"，理解它们的区别比记住语法重要得多。
//
//   类型      含义                        C/C++ 里最接近的东西
//   --------  --------------------------  ------------------------
//   any       关掉检查，什么都能干          void*（但更危险）
//   unknown   什么都有可能，但用之前必须检查 void*（安全版）
//   never     永远不会有值                [[noreturn]] 函数
//   void      有返回值，但值是 undefined   void

// ============================================
// 一、any —— 关掉类型检查
// ============================================
// any 的意思是"别管我"。TS 会放弃对它的所有检查。
//
// 它是 JS 迁移到 TS 的过渡工具，不是日常写法。
// 项目里 any 越多，TS 能帮你挡住的错就越少 —— 用多了等于没上 TS。

const anything: any = "你好";

console.log("any 可以随便调用方法：", anything.toUpperCase());
console.log("any 可以访问不存在的属性（TS 不拦）：", anything.notExist);

// any 最危险的地方是它会**传染**：any 参与运算，结果还是 any，
// 检查会一路失效到很远的地方。
//
//   function add(a: any, b: any): any { return a + b; }
//   const result = add(1, "2");    // ✅ TS 不拦
//   result.toFixed(2);             // ✅ TS 也不拦 —— 但运行时会崩
//
// 真跑一下：
//   node -e "console.log((1 + '2').toFixed(2))"
//   → TypeError: (1 + "2").toFixed is not a function

// 注意：strict 模式能拦住**隐式** any（你没写，TS 自己推成了 any），
// 但拦不住你**显式**写的 any。

// ============================================
// 二、unknown —— 安全的 any
// ============================================
// unknown 表示"我确实不知道它是什么"，所以 TS **不允许**你直接使用它。
// 必须先用各种判断把范围缩小（这叫类型收窄，第 04 章细讲）。

const data: unknown = "一段来自接口的数据";

// console.log(data.toUpperCase());
//   ❌ error TS18046: 'data' is of type 'unknown'.
//      想用得先证明它是什么：

if (typeof data === "string") {
  // 在这个 if 里，TS 已经知道它是 string 了
  console.log("收窄之后才能用：", data.toUpperCase());
}

// unknown 和 any 的区别，用一句话总结：
//   any      = "别检查了，出事我负责"      （责任在你）
//   unknown  = "先检查，检查完再给你用"    （责任在 TS）
//
// 所以写不确定的代码时，优先用 unknown。常见的两处：
//   1. catch 到的错误（strict 下默认就是 unknown，见 04-advanced/04）
//   2. JSON.parse 的结果、第三方库的返回值

// ============================================
// 三、never —— 永远不会有值
// ============================================
// 用来描述"这个函数不会正常返回"（抛异常、死循环）。

function fail(message: string): never {
  throw new Error(message);
}

// never 和 void 的区别，别看只差一个字母：
//   void  = 函数会正常结束，只是没有返回值（返回 undefined）
//   never = 函数**根本不会走到返回那一步**

function logMessage(message: string): void {
  console.log("  [log]", message);
}

logMessage("void 函数正常执行完了");

// 真要让 fail 跑一下（会抛异常，所以包在 try 里）：
try {
  fail("这是个演示用的异常");
} catch (error) {
  // catch 到的 error 类型是 unknown（strict 下），想用它的 message 得先说明它是什么。
  // `as Error` 叫"类型断言"，相当于 C++ 的强制转换：由你向 TS 保证，TS 不做检查。
  // 断言用错了 TS 也救不了你 —— 详见 04-advanced。
  console.log("never 函数抛出了异常：", (error as Error).message);
}

// never 还有一个重要用途：把不可能的分支"占位"，
// 让 TS 帮你检查是不是漏了某种情况。第 04 章会讲。

// ============================================
// 四、void —— 没有返回值
// ============================================
// 和 C/C++ 的 void 基本一致。

function printUser(name: string, age: number): void {
  console.log(`  用户 ${name}，${age} 岁`);
}
printUser("张三", 20);

// 一个容易困惑的点：void 类型的变量可以接 undefined，但没什么意义
const nothing: void = undefined;
console.log("void 变量的值是：", nothing);

// 另一个常见场景：回调函数不关心返回值时
const numbers = [1, 2, 3];
numbers.forEach((n): void => {
  console.log("  forEach 回调不需要返回值，收到：", n);
});

// ============================================
// 五、怎么选
// ============================================
//
//   "这个值我确实不知道"        → unknown
//   "这个值不需要返回值"        → void
//   "这个函数不会正常返回"      → never
//   "别管了，先跑通再说"        → any（尽量只在迁移旧代码时用）
//
// 一个实用的判断标准：
//   看到 any 就问自己"能不能换成 unknown" —— 大多数时候可以。

// ============================================
// 小结
// ============================================
// - any     关掉检查，而且会传染，能不用就不用
// - unknown 安全的 any，用之前必须先收窄
// - never   永远不返回（抛错 / 死循环），也用来做穷尽性检查
// - void    正常返回，但没有值

console.log("\n—— 04-any-unknown-never.ts 结束 ——");
