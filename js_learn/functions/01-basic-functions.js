// ============================================
// 函数定义 - 多种方式
// ============================================

// 1. 函数声明（类似 C/C++）
function add(a, b) {
    return a + b;
}
console.log("add(5, 3):", add(5, 3));

// 2. 函数表达式
const multiply = function(a, b) {
    return a * b;
};
console.log("multiply(4, 5):", multiply(4, 5));

// 3. 箭头函数（ES6，简洁语法）
const subtract = (a, b) => a - b;
console.log("subtract(10, 3):", subtract(10, 3));

// 更复杂的箭头函数
const divide = (a, b) => {
    if (b === 0) {
        return "除数不能为 0";
    }
    return a / b;
};
console.log("divide(10, 2):", divide(10, 2));

// ============================================
// 默认参数
// ============================================

function greet(name = "朋友") {
    return `你好, ${name}!`;
}
console.log("\n" + greet());           // 使用默认值
console.log(greet("张三"));            // 使用传入的值

// ============================================
// 剩余参数（类似 C++ 的可变参数）
// ============================================

function sum(...numbers) {
    let total = 0;
    for (let num of numbers) {
        total += num;
    }
    return total;
}
console.log("\nsum(1, 2, 3, 4, 5):", sum(1, 2, 3, 4, 5));

// ============================================
// 函数是一等公民（可以作为参数传递）
// ============================================

function operate(a, b, operation) {
    return operation(a, b);
}

console.log("\n传递函数作为参数:");
console.log("operate(10, 5, add):", operate(10, 5, add));
console.log("operate(10, 5, multiply):", operate(10, 5, multiply));
