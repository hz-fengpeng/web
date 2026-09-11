// ============================================
// 数组 - 动态大小，可存储任意类型
// ============================================

// 创建数组
let numbers = [1, 2, 3, 4, 5];
let mixed = [1, "hello", true, null];  // 可以混合类型

console.log("numbers:", numbers);
console.log("mixed:", mixed);

// 访问元素（与 C/C++ 相同）
console.log("\n第一个元素:", numbers[0]);
console.log("最后一个元素:", numbers[numbers.length - 1]);

// ============================================
// 常用数组方法
// ============================================

// push/pop - 末尾添加/删除
numbers.push(6);
console.log("\npush(6):", numbers);
numbers.pop();
console.log("pop():", numbers);

// unshift/shift - 开头添加/删除
numbers.unshift(0);
console.log("\nunshift(0):", numbers);
numbers.shift();
console.log("shift():", numbers);

// ============================================
// 数组遍历
// ============================================

// forEach 语法速查
/*
arr.forEach(callback)

完整形式：
arr.forEach((element, index, array) => {
    // element: 当前元素（必需）
    // index: 当前索引（可选）
    // array: 数组本身（可选）
})

简化形式：
arr.forEach(element => { ... })           // 只用元素
arr.forEach((element, index) => { ... })  // 元素 + 索引

特点：
✓ 简洁易读
✓ 自动遍历所有元素
✗ 不能 break/continue
✗ 不能 return 退出循环
✗ 没有返回值（返回 undefined）
*/

console.log("\n遍历数组:");

// 传统 for 循环
for (let i = 0; i < numbers.length; i++) {
    console.log(`索引 ${i}: ${numbers[i]}`);
}

// forEach 方法
// 语法：arr.forEach((元素, 索引, 数组本身) => { ... })
console.log("\nforEach:");
numbers.forEach((num, index) => {
    console.log(`索引 ${index}: ${num}`);
});

// forEach 完整语法示例
console.log("\nforEach 完整参数:");
numbers.forEach((element, index, array) => {
    console.log(`元素: ${element}, 索引: ${index}, 数组长度: ${array.length}`);
});

// 只需要元素时，可以省略其他参数
console.log("\n只使用元素:");
numbers.forEach(num => {
    console.log(num * 2);
});

// 使用普通函数（不是箭头函数）
console.log("\n使用普通函数:");
numbers.forEach(function(num, index) {
    console.log(`第 ${index + 1} 个数字是 ${num}`);
});

// forEach vs for 循环对比
console.log("\n对比 for 循环:");
// 传统 for
for (let i = 0; i < numbers.length; i++) {
    console.log(`for: ${numbers[i]}`);
}
// forEach
numbers.forEach((num) => {
    console.log(`forEach: ${num}`);
});

// 注意：forEach 不能 break 或 return 提前退出
console.log("\nforEach 无法提前退出:");
numbers.forEach(num => {
    if (num === 3) {
        return;  // 只跳过当前迭代，不是退出整个循环！
    }
    console.log(num);
});

// 如果需要提前退出，使用 for...of
console.log("\nfor...of 可以提前退出:");
for (let num of numbers) {
    if (num === 3) {
        break;  // 真正退出循环
    }
    console.log(num);
}

// ============================================
// 高阶函数（重要！）
// ============================================

let arr = [1, 2, 3, 4, 5];

// map - 转换每个元素
let doubled = arr.map(x => x * 2);
console.log("\nmap (x * 2):", doubled);

// filter - 过滤元素
let evens = arr.filter(x => x % 2 === 0);
console.log("filter (偶数):", evens);

// reduce - 累积计算（最强大但最难理解的方法）
// 语法：arr.reduce((累积值, 当前元素) => 新累积值, 初始值)
let sum = arr.reduce((acc, x) => acc + x, 0);
console.log("reduce (求和):", sum);

// reduce 执行过程详解：
console.log("\nreduce 执行步骤:");
arr.reduce((acc, x) => {
    console.log(`累积值: ${acc}, 当前元素: ${x}, 返回: ${acc + x}`);
    return acc + x;
}, 0);

// 等价于这个循环：
let manualSum = 0;  // 初始值
for (let x of arr) {
    manualSum = manualSum + x;  // 累积
}
console.log("手动循环求和:", manualSum);

// reduce 的其他用途
// 1. 求最大值
let max = arr.reduce((acc, x) => x > acc ? x : acc);
console.log("\nreduce 求最大值:", max);

// 2. 数组转对象
let fruits = ['apple', 'banana', 'cherry'];
let fruitObj = fruits.reduce((acc, fruit, index) => {
    acc[fruit] = index;
    return acc;
}, {});
console.log("数组转对象:", fruitObj);

// 3. 扁平化数组
let nested = [[1, 2], [3, 4], [5]];
let flattened = nested.reduce((acc, arr) => acc.concat(arr), []);
console.log("扁平化:", flattened);

// 4. 计数
let words = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
let count = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
}, {});
console.log("单词计数:", count);

// ============================================
// reduce 图解理解
// ============================================
/*
arr = [1, 2, 3, 4, 5]
arr.reduce((acc, x) => acc + x, 0)

执行流程：
第1次: acc = 0 (初始值), x = 1  →  返回 0 + 1 = 1
第2次: acc = 1,           x = 2  →  返回 1 + 2 = 3
第3次: acc = 3,           x = 3  →  返回 3 + 3 = 6
第4次: acc = 6,           x = 4  →  返回 6 + 4 = 10
第5次: acc = 10,          x = 5  →  返回 10 + 5 = 15
最终结果: 15

参数说明：
- acc (accumulator): 累积器，保存上一次的返回值
- x (current): 当前正在处理的数组元素
- 0: 初始值，第一次调用时 acc 的值

类比 C++ 的循环：
int sum = 0;  // 初始值
for (int x : arr) {
    sum = sum + x;  // acc = acc + x
}
*/

// find - 查找第一个满足条件的元素
let found = arr.find(x => x > 3);
console.log("find (> 3):", found);

// ============================================
// 数组解构（ES6）
// ============================================

let [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log("\n解构赋值:");
console.log("first:", first);
console.log("second:", second);
console.log("rest:", rest);
