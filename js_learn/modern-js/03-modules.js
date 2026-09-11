// ============================================
// ES6 模块 - 类似 C++ 的 #include
// ============================================

// 导出（在其他文件中）
// export const PI = 3.14159;
// export function add(a, b) { return a + b; }
// export default class Calculator { }

// 导入
// import { PI, add } from './math.js';
// import Calculator from './calculator.js';
// import * as Math from './math.js';

// ============================================
// 示例：创建一个简单的模块系统
// ============================================

// utils.js 的内容（示例）
const utils = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => b !== 0 ? a / b : null
};

// 使用
console.log("add(5, 3):", utils.add(5, 3));
console.log("multiply(4, 5):", utils.multiply(4, 5));

// ============================================
// 命名导出 vs 默认导出
// ============================================

// 命名导出（可以有多个）
// export const name = "value";
// export function func() { }

// 默认导出（只能有一个）
// export default class MyClass { }

// 导入方式
// import MyClass from './myclass.js';           // 默认导出
// import { name, func } from './utils.js';      // 命名导出
// import MyClass, { name, func } from './file.js'; // 混合

console.log("\n模块系统说明:");
console.log("- 使用 export 导出");
console.log("- 使用 import 导入");
console.log("- 每个文件是一个模块");
console.log("- 模块作用域是独立的");
