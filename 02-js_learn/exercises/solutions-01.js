// ============================================
// 练习 1 答案
// ============================================

// 任务 1: 计算平均值
function average(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
}
console.log("average([1, 2, 3, 4, 5]):", average([1, 2, 3, 4, 5]));

// 任务 2: 过滤偶数
function filterEven(numbers) {
    return numbers.filter(num => num % 2 === 0);
}
console.log("filterEven([1, 2, 3, 4, 5, 6]):", filterEven([1, 2, 3, 4, 5, 6]));

// 任务 3: 反转字符串
function reverseString(str) {
    return str.split('').reverse().join('');
}
console.log("reverseString('hello'):", reverseString("hello"));

// 任务 4: 检查质数
function isPrime(num) {
    if (num <= 1) return false;
    if (num === 2) return true;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}
console.log("isPrime(7):", isPrime(7));
console.log("isPrime(10):", isPrime(10));
