// ============================================
// 03 泛型
// ============================================
//
// 泛型 = "类型参数"。让函数/类/接口在**保持类型信息**的前提下适用于多种类型。
//
// 这是 TS 里最像 C++ 模板的部分，语法几乎一一对应：
//
//   C++:  template <typename T> T identity(T value) { return value; }
//   TS:   function identity<T>(value: T): T { return value; }
//
// 但运行时的实现完全不同 —— 见本文件最后一节，那是重点。

// ============================================
// 一、不用泛型会怎样
// ============================================

// 方案 A：写死类型 —— 只能用于 string
function firstString(items: string[]): string {
  return items[0];
}

// 方案 B：用 any —— 什么都能传，但**类型信息全丢了**
function firstAny(items: any[]): any {
  return items[0];
}

const s1 = firstAny(["a", "b"]);
console.log("--- 没有泛型 ---");
console.log("firstAny 返回的类型是 any，所以下面这行 TS 拦不住：");
console.log("  s1.toFixed(2) 会被放行，运行时才炸 —— 但它其实是字符串");
console.log("  （这里就不真的调用了，不然文件会崩）");
console.log("firstString 的类型是对的：", firstString(["a", "b"]));

// 方案 C：泛型 —— 既通用又保住类型
function first<T>(items: T[]): T {
  return items[0];
}

const n = first([1, 2, 3]);          // n 是 number
const str = first(["a", "b"]);       // str 是 string
const user = first([{ name: "张三" }]); // user 是 { name: string }
console.log("\n泛型版本：", n, str, user.name);
console.log("而且类型全都保住了，可以直接用：" + (n + 1));

// 大多数时候连 <T> 都不用写，TS 会从实参推断出来（这叫"类型实参推断"）
// first<number>([1, 2, 3])  ← 完整写法，但没必要

// ============================================
// 二、泛型约束：extends
// ============================================
// 泛型默认什么类型都能传，所以**不能假设它有某个属性**。
// 想用某个属性，就得先约定"T 至少得长这样"。

// 不约束的话：
// function longestBad<T>(a: T, b: T): T {
//   return a.length >= b.length ? a : b;
//   ❌ error TS2339: Property 'length' does not exist on type 'T'.
// }
// 报错是合理的：T 可能是 number，number 没有 length。

// 加约束：T 必须有 length 属性
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

console.log("\n--- 泛型约束 ---");
console.log("字符串比长度：", longest("abc", "de"));
console.log("数组比长度：", longest([1, 2, 3], [1]));

// 传没有 length 的类型会被拦住：
// longest(1, 2);
//   ❌ error TS2345: Argument of type 'number' is not assignable to
//      parameter of type '{ length: number; }'.

// 对比 C++：
//   C++20:  template <typename T> requires requires(T t) { t.length(); }
//   TS:     <T extends { length: number }>
// 效果类似，但 TS 的约束只是"编译期的约定"，不影响运行时。

// 另一个常用的约束：只能传"有某个 key"的类型
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const person = { name: "张三", age: 20 };
const personName = getValue(person, "name");   // 类型是 string
const personAge = getValue(person, "age");     // 类型是 number
console.log("按 key 取值：", personName, personAge);
// getValue(person, "gender");
//   ❌ error TS2345: Argument of type '"gender"' is not assignable to parameter of type '"age" | "name"'.

// ============================================
// 三、泛型用在类型别名和接口上
// ============================================

// 类型别名
type Box<T> = { value: T; label: string };

const numBox: Box<number> = { value: 42, label: "数字盒子" };
const strBox: Box<string> = { value: "hello", label: "字符串盒子" };
console.log("\n--- 泛型类型 ---");
console.log(numBox.label, numBox.value, "/", strBox.label, strBox.value);
// numBox.value.toUpperCase();   // ❌ number 没有 toUpperCase，TS 知道

// 最实用的一个：统一的接口返回结构
type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const userResponse: ApiResponse<{ name: string }> = {
  ok: true,
  data: { name: "张三" },
};
const listResponse: ApiResponse<string[]> = {
  ok: true,
  data: ["a", "b"],
};
console.log("接口返回结构：", userResponse.data.name, listResponse.data.length);

// 泛型可以带默认值（和函数参数默认值一个意思）
type Result<T = unknown> = { ok: boolean; data: T };
const anyResult: Result = { ok: false, data: null };   // 不写 T，就是 unknown
console.log("默认类型参数：", anyResult.ok);

// ============================================
// 四、泛型类
// ============================================
// 注意这里写的是普通字段 + 构造函数赋值，**不是**参数属性写法。
// TS 里常见的简写 `constructor(private value: T)` 在本环境用不了 —— 见本节末尾。

class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log("\n--- 泛型类 ---");
console.log("栈大小：", numberStack.size, "弹出：", numberStack.pop(), "剩余：", numberStack.size);
// numberStack.push("字符串");   // ❌ error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

const stringStack = new Stack<string>();
stringStack.push("hello");
console.log("字符串栈：", stringStack.pop());

// ============================================
// 五、TS 泛型 vs C++ 模板（重点）
// ============================================
//
//   对比项        C++ 模板                          TS 泛型
//   ------------  --------------------------------  ---------------------------------
//   语法          template <typename T>             <T>
//   检查时机      实例化时才检查函数体              定义时就对着约束检查函数体
//   运行时产物    每个用到的类型生成一份机器码      全部擦除，运行时只有一份代码
//   约束          concepts / requires (C++20)       extends
//   特化          支持全特化、偏特化                不支持
//
// 三点展开：

// 1. 运行时代码只有一份（类型擦除）
//    C++ 的模板是"代码生成器"：Stack<int> 和 Stack<string> 是两份独立的机器码。
//    TS 的泛型只是给编译器看的，编译完 <T> 就没影了 —— 不存在"代码膨胀"。
//    你可以自己验证（在 ts_learn 目录下跑）：
//      npx tsc 02-functions/03-generics.ts --ignoreConfig --outDir /tmp/out
//      cat /tmp/out/03-generics.js
//
//    生成的 JS 里，`function first<T>(items: T[]): T` 变成了 `function first(items)`，
//    `class Stack<T>` 变成了 `class Stack` —— <T> 和约束全都不见了。
//    （--ignoreConfig 是因为直接指定文件时 tsc 不会再读 tsconfig.json，
//     不加它会报 TS5112。）

// 2. 检查时机不同
//    C++ 的模板函数，只要没人调用，写错也不报错（因为不实例化就不检查）。
//    TS 的泛型函数一写出来就要通过检查。这更安全，但也意味着
//    你要把约束写清楚，否则函数体里什么都干不了（比如上面那个 length）。

// 3. 没有特化
//    想要"针对某些类型走不同逻辑"，TS 的写法是**在函数体里用类型收窄判断**，
//    而不是写特化版本。

// ============================================
// 六、一个必须知道的限制：参数属性用不了
// ============================================
// 你可能在很多 TS 教程里见过这种简写：
//
//   class User {
//     constructor(private name: string, public age: number) {}
//   }
//   ↑ 这叫"参数属性"，一个写法同时完成声明 + 赋值
//
// 但本环境**用不了**，会报：
//   error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
//
// 因为参数属性需要编译器生成 `this.name = name` 这样的代码，
// 而 node 只是把类型删掉，不会帮你生成任何东西。
// 本环境为了和 node 直接运行保持一致，把这类"擦不掉"的语法全禁了。

// 受影响的语法一共就这几种，遇到换成普通写法即可：
//   ✗ enum              → 用联合字面量类型代替（见 03-objects/03）
//   ✗ namespace         → 用 ES 模块（import/export）
//   ✗ 参数属性          → 写成普通字段 + 构造函数里赋值（上面 Stack 那样）
//   ✗ 旧式装饰器        → 本目录用不到

// ============================================
// 小结
// ============================================
// - 泛型让代码通用，同时**不丢类型信息**（any 会丢）
// - <T> 是类型参数，和 C++ 的 template<typename T> 一个意思
// - extends 是约束，比 C++ 的 concepts 写起来简单
// - TS 泛型编译后完全消失，没有代码膨胀，也没有运行时开销
// - 参数属性、enum、namespace 在本环境被禁用，要换写法

console.log("\n—— 02-functions/03-generics.ts 结束 ——");
