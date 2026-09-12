// ============================================
// 01 类型收窄（narrowing）
// ============================================
//
// "收窄"= TS 看着你的 if/switch，把宽类型**自动缩小**成更具体的类型。
//
// 这是 TS 类型系统里最"聪明"的部分，也是它和 C++ 差别最大的地方：
//   C++ 想安全地从一个 union 里取值，得用 std::get 或者 std::visit，
//       写错了是运行时抛异常（std::bad_variant_access）
//   TS  只要写个普通的 if 判断，编译器就跟着你的判断走，写错了**编译期**报错
//
// 换个角度说：你写的是**运行时**的检查，TS 顺手把它当成了**编译期**的信息。

// ============================================
// 一、typeof：最常用的一种
// ============================================

function double(value: string | number): string {
  // 在这里，value 是 string | number，只能用它俩共有的东西
  // value.toFixed(2);
  //   ❌ error TS2339: Property 'toFixed' does not exist on type 'string | number'.
  //   （string 没有 toFixed，所以 TS 不敢让你调）

  if (typeof value === "number") {
    // 进了这个分支，TS 就认定 value 是 number
    return String(value * 2);
  }
  // 出了 if，TS 也知道 value 只能是 string 了（排除了 number）
  return value.repeat(2);
}

console.log("--- typeof 收窄 ---");
console.log("传数字：", double(21));
console.log("传字符串：", double("ab"));

// typeof 能分辨的类型一共就这几种（这是 JS 的规矩，不是 TS 的）：
//   "string" "number" "bigint" "boolean" "symbol" "undefined"
//   "object"（含 null 和数组！）  "function"
//
// ⚠️ 最坑的一条：typeof null === "object"
console.log("\n陷阱：typeof null =", typeof null);
console.log("所以判断 null 千万别用 typeof === 'object'，用 === null");

// ============================================
// 二、真值判断：if (x)
// ============================================
// JS 里有一堆"假值"：false、0、-0、0n、""、null、undefined、NaN。
// 用 if (x) 会把它们全都排除掉 —— 包括你可能没想排除的空字符串和 0。

function greet(name?: string): string {
  if (name) {
    return `你好，${name}`;       // 这里 name 是 string（undefined 被排除了）
  }
  return "你好，陌生人";
}
console.log("\n--- 真值收窄 ---");
console.log(greet("张三"));
console.log(greet());          // 不传 → undefined
console.log(greet(""));        // ⚠️ 空字符串也是假值，走的是 else 分支

// 如果只想排除 null / undefined，而**保留**空字符串和 0，就得写明确：
function greetStrict(name?: string): string {
  if (name !== undefined) {
    return `你好，${name}`;       // 空字符串能走到这里
  }
  return "你好，陌生人";
}
console.log("严格判断时传空字符串：", greetStrict("") === "你好，" ? "（空字符串被保留了）" : "?");

// 这个坑在真实项目里很常见：用户输入的 "0" 或 "" 被当成"没填"。
// 记住：**只判断 null/undefined 就写 === undefined，别偷懒用 if (x)**。

// ============================================
// 三、相等判断
// ============================================
// 和某个具体值比较时，TS 也能收窄。

type Status = "pending" | "success" | "failed";

function isDone(status: Status): boolean {
  if (status === "success") {
    return true;               // 这里 status 的类型是 "success"
  }
  // 这里 status 是 "pending" | "failed"
  return false;
}
console.log("\n--- 相等收窄 ---");
console.log("success 完成了吗：", isDone("success"), " pending 完成了吗：", isDone("pending"));

// 判断两个字面量联合是否相等，TS 会取**交集**：
function same(a: string | number, b: string | boolean): void {
  if (a === b) {
    // a 和 b 都只能是 string 了（number 和 boolean 没有交集）
    console.log("  相等时两个都是字符串：", a.toUpperCase());
  }
}
same("x", "x");
same(1, true);

// ============================================
// 四、in：判断"有没有这个属性"
// ============================================
// 适合用来区分"结构不同的对象"，是判别联合之外的另一条路。

type Cat = { meow: () => string };
type Dog = { bark: () => string };

function speak(animal: Cat | Dog): string {
  if ("meow" in animal) {
    return animal.meow();      // 这里 animal 是 Cat
  }
  return animal.bark();        // 这里 animal 是 Dog
}
console.log("\n--- in 收窄 ---");
console.log(" ", speak({ meow: () => "喵" }), speak({ bark: () => "汪" }));

// ============================================
// 五、instanceof：判断"是不是某个类的实例"
// ============================================
// 对应 C++ 的 dynamic_cast，但 TS 里**不需要运行时类型信息**（没有 RTTI 那套），
// 因为 instanceof 检查的是原型链，JS 引擎原生支持。

function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();     // 这里 value 是 Date
  }
  return value;                      // 这里 value 是 string
}
console.log("\n--- instanceof 收窄 ---");
console.log(" ", formatDate(new Date("2026-01-01T00:00:00Z")));
console.log(" ", formatDate("本来就是字符串"));

class ApiError extends Error {
  statusCode: number = 500;
}
function handle(error: Error): string {
  if (error instanceof ApiError) {
    return `接口错了，状态码 ${error.statusCode}`;   // 能访问子类专有属性
  }
  return `普通错误：${error.message}`;
}
console.log(" ", handle(new ApiError("超时")));
console.log(" ", handle(new Error("别的问题")));

// 对比 C++：
//   dynamic_cast<ApiError*>(e)  失败返回 nullptr，**运行时**才知道成不成功
//   TS 的 instanceof            失败走 else 分支，**编译期**就知道类型

// ============================================
// 六、Array.isArray 和自定义判断函数
// ============================================
// 有些判断 typeof 做不到（数组和对象都是 "object"），要用专门的方法。

function total(value: number | number[]): number {
  if (Array.isArray(value)) {
    return value.reduce((sum, n) => sum + n, 0);   // 这里 value 是 number[]
  }
  return value;
}
console.log("\n--- Array.isArray ---");
console.log(" ", total([1, 2, 3]), total(10));

// 自己写的判断函数**不会**自动收窄 —— 这是个大坑：
function isString(value: unknown): boolean {
  return typeof value === "string";
}
function bad(value: unknown): string {
  if (isString(value)) {
    // return value.toUpperCase();
    //   ❌ error TS18046: 'value' is of type 'unknown'.
    //   TS 只看到"这个函数返回 boolean"，不知道它检查了什么，
    //   所以进了 if 分支 value 仍然是 unknown，什么都不能干
    return "";
  }
  return "";
}
console.log("（自己写的判断函数默认不收窄，要靠类型谓词，见 02-type-guards.ts）");
console.log(" ", bad("x"));

// 但 TS **内置**的那些判断函数是收窄的，因为库作者给它们标了类型谓词：
//   Array.isArray(x)    → x is any[]
//   Number.isInteger(x) → 不收窄（返回 boolean，没有谓词）
// 所以上面 total 里 Array.isArray 能用，而自己写的 isString 不能。

// ============================================
// 七、赋值收窄
// ============================================
// 给变量赋一个新值，TS 会把类型更新成新值的类型。

function pick(items: (string | number)[]): string {
  let first: string | number = items[0] ?? "";
  if (typeof first === "string") {
    return first.toUpperCase();          // 这里 first 是 string
  }
  return String(first);                  // 这里 first 是 number
}
console.log("\n--- 赋值收窄 ---");
console.log(" ", pick(["ab", 1]), pick([1, 2]));

// 赋一个具体的值，类型也会跟着变成那个值：
let mode: string | number = "abc";
mode = 1;
// console.log(mode.toUpperCase());
//   ❌ error TS2339: Property 'toUpperCase' does not exist on type 'number'.
//   注意报错说是 number —— 赋值之后 TS 已经把它当成 number 了

// ============================================
// 八、⚠️ 闭包陷阱：收窄会在回调里失效
// ============================================
// 这是实际写代码时最容易被绊住的地方，单独讲。

function printAll(items: (string | number)[]): void {
  let first: string | number = items[0] ?? "";

  if (typeof first === "string") {
    // 情况 A：回调里**没有**给 first 赋值 —— 收窄能传进去
    items.forEach(() => {
      console.log("  回调里能收窄：", first.toUpperCase());   // ✅ 没问题
    });
  }
}
console.log("\n--- 闭包陷阱（情况 A：回调里没赋值）---");
printAll(["ab", 1]);

// 情况 B：回调里**有**给 first 赋值
// （下面整段保留但不执行，因为加了 first = 1 之后它编译不过，会让 npm run check 变红）
//
// function printAllBroken(items: (string | number)[]): void {
//   let first: string | number = items[0] ?? "";
//   if (typeof first === "string") {
//     items.forEach(() => {
//       console.log(first.toUpperCase());
//       // ❌ error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
//       //    Property 'toUpperCase' does not exist on type 'number'.
//       first = 1;                  // ← 就是这一行害的
//     });
//   }
// }
//
// 想亲手确认的话，把上面几行的注释去掉，再跑 npm run check。

// 规则说清楚：
//   只要一个 let 变量在**任何嵌套函数内部**被赋值过，
//   TS 就放弃外层对它的收窄，在该函数体内部退回到**声明的类型**。
//
//   注意是"整个函数体"都失效，不只是赋值之后 —— 上面 first.toUpperCase()
//   明明写在 first = 1 **前面**，照样报错。这点非常反直觉。
//
// 而且注意报错里说的是 string | number（声明类型），不是赋值后的 number ——
// 说明这是"收窄被丢弃"，不是"按新值收窄"。
//
// 为什么这么设计？因为 TS 没法知道那个回调什么时候被调用、被调用几次。
// 保守起见，只要你可能改动它，就当作"收窄不可信"。
//
// ✅ 解决办法：把值先抄进一个 const，再进回调
function printAllFixed(items: (string | number)[]): void {
  let first: string | number = items[0] ?? "";
  if (typeof first === "string") {
    const captured = first;            // 抄一份 const，收窄跟着它走
    items.forEach(() => {
      console.log("  抄进 const 之后：", captured.toUpperCase());   // ✅
    });
    first = 1;                          // 想改 first 也随便改
  }
}
console.log("--- 闭包陷阱（修好之后）---");
printAllFixed(["ab", 1]);

// 记住这个模式：**要让回调用，就先抄成 const**。
// 顺便说，这样写也更安全 —— 回调里读到的永远是当时那个值。

// ============================================
// 九、TS 的收窄并不"严密"（知道一下就好）
// ============================================
// TS 只跟踪它**看得见**的代码。下面这种情况它就不管了：

function unsound(callback: () => void): string {
  let value: string | number = "abc";
  if (typeof value === "string") {
    callback();                        // 这个 callback 完全可能把外部变量改了
    return value.toUpperCase();        // TS 仍然认为它是 string，编译通过
  }
  return String(value);
}
console.log("\n--- 收窄的局限 ---");
console.log(" ", unsound(() => {}), "（这里 callback 没真改，所以没事）");

// 如果传进去的 callback 真的把 value 改了，运行时就会炸 —— TS 拦不住。
// 原理：TS 的收窄是**对当前作用域内的代码流**做的分析，
//       它不会去跟踪"某个函数调用了之后外部状态变成了什么"。
//
// 这不是 bug，是权衡：真要做到严密就得放弃 JS 的动态性。
// 结论：**收窄能帮你抓绝大多数错误，但不能替你思考。**

// ============================================
// 小结
// ============================================
// - 收窄 = TS 跟着你的 if/switch 自动缩小类型，这是 TS 最强大的地方
// - 常用手段：typeof、if (x)、=== 、in、instanceof、Array.isArray
// - typeof null === "object" 是个陷阱，判 null 直接写 === null
// - if (x) 会把 "" 和 0 也当假值，只想排除 null/undefined 就写 === undefined
// - 自己写的判断函数默认不收窄，要类型谓词（下一节）
// - ⚠️ let 变量一旦在嵌套函数里被赋值，该函数体内的收窄全部失效 → 抄成 const
// - 收窄不跟踪函数调用的副作用，不是万能的

console.log("\n—— 04-advanced/01-narrowing.ts 结束 ——");
