// ============================================
// 02 类型谓词（type guard）
// ============================================
//
// 上一节留了个尾巴：自己写的判断函数**不会**让 TS 收窄。
// 这一节就是解法：给它标一个"类型谓词"。

// ============================================
// 一、先复现问题
// ============================================

function isStringBAD(value: unknown): boolean {
  return typeof value === "string";
}

function demo(value: unknown): string {
  if (isStringBAD(value)) {
    // return value.toUpperCase();
    //   ❌ error TS18046: 'value' is of type 'unknown'.
    //
    // 原因：isStringBAD 的返回类型写的是 boolean。
    // TS 只知道"它返回真或假"，**不知道真意味着什么**。
    // 换句话说，这个信息在你写函数签名的时候就丢了。
    return "";
  }
  return "";
}
console.log("--- 问题：普通 boolean 返回不收窄 ---");
console.log("isStringBAD('x') =", isStringBAD("x"), "（TS 在 if 里却不知道它是字符串）");

// ============================================
// 二、类型谓词：把"真意味着什么"写进签名
// ============================================
// 语法： 参数名 is 类型

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function demoFixed(value: unknown): string | null {
  if (isString(value)) {
    return value.toUpperCase();       // ✅ 这里 value 是 string
  }
  return null;                        // 这里 value 是 unknown
}
console.log("\n--- 用类型谓词修好之后 ---");
console.log(" ", demoFixed("abc"), demoFixed(123));

// 类型谓词完全对应 C++ 的——
//   其实 C++ 没有直接对应的东西。最接近的是：
//     std::optional<std::string> as_string(const Value& v);   // 返回"可能拿到的 string"
//   TS 的写法更轻：返回 boolean，但编译器记住了"真 ⇒ 是 string"。
//
// 换个说法：普通函数返回的是**值**，类型谓词额外返回了一份**类型信息**。

// ⚠️ 位置必须对：谓词写在**返回类型**的位置上，冒号后面。
//    function isString(v: unknown): boolean          ← 普通的，不收窄
//    function isString(v: unknown): v is string      ← 谓词，收窄
//    参数名必须和真正的参数名一致。

// ============================================
// 三、谓词类型必须"够得着"参数类型
// ============================================

// 参数是 string，却声称能判断出 number —— 逻辑上就不成立：
// function bad(v: string): v is number { return false; }
//   ❌ error TS2677: A type predicate's type must be assignable to its parameter's type.
//      Type 'number' is not assignable to type 'string'.
//
// 这条检查挺有用：能挡住"参数是 A，却断言成完全无关的 B"这类笔误。
// 但注意它只查"能否赋值"，**不查你的逻辑对不对**（见第七节）。

// ============================================
// 四、最实用的收益：filter 能推断出正确的类型
// ============================================
// 这是谓词在日常代码里最高频的用途。

const mixed: (string | number)[] = ["a", 1, "b", 2, 3, "c"];

// ❌ 用普通 boolean 函数过滤，类型还是 (string | number)[]
function isNumberBAD(v: unknown): boolean {
  return typeof v === "number";
}
const stillMixed = mixed.filter(isNumberBAD);     // 类型：(string | number)[]
// const wrong: number[] = stillMixed;
//   ❌ error TS2322: Type '(string | number)[]' is not assignable to type 'number[]'.

// ✅ 用谓词过滤，类型自动变成 string[]
function isNumber(v: unknown): v is number {
  return typeof v === "number";
}
const onlyNumbers = mixed.filter(isNumber);       // 类型：number[]
const sum: number = onlyNumbers.reduce((a, b) => a + b, 0);

console.log("\n--- filter 的差别 ---");
console.log("  普通 boolean 过滤后：", stillMixed, "（类型仍是联合）");
console.log("  谓词过滤后：", onlyNumbers, " 求和 =", sum);

// 一句话：**filter + 类型谓词**是 TS 里"筛出某一类元素"的标准写法。
// 写成箭头函数也行，很常见：
const isStringArrow = (v: unknown): v is string => typeof v === "string";
console.log("  箭头函数谓词：", mixed.filter(isStringArrow));

// 注意箭头函数必须**显式写返回类型**，不能靠推断 ——
// 推断出来的只是 boolean，谓词信息就丢了。

// ============================================
// 五、asserts：断言函数
// ============================================
// 上面是"返回真 ⇒ 类型是 X"。第二种是"**没抛异常** ⇒ 类型是 X"。
// 适合写在函数开头做参数校验。

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`期望字符串，实际拿到 ${typeof value}`);
  }
}

function shout(value: unknown): string {
  assertIsString(value);          // 这一行之后，value 就被当成 string 了
  return value.toUpperCase() + "!";
}
console.log("\n--- asserts 断言函数 ---");
console.log(" ", shout("hello"));
// shout(123);
//   这不是编译错误 —— 断言在**运行时**抛异常：
//   Error: 期望字符串，实际拿到 number
console.log("（传数字会在运行时抛错，注释里写了）");

// 还有不带 `is` 的简写，意思是"断言它是真值"：
function assertTruthy(value: unknown): asserts value {
  if (!value) throw new Error("不能是假值");
}
function useIt(value: unknown): void {
  assertTruthy(value);
  console.log(`  assertTruthy 之后，value 的运行时类型还是 ${typeof value}，`);
  console.log("  但在 TS 眼里它已经从 unknown 变成了 {}（非空），可以当对象用了");
}
useIt({ a: 1 });

// 三者的区别，一张表说清：
//
//   写法                                  含义                       收窄时机
//   -----------------------------------   ------------------------   --------------
//   (v: unknown): boolean                 只返回真假                 不收窄
//   (v: unknown): v is string             真 ⇒ v 是 string            if 为真之后
//   (v: unknown): asserts v is string     不抛异常 ⇒ v 是 string      调用之后
//
// 该用哪个？
//   只是判断（比如 filter）→ 用 is
//   想让后面的代码直接用，不想嵌套 if → 用 asserts

// 对比 C++：asserts 有点像自己写的 CHECK 宏 + static_assert 的组合，
//   但 C++ 的断言不携带类型信息，TS 的这个会。

// ============================================
// 六、this is：给方法写谓词
// ============================================
// 在类/接口的方法上，可以用 `this is X` 表示"这个方法返回真说明自己是 X"。

interface HasName {
  name: string;
}

class MaybeUser {
  name?: string;
  age?: number;

  constructor(data: Record<string, unknown>) {
    // 注意这里是真的把值存下来了，不是嘴上说说
    if (typeof data.name === "string") this.name = data.name;
    if (typeof data.age === "number") this.age = data.age;
  }

  // "如果这个方法返回真，那我就是一个有 name 的 HasName"
  isUser(): this is MaybeUser & HasName {
    return typeof this.name === "string";
  }

  show(): string {
    if (this.isUser()) {
      return `有名字：${this.name}`;     // ✅ this 上现在确定有 name 了
    }
    return "没有名字";
  }
}

console.log("\n--- this is ---");
console.log(" ", new MaybeUser({ name: "张三" }).show());
console.log(" ", new MaybeUser({ age: 20 }).show());

// ============================================
// 七、⚠️ TS 完全信任你的谓词（重要）
// ============================================
// 类型谓词是你**手工写的一句承诺**，TS 不会去验证它说得对不对。

function isNeverString(value: unknown): value is string {
  return true;               // ← 睁眼说瞎话：什么都说是字符串
}

const liar: string = (() => {
  let x: unknown = 42;
  if (isNeverString(x)) {
    return x;                // 编译通过，但运行时 x 是 42 这个数字
  }
  return "";
})();
console.log("\n--- 谓词是「承诺」，不是「证明」 ---");
console.log("  谓词撒谎时 TS 拦不住，返回值实际是：", liar, `(${typeof liar})`);
console.log("  ↑ 声明成 string，实际是 number —— 这就是谓词写错的下场");

// 所以要记住：
//   typeof / instanceof / in / Array.isArray  →  TS 懂，且**不会**写错
//   v is X                                    →  TS 只信你，写错也不报错
//
// 谓词里只做真正的**运行时**检查（typeof、in、instanceof、
// Object.prototype.hasOwnProperty 这类），别在里面"顺手"下结论。

// 顺带一提，类型断言 `as` 也是同样的性质：
//   `x as string` 是"我保证它是"，TS 不验证，运行时也不转换。
// 谓词比 as 好的地方在于：**检查逻辑真的会执行**，运行时是安全的。

// ============================================
// 八、实战：校验外部来的数据
// ============================================
// 这是类型谓词最重要的实际用途 —— 后端返回的 JSON、读进来的文件、用户输入，
// 对 TS 来说全都是 unknown，必须验证之后才能当类型用。

interface User {
  name: string;
  age: number;
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  // 上面这行排除了 null：typeof null === "object"，是个经典陷阱
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.age === "number";
}

function parseUser(raw: unknown): User | null {
  if (isUser(raw)) {
    return raw;                  // ✅ 这里 raw 是 User
  }
  return null;
}

console.log("\n--- 实战：校验外部数据 ---");
const inputs: unknown[] = [
  { name: "张三", age: 20 },
  { name: "李四" },                       // 缺 age
  { name: "王五", age: "二十" },          // age 类型不对
  null,
  "一段字符串",
  { name: "赵六", age: 30, extra: true }, // 多一个字段，允许
];
for (const input of inputs) {
  const user = parseUser(input);
  console.log(" ", JSON.stringify(input), "→", user === null ? "不合格" : `合格 ${user.name}`);
}

// 这就是"**边界的类型安全**"：
//   在程序边界（网络、文件、命令行参数）用谓词把 unknown 收成具体类型，
//   边界之内就可以放心地信任类型系统了。
//
// 真实项目里这一层通常用库来做，比如 zod、valibot：
//   const User = z.object({ name: z.string(), age: z.number() });
//   const user = User.parse(raw);     // 校验失败直接抛错
// 手写谓词适合规则简单的场景；规则一多，库的写法更省事也更好维护。

// ============================================
// 小结
// ============================================
// - 类型谓词 `v is X` 写"真意味着什么"，让 TS 在 if 里收窄
// - 箭头函数写谓词必须显式标返回类型，否则谓词信息丢失
// - `asserts v is X` 是"不抛异常就意味着是 X"，适合开头做参数校验
// - filter + 谓词 是筛数组的标准写法，结果类型自动正确
// - ⚠️ 谓词是你的**承诺**，TS 不验证；只做真正的运行时检查
// - 主要用途：在程序边界把 unknown 校验成具体类型（或用 zod 之类的库）

console.log("\n—— 04-advanced/02-type-guards.ts 结束 ——");
