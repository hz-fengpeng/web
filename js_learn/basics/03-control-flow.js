// ============================================
// 控制流 - 与 C/C++ 非常相似
// ============================================

// if-else（与 C/C++ 相同）
let score = 85;

if (score >= 90) {
    console.log("优秀");
} else if (score >= 60) {
    console.log("及格");
} else {
    console.log("不及格");
}

// ============================================
// switch（与 C/C++ 相同）
// ============================================

let day = 3;
switch (day) {
    case 1:
        console.log("星期一");
        break;
    case 2:
        console.log("星期二");
        break;
    case 3:
        console.log("星期三");
        break;
    default:
        console.log("其他");
}

// ============================================
// 循环
// ============================================

// for 循环（与 C/C++ 相同）
console.log("\nfor 循环:");
for (let i = 0; i < 5; i++) {
    console.log(i);
}

// while 循环
console.log("\nwhile 循环:");
let count = 0;
while (count < 3) {
    console.log(count);
    count++;
}

// do-while 循环
console.log("\ndo-while 循环:");
let num = 0;
do {
    console.log(num);
    num++;
} while (num < 3);

// ============================================
// for...of 循环（JS 特有，用于数组）
// ============================================

console.log("\nfor...of 循环:");
let numbers = [10, 20, 30];
for (let n of numbers) {
    console.log(n);
}
