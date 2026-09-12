// ============================================
// 02 函数重载
// ============================================
//
// ⚠️ TS 的"重载"和 C++ 的重载**根本不是一回事**，这是最容易误解的地方。
//
//   C++：每个签名一个实现体，编译期挑一个来调用
//
//     std::string format(int v)               { return std::to_string(v); }
//     std::string format(const std::string& v) { return v; }
//     // 两个函数，各自有完整的实现
//
//   TS：多个"签名声明" + **只有一个实现体**
//
//     function format(value: number): string;      ← 只是个声明，没有函数体
//     function format(value: string): string;      ← 同上
//     function format(value: number | string): string {   ← 真正的实现，只有一个
//       return typeof value === "string" ? value : value.toFixed(2);
//     }
//
// 所以 TS 的重载更准确的叫法是"**重载签名**"：
// 它只是告诉 TS"这个函数可以被这样调用"，真正的分派逻辑要你自己写在实现体里。

// ============================================
// 一、基本写法
// ============================================

// 1. 重载签名（可以有多个）—— 只写声明，不写实现
function format(value: string): string;
function format(value: number, digits: number): string;

// 2. 实现签名（只能有一个，且必须兼容上面所有签名）
function format(value: string | number, digits?: number): string {
  if (typeof value === "string") {
    return value;
  }
  return value.toFixed(digits ?? 0);
}

console.log("--- 重载的基本用法 ---");
console.log('format("abc")       =', format("abc"));
console.log("format(3.14159, 2)  =", format(3.14159, 2));

// 调用时只能匹配前面的"重载签名"：
// format(3.14159);
//   ❌ error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
// format(true);
//   ❌ error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'.
//
// 报错信息里提到的是**第一个重载**（value: string）。TS 的说法是"不匹配任何重载"，
// 但具体拿哪一条来对比、报哪种错误码，取决于有几个重载的参数个数对得上：
//   只有一个对得上 → TS2345，直接拿它对比
//   有多个可能匹配 → TS2769 "No overload matches this call"，再附上最后一条的错误
// 两种都只是措辞不同，含义一样：没有重载接受这种调用。实际项目里 TS2769 见得多一些。

// ============================================
// 二、实现签名对外不可见
// ============================================
// 这是最反直觉的一点：写了重载签名之后，
// **实现签名不参与调用匹配**，调用者只看得到上面那些声明。

function pick(value: string | number): string;
function pick(value: string | number): string {
  return String(value);
}
console.log("\npick(123) =", pick(123));
// pick(true);
//   ❌ error TS2345: Argument of type 'boolean' is not assignable to
//      parameter of type 'string | number'.
//      但实现签名收的是 string | number，boolean 本来就不该通过 —— 这是对的。
//
// 反过来更值得注意：
// 如果重载签名比实现签名**窄**，那窄出去的部分就永远调不到。

// ============================================
// 三、匹配顺序：从上往下，第一个匹配的胜出
// ============================================
// 顺序写错了会得到意外的结果，所以**具体的一定要写在前面**。

function describe(value: string): string;              // ① 具体
function describe(value: string | number): string;     // ② 宽泛
function describe(value: string | number): string {
  return typeof value === "string" ? `字符串：${value}` : `数字：${value}`;
}

console.log("\n--- 匹配顺序 ---");
console.log(describe("hi"));
// 如果把 ② 写在 ① 前面，"hi" 会先匹配 ②，虽然结果一样，
// 但在返回值不同时就会出错。规则：窄的在前，宽的在后。

// ============================================
// 四、什么时候真的需要重载
// ============================================
// 答案：**返回值类型跟着参数类型变**的时候。这种关系用联合类型表达不了。

// 反例：用联合类型写，返回值也是联合类型，调用者还得再判断一次
function parseUnion(input: string | object): string | object {
  return typeof input === "string" ? JSON.parse(input) : JSON.stringify(input);
}
const r1 = parseUnion('{"a":1}');
// r1 的类型是 string | object —— 明明传的是字符串，却不知道会拿到 object
console.log("\n联合类型写法的返回值：", r1);

// 正例：用重载，返回值类型能精确对应入参
function parse(input: string): object;
function parse(input: object): string;
function parse(input: string | object): string | object {
  return typeof input === "string" ? JSON.parse(input) : JSON.stringify(input);
}

const parsed: object = parse('{"name":"张三"}');          // ✅ 直接就是 object
const text: string = parse({ name: "张三" });             // ✅ 直接就是 string
console.log("重载写法的返回值：", parsed, text);

// ============================================
// 五、但大多数时候，别用重载
// ============================================
// 能用"联合类型 + 可选参数"解决的，就别写重载 —— 重载代码量更大也更难维护。

// 上面那个 format 其实可以简化成：
function formatSimple(value: string | number, digits: number = 0): string {
  return typeof value === "string" ? value : value.toFixed(digits);
}
console.log("\n简化版 formatSimple(3.14159, 2) =", formatSimple(3.14159, 2));

// 判断标准：
//   只是想让参数接受多种类型 → 联合类型
//   想让返回值也跟着变      → 重载（或者泛型，见 03）

// 另外还有一个坑：箭头函数不能直接写重载签名，
// 需要用带"调用签名"的接口类型（写法少见，知道有这么回事就行）：
interface Formatter {
  (value: string): string;
  (value: number, digits: number): string;
}
const arrowFormatter: Formatter = (value: string | number, digits?: number): string =>
  typeof value === "string" ? value : value.toFixed(digits ?? 0);
console.log("箭头函数的重载写法：", arrowFormatter(2.5, 3));

// ============================================
// 小结
// ============================================
// - TS 重载 = 多个签名声明 + 一个实现体（和 C++ 完全不是一回事）
// - 实现签名对外不可见，只用于内部兼容性检查
// - 匹配从上往下，窄的写在前面
// - 只有"返回值随参数变"才真的需要重载，其余用联合类型
// - 箭头函数要用接口的调用签名来写

console.log("\n—— 02-functions/02-overloads.ts 结束 ——");
