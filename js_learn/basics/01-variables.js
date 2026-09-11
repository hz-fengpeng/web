// ============================================
// 变量声明 - 与 C/C++ 的对比
// ============================================

// C/C++: int x = 10;
// JS 有三种声明方式：

// 1. let - 块级作用域，可重新赋值
let x = 10;
x = 20; // 可以修改
console.log("let x:", x);

// 2. const - 块级作用域，不可重新赋值
const PI = 3.14159;
// PI = 3.14; // 错误！不能重新赋值
console.log("const PI:", PI);

// 3. var - 函数作用域（旧语法，不推荐）
var y = 30;
console.log("var y:", y);

// ============================================
// 动态类型 - JS 的特点
// ============================================

let value = 42;           // 数字
console.log(typeof value); // "number"

value = "Hello";          // 现在是字符串
console.log(typeof value); // "string"

value = true;             // 现在是布尔值
console.log(typeof value); // "boolean"

// ============================================
// 基本数据类型
// ============================================

let num = 100;                    // Number
let str = "JavaScript";           // String
let bool = true;                  // Boolean
let nothing = null;               // Null
let notDefined;                   // Undefined
let bigNum = 123456789012345n;    // BigInt
let sym = Symbol("unique");       // Symbol


console.log("\n数据类型示例:");
console.log("Number:", num);
console.log("String:", str);
console.log("Boolean:", bool);
console.log("Null:", nothing);
console.log("Undefined:", notDefined);
