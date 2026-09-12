// ============================================
// 03 联合类型、字面量类型与判别联合
// ============================================
//
// 这个文件是前面所有"类型"知识的汇总用法，也是本目录**最实用**的一节。
// 真实项目里的类型，八成都是由这几种拼出来的：
//
//   联合类型 |       "A 或 B"
//   字面量类型         "只允许这几个具体的值"
//   判别联合           "带一个标签的联合" ← 最重要
//   交叉类型 &       "A 且 B"

// ============================================
// 一、联合类型：A 或 B
// ============================================
// 对比 C++：联合类型像 std::variant，但不需要额外写访问器 ——
// TS 会根据你做的判断自动"收窄"（见第四节）。

function formatId(id: string | number): string {
  // 在收窄之前，只能使用两种类型**都有**的成员
  // console.log(id.toUpperCase());
  //   ❌ error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  return `ID-${id}`;
}

console.log("--- 联合类型 ---");
console.log(formatId(42), formatId("abc"));

// ============================================
// 二、字面量类型：只允许这几个值
// ============================================
// 这是 C++ 里没有的东西。TS 能说"这个位置只接受字符串 'ok' 或 'error' 这两个值"。

type Status = "pending" | "success" | "failed";

function renderStatus(status: Status): string {
  return `状态：${status}`;
}
console.log("\n--- 字面量类型 ---");
console.log(renderStatus("success"));

// renderStatus("done");
//   ❌ error TS2345: Argument of type '"done"' is not assignable to parameter of type 'Status'.
//   注意报错里会写成 'Status'（类型别名），不会展开成那三个字符串

// 单个字面量类型也是合法类型，只是很少单独用：
type Yes = "yes";
const answer: Yes = "yes";

// ⚠️ 一个关键细节：值会不会"变宽"
const constStr = "ok";    // 类型是 "ok"（字面量类型）
let letStr = "ok";        // 类型是 string（宽化成普通字符串）
console.log("const 推断出的是字面量类型，let 会宽化成 string");

// ============================================
// 三、判别联合（discriminated union）—— 重点
// ============================================
// 给联合的每个成员加一个"标签字段"（通常叫 kind / type / tag），
// 值相同的字符串。TS 靠这个标签就能分辨当前是哪个成员。
//
// 这是 TS 里最重要的类型模式，没有之一。它替代了 C++ 的——
//   union + tag 手工判别的写法，而且编译器帮你检查有没有漏。

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

// 有了 kind，switch 一下 TS 就知道每个分支里是哪个形状：
function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;        // 这里 shape 就是 { kind: "circle"; radius }
    case "rect":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
  }
  // 注意这里**没有 return**，但 TS 不报错 —— 因为它知道三个分支全覆盖了
}

console.log("\n--- 判别联合 ---");
console.log("圆：", area({ kind: "circle", radius: 1 }).toFixed(2));
console.log("矩形：", area({ kind: "rect", width: 3, height: 4 }));
console.log("三角形：", area({ kind: "triangle", base: 6, height: 2 }));

// 漏掉一个分支，TS 会抓到：
// 如果上面 switch 只写了 circle 和 rect 两个 case，会报：
//   ❌ error TS2366: Function lacks ending return statement and
//      return type does not include 'undefined'.

// 反过来，在收窄之前访问属性也不行：
// function bad(shape: Shape): number { return shape.radius; }
//   ❌ error TS2339: Property 'radius' does not exist on type 'Shape'.
//      Property 'radius' does not exist on type '{ kind: "rect"; width: number; height: number; }'.
//   （TS 会把"哪个成员没有这个属性"也告诉你）

// ============================================
// 四、穷尽性检查：用 never 兜底（强烈推荐）
// ============================================
// 上一节的 switch 有个隐患：将来给 Shape 加了新形状，
// 旧的 switch 会报"缺少 return"，但如果函数返回 void，就**什么都不会报**，
// 你会静悄悄地漏掉新分支。
//
// 解决办法：加一个 default 分支，把值传给一个"只接受 never"的函数。
// 如果所有情况都处理完了，走到 default 时值就只能是 never —— 编译通过；
// 一旦漏了某个情况，传进去的就不是 never —— 编译报错。

function assertNever(value: never): never {
  throw new Error(`未处理的情况：${JSON.stringify(value)}`);
}

function describe(shape: Shape): string {
  switch (shape.kind) {
    case "circle": return "圆";
    case "rect": return "矩形";
    case "triangle": return "三角形";
    default: return assertNever(shape);
  }
}
console.log("\n--- 穷尽性检查 ---");
console.log(describe({ kind: "circle", radius: 1 }), describe({ kind: "rect", width: 1, height: 1 }));

// 现在给 Shape 加一个新成员：
//   | { kind: "square"; side: number }
// 这个文件会立刻在 default 那行报错：
//   ❌ error TS2345: Argument of type '{ kind: "square"; side: number; }'
//      is not assignable to parameter of type 'never'.
//
// 注意报错信息直接把"你漏了 square"写出来了 —— 这就是这个模式的价值。
// C++ 里 std::variant 的 std::visit 也有类似的"漏了就编译不过"，
// 但需要额外写 visitor；TS 这里只靠一个 3 行的 assertNever。

// ============================================
// 五、用 as const 对象代替 enum
// ============================================
// 本环境禁用了 enum（理由见 02-functions/03 第六节），替代方案是这个经典写法。

const LogLevel = {
  Debug: "debug",
  Info: "info",
  Error: "error",
} as const;

// 拆开看这两步：
//   typeof LogLevel                      → { readonly Debug: "debug"; readonly Info: "info"; ... }
//   keyof typeof LogLevel                → "Debug" | "Info" | "Error"      （所有键）
//   (typeof LogLevel)[keyof typeof LogLevel] → "debug" | "info" | "error"  （所有值）
type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

function log(level: LogLevel, message: string): void {
  console.log(`  [${level}] ${message}`);
}

console.log("\n--- as const 代替 enum ---");
log(LogLevel.Debug, "这是个常量，编辑器能补全");
log(LogLevel.Error, "写错了 TS 会拦");
log("debug", "直接写字符串也行，类型是一样的");

// log("trace", "x");
//   ❌ error TS2345: Argument of type '"trace"' is not assignable to parameter of type 'LogLevel'.

// ⚠️ 关键在 as const。去掉它，类型就废了：
const BadLevel = { Debug: "debug", Info: "info" };
type BadLevelT = (typeof BadLevel)[keyof typeof BadLevel];
function logBad(level: BadLevelT): void { console.log("  ", level); }
logBad("随便什么字符串都行");
// 不写 as const 时，每个属性的类型是 string 而不是 "debug"，
// 于是 keyof 取出来的也是 string —— 整个约束**静默失效**，一行错都不报。
// 这是这套写法唯一的坑，一定要记得加 as const。

// 和 TS 的 enum 比：
//   优点：编译后就是普通对象（能遍历、能传 JSON、能直接 console.log）
//        enum 会生成额外代码，且数字 enum 有一堆反直觉的行为
//   缺点：写起来啰嗦一点，且必须记得 as const

// ============================================
// 六、交叉类型：A 且 B
// ============================================

type Person = { name: string };
type Worker = Person & { employeeId: number };

const worker: Worker = { name: "张三", employeeId: 1001 };
console.log("\n--- 交叉类型 ---");
console.log("交叉类型：", worker);

// const missing: Worker = { name: "张三" };
//   ❌ error TS2322: Type '{ name: string; }' is not assignable to type 'Worker'.
//      Property 'employeeId' is missing in type '{ name: string; }'
//      but required in type '{ employeeId: number; }'.

// 联合 vs 交叉，一句话记住：
//   A | B  值满足**其中一个**即可 → 能用的成员是**交集**（只敢用共有的）
//   A & B  值必须**同时满足**     → 能用的成员是**并集**（全都敢用）
// 属性和操作的范围刚好是反过来的，初学最容易记混。

// ============================================
// 小结
// ============================================
// - 联合 | 表示"A 或 B"，用之前必须先收窄
// - 字面量类型能精确限制取值范围；const 推断字面量，let 会宽化成 string
// - 判别联合 = 加一个 kind 标签，配合 switch 自动收窄（最重要）
// - 用 assertNever 做穷尽性检查，漏了分支立刻编译报错
// - as const 对象是 enum 的替代品，但**必须记得 as const**，否则静默失效
// - & 是"A 且 B"，和 | 在成员可用范围上刚好相反

console.log("\n—— 03-objects/03-union-and-literal.ts 结束 ——");
