// ============================================
// 解构赋值 - ES6 特性
// ============================================

// 数组解构
const [a, b, c] = [1, 2, 3];
console.log("数组解构:", a, b, c);

// 跳过元素
const [first, , third] = [1, 2, 3];
console.log("跳过元素:", first, third);

// 剩余元素
const [head, ...tail] = [1, 2, 3, 4, 5];
console.log("head:", head);
console.log("tail:", tail);

// ============================================
// 对象解构
// ============================================

const person = {
    name: "张三",
    age: 25,
    city: "北京"
};

const { name, age } = person;
console.log("\n对象解构:", name, age);

// 重命名
const { name: userName, age: userAge } = person;
console.log("重命名:", userName, userAge);

// 默认值
const { name: n, country = "中国" } = person;
console.log("默认值:", n, country);

// ============================================
// 函数参数解构
// ============================================

function printUser({ name, age }) {
    console.log(`\n姓名: ${name}, 年龄: ${age}`);
}

printUser(person);

// 数组参数解构
function sum([a, b, c]) {
    return a + b + c;
}

console.log("sum([1, 2, 3]):", sum([1, 2, 3]));
