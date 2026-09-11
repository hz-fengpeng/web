// ============================================
// 深入理解 undefined
// ============================================

// undefined 既是类型，也是值
let a;
console.log("变量 a 的值:", a);           // undefined (这就是值)
console.log("变量 a 的类型:", typeof a);  // "undefined" (这是类型)

// ============================================
// undefined 是一个实际的值
// ============================================

// 可以直接比较
console.log("\na === undefined:", a === undefined);  // true

// 可以赋值（虽然不推荐）
let b = undefined;
console.log("b 的值:", b);  // undefined

// ============================================
// 类比 C/C++ 来理解
// ============================================

console.log("\n类比 C/C++:");
console.log("C++: int x;        // 未初始化，值是随机的");
console.log("JS:  let x;        // 自动初始化为 undefined");
console.log("");
console.log("C++: int* ptr = nullptr;  // 空指针");
console.log("JS:  let ptr = null;      // 空值");

// ============================================
// undefined 在内存中的表示
// ============================================

console.log("\n内存角度:");
console.log("当你声明 let x; 时：");
console.log("1. JS 引擎在内存中分配空间");
console.log("2. 自动将这个空间的值设为 undefined");
console.log("3. undefined 是 JS 的一个特殊值，表示'还没有赋值'");

// ============================================
// 实际例子
// ============================================

let name;
console.log("\n声明后立即打印:");
console.log("name 的值是:", name);  // undefined

// 这个 undefined 是真实存在的值
if (name === undefined) {
    console.log("name 确实等于 undefined 这个值");
}

// 赋值后
name = "张三";
console.log("\n赋值后:");
console.log("name 的值是:", name);  // "张三"

// ============================================
// undefined 是全局对象的属性
// ============================================

console.log("\nundefined 是全局属性:");
console.log("window.undefined (浏览器):", typeof globalThis.undefined);
console.log("global.undefined (Node.js):", typeof global.undefined);

// ============================================
// 对比其他语言
// ============================================

console.log("\n对比其他语言:");
console.log("Python: x = None");
console.log("Java:   String x = null;");
console.log("C++:    int* x = nullptr;");
console.log("JS:     let x = undefined; (自动)");
console.log("        let y = null;      (手动)");

// ============================================
// 总结
// ============================================

console.log("\n=== 总结 ===");
console.log("undefined 是一个具体的值，就像 42、'hello'、true 一样");
console.log("当你声明变量但不赋值时，JS 自动把 undefined 这个值赋给它");
console.log("这样做的好处：避免了 C/C++ 中未初始化变量的随机值问题");
