// ============================================
// 展开运算符 (Spread Operator) - ...
// ============================================

// 数组展开
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("合并数组:", combined);

// 复制数组
const original = [1, 2, 3];
const copy = [...original];
console.log("复制数组:", copy);

// 函数参数展开
function add(a, b, c) {
    return a + b + c;
}
const numbers = [1, 2, 3];
console.log("展开参数:", add(...numbers));

// ============================================
// 对象展开
// ============================================

const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const merged = { ...obj1, ...obj2 };
console.log("\n合并对象:", merged);

// 覆盖属性
const person = { name: "张三", age: 25 };
const updated = { ...person, age: 26 };
console.log("更新属性:", updated);

// ============================================
// 剩余参数 (Rest Parameters)
// ============================================

function sum(...numbers) {
    return numbers.reduce((acc, n) => acc + n, 0);
}

console.log("\nsum(1, 2, 3, 4, 5):", sum(1, 2, 3, 4, 5));

// 结合普通参数
function multiply(multiplier, ...numbers) {
    return numbers.map(n => n * multiplier);
}

console.log("multiply(2, 1, 2, 3):", multiply(2, 1, 2, 3));
