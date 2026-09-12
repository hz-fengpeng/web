// ============================================
// 02 基础类型
// ============================================
//
// 语法：变量名: 类型
//
//   C/C++:  int count = 0;         ← 类型写在前面
//   TS:     let count: number = 0; ← 类型写在后面（用冒号隔开）
//
// 为什么反过来？因为 TS 要兼容所有已有的 JS 写法（`let count = 0` 必须合法），
// 只能在后面追加信息，不能改前面的语法。

// ============================================
// 一、最基本的三种
// ============================================

const name: string = "张三";
const age: number = 20;
const isStudent: boolean = true;

console.log("string :", name);
console.log("number :", age);
console.log("boolean:", isStudent);

// ---- number 只有一种 ----
// C/C++: short / int / long / float / double / unsigned ... 分得很细
// TS   : 全部是 number，底层就是双精度浮点（IEEE 754 double）

const a: number = 42;        // 整数
const b: number = 3.14;      // 小数
const c: number = -1;        // 负数
const d: number = 1e6;       // 科学计数法
console.log("\n42 和 3.14 和 -1 和 1e6 都是 number：", a, b, c, d);

// 所以要注意和 C/C++ 不同的地方：
console.log("0.1 + 0.2 =", 0.1 + 0.2);            // 0.30000000000000004，浮点误差
console.log("大整数丢精度：", 2 ** 53 + 1 === 2 ** 53); // true，超过 2^53 就不准了

// 需要精确的大整数时用 bigint，字面量后面加 n
const big: bigint = 12345678901234567890n;
console.log("bigint:", big);

// bigint 和 number 不能混着算，这是故意的（避免悄悄丢精度）
const one: number = 1;
// const mixed = big + one;
//   ❌ error TS2365: Operator '+' cannot be applied to types 'bigint' and 'number'.
// 要算就先显式转换：big + BigInt(one) 或者 Number(big) + one

// ============================================
// 二、数组
// ============================================
// 两种写法完全等价，社区更常用第一种

const numbers: number[] = [1, 2, 3];
const names: Array<string> = ["张三", "李四"];      // 泛型写法，第 02 章会讲 <T>

console.log("\n数组：", numbers, names);

// 混合类型的数组，用联合类型（下面第六节）
const mixed: (string | number)[] = ["张三", 20, "李四", 30];
console.log("混合数组：", mixed);

// 空数组必须标类型，否则 TS 推断成 any[]（推断规则见 03）
const empty: number[] = [];

// 数组里的元素类型是已知的，所以下面这些能被拦住：
// numbers.push("字符串");   // ❌ error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
// const n: number = numbers[0];   // ✅ 下标访问返回的是 number

// ============================================
// 三、元组 tuple
// ============================================
// 长度固定、每个位置的类型也固定的数组。
// 相当于 C++ 的 std::tuple<string, int, bool>

const record: [string, number, boolean] = ["张三", 20, true];
console.log("\n元组：", record);
console.log("解构取出来的类型是自动对应的：", record[0], record[1], record[2]);

// 元组和数组的区别就在"固定"两个字上：
// record[0] = 1;
//   ❌ error TS2322: Type 'number' is not assignable to type 'string'.   ← 位置类型固定
// console.log(record[3]);
//   ❌ error TS2493: Tuple type '[string, number, boolean]' of length '3' has no element at index '3'.
//
// 对比一下数组：越界访问 TS **不会**报错，只是悄悄给你 undefined
const arr: number[] = [1, 2];
console.log("数组越界取值，TS 不拦：", arr[99]);
//   → undefined。这是 JS 的历史遗留问题，元组有边界检查，数组没有。
//     想连数组也检查，在 tsconfig 里打开 noUncheckedIndexedAccess（见 README）。
//
// 一个要注意的不严谨处：元组的 push **拦不住**
// record.push("李四");   // ⚠️ 不报错！TS 允许 push 元素类型的并集
// 想彻底锁死就用 readonly 元组：
// const locked: readonly [string, number] = ["张三", 20];
// locked.push("李四");
//   ❌ error TS2339: Property 'push' does not exist on type 'readonly [string, number]'.

// 元组最常见的用途：函数返回多个值（代替 C++ 的 std::pair / 输出参数）
function divmod(x: number, y: number): [number, number] {
  return [Math.floor(x / y), x % y];
}
const [quotient, remainder] = divmod(17, 5);
console.log("17 ÷ 5 =", quotient, "余", remainder);

// ============================================
// 四、对象类型
// ============================================

const user: { name: string; age: number } = { name: "张三", age: 20 };
console.log("\n对象：", user);

// 每个属性都要写类型太啰嗦，所以通常起个名字。有两种方式，先用 `type`
type User = { name: string; age: number };

const user1: User = { name: "张三", age: 20 };
const user2: User = { name: "李四", age: 22 };   // 复用了同一个形状
console.log("复用的类型：", user1.name, user2.name);

// 对象比字面量多写属性会被拦住 —— 这个检查叫"多余属性检查"
// const user3: User = { name: "王五", age: 30, gender: "男" };
//   ❌ error TS2353: Object literal may only specify known properties,
//      and 'gender' does not exist in type 'User'.
// 少写属性同样不行：
// const user4: User = { name: "王五" };
//   ❌ error TS2741: Property 'age' is missing in type '{ name: string; }' but required in type 'User'.

// ============================================
// 五、null 和 undefined
// ============================================
// JS 有两个"空值"，而且**不能互相赋值**（这点和很多语言不一样）

const nothing: null = null;
const notSet: undefined = undefined;
console.log("\nnull:", nothing, " undefined:", notSet);

// 它们最重要的规则在第 05 节讲：strict 模式下，null 不能随便赋给别的类型。
// 这是 TS 最有价值的功能之一。

// ============================================
// 六、联合类型
// ============================================
// 表示"是这几种之一"，写法是竖线。
// 相当于 C++ 的 std::variant<string, number>

let id: string | number = 1;
console.log("\n联合类型 id 现在是：", id);
id = "abc-001";          // ✅ 换成字符串也行
console.log("换成字符串也可以：", id);
// id = true;            // ❌ error TS2322: Type 'boolean' is not assignable to type 'string | number'.

// 但用的时候要小心：只能调用两种类型**都有**的方法。
// 下面写在函数参数上，因为没有赋值语句，TS 无法收窄，一定报错：
function printId(value: string | number): void {
  console.log("id 是：", value);
  // console.log(value.toUpperCase());
  //   ❌ error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  //      Property 'toUpperCase' does not exist on type 'number'.
  // 想用得先判断是哪种 —— 这叫"类型收窄"，第 04 章专门讲。
}
printId(id);

// 顺带一提：上面那种"先给 id 赋个字符串，再调 toUpperCase"的写法**不会**报错，
// 因为 TS 会顺着赋值语句把 id 收窄成 string。收窄是好东西，但也容易让人误会规则。

// ============================================
// 七、字面量类型（先混个脸熟）
// ============================================
// 类型可以就写一个具体的值，表示"只能等于这个值"

let direction: "left" | "right" = "left";
console.log("字面量类型：", direction);
// direction = "up";     // ❌ error TS2322: Type '"up"' is not assignable to type '"left" | "right"'.

// 这是 TS 里替代 enum 的常用做法（本环境禁用了 enum，原因见 README）。
// 详细用法在 03-objects/03-union-and-literal.ts。

// ============================================
// 小结：和 C/C++ 的类型对照
// ============================================
//
//   C/C++                    TypeScript
//   -----------------------  ---------------------------
//   int / long / float ...   number（只有一种）
//   std::string              string
//   bool                     boolean
//   std::vector<int>         number[] 或 Array<number>
//   std::tuple<...>          [string, number, boolean]
//   struct { ... }           type X = { ... }  /  interface X { ... }
//   std::variant<A, B>       A | B
//   （没有对应物）           字面量类型 "left" | "right"
//
// 最大的差别：C/C++ 的类型是"内存布局的约定"，TS 的类型是"取值的集合"。
// TS 的 number 不是"4 字节"，而是"所有数字"，运行时它连这个都不管。

console.log("\n—— 02-basic-types.ts 结束 ——");
