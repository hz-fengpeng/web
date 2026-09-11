// ============================================
// 什么是 ES6 (ECMAScript 2015)
// ============================================

// ECMAScript = JavaScript 的标准规范
// ES6 = ECMAScript 第 6 版 = ECMAScript 2015

// 类比：
// C++98, C++11, C++14, C++17, C++20  (C++ 标准)
// ES5, ES6, ES7, ES8, ES9, ES10...   (JavaScript 标准)

console.log("=== JavaScript 版本历史 ===");
console.log("ES5 (2009) - 旧版本");
console.log("ES6 (2015) - 重大更新！");
console.log("ES7 (2016) - 小更新");
console.log("ES8 (2017) - async/await");
console.log("ES9-ES13 (2018-2022) - 持续更新");

// ============================================
// ES6 的主要新特性
// ============================================

console.log("\n=== ES6 主要新特性 ===\n");

// 1. let 和 const（替代 var）
console.log("1. let 和 const");
let x = 10;
const PI = 3.14;
console.log("   let x =", x);
console.log("   const PI =", PI);

// 2. 箭头函数
console.log("\n2. 箭头函数");
// ES5 写法
var add1 = function(a, b) {
    return a + b;
};
// ES6 写法
const add2 = (a, b) => a + b;
console.log("   add(5, 3) =", add2(5, 3));

// 3. 模板字符串
console.log("\n3. 模板字符串");
let name = "张三";
let age = 25;
// ES5 写法
console.log("   ES5: " + name + " 今年 " + age + " 岁");
// ES6 写法
console.log(`   ES6: ${name} 今年 ${age} 岁`);

// 4. 解构赋值
console.log("\n4. 解构赋值");
const person = { name: "李四", age: 30 };
const { name: personName, age: personAge } = person;
console.log("   name:", personName, "age:", personAge);

const [first, second] = [1, 2, 3];
console.log("   first:", first, "second:", second);

// 5. 默认参数
console.log("\n5. 默认参数");
function greet(name = "朋友") {
    return `你好, ${name}!`;
}
console.log("   greet():", greet());
console.log("   greet('张三'):", greet("张三"));

// 6. 展开运算符
console.log("\n6. 展开运算符 (...)");
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("   合并数组:", combined);

// 7. 类 (Class)
console.log("\n7. 类 (Class)");
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    
    sayHello() {
        return `我是 ${this.name}`;
    }
}
const p = new Person("王五", 28);
console.log("   " + p.sayHello());

// 8. Promise（异步编程）
console.log("\n8. Promise");
const promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("完成"), 1000);
});
console.log("   Promise 创建成功（1秒后完成）");

// 9. 模块系统
console.log("\n9. 模块系统 (import/export)");
console.log("   export const PI = 3.14;");
console.log("   import { PI } from './math.js';");

// 10. Symbol 类型
console.log("\n10. Symbol 类型");
const sym = Symbol("unique");
console.log("   Symbol:", sym.toString());

// ============================================
// ES6 vs ES5 对比
// ============================================

console.log("\n=== ES6 vs ES5 对比 ===\n");

// 变量声明
console.log("变量声明:");
console.log("ES5: var x = 10;");
console.log("ES6: let x = 10; const PI = 3.14;");

// 函数
console.log("\n函数:");
console.log("ES5: function add(a, b) { return a + b; }");
console.log("ES6: const add = (a, b) => a + b;");

// 字符串拼接
console.log("\n字符串:");
console.log("ES5: 'Hello ' + name");
console.log("ES6: `Hello ${name}`");

// 类
console.log("\n类:");
console.log("ES5: function Person(name) { this.name = name; }");
console.log("ES6: class Person { constructor(name) { ... } }");

// ============================================
// 为什么 ES6 重要？
// ============================================

console.log("\n=== 为什么 ES6 重要？ ===");
console.log("1. 语法更简洁、更易读");
console.log("2. 添加了类、模块等现代特性");
console.log("3. 更好的异步编程支持 (Promise)");
console.log("4. 更接近其他现代编程语言");
console.log("5. 现在几乎所有浏览器都支持");

// ============================================
// 学习建议
// ============================================

console.log("\n=== 学习建议 ===");
console.log("✅ 直接学习 ES6+ 语法（现代标准）");
console.log("✅ 使用 let/const 代替 var");
console.log("✅ 使用箭头函数");
console.log("✅ 使用模板字符串");
console.log("❌ 不要学习过时的 ES5 写法");

// ============================================
// 浏览器兼容性
// ============================================

console.log("\n=== 浏览器兼容性 ===");
console.log("现代浏览器 (2015+): 完全支持 ES6");
console.log("旧浏览器 (IE11): 需要 Babel 转译");
console.log("Node.js (v6+): 完全支持 ES6");
console.log("\n你现在学习，直接用 ES6+ 就行！");
