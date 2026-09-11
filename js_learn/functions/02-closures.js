// ============================================
// 闭包 - JS 的重要概念
// ============================================

// 为什么需要闭包？
// 1. 数据封装和私有变量（JS 没有 private 关键字）
// 2. 保持状态（函数执行完后变量不会被销毁）
// 3. 避免全局变量污染
// 4. 创建工厂函数和模块化代码

// ============================================
// 问题：没有闭包会怎样？
// ============================================

// 方式1：使用全局变量（不好！）
let globalCount = 0;  // 任何人都能修改

function incrementGlobal() {
    globalCount++;
    return globalCount;
}

console.log("全局变量方式:");
console.log(incrementGlobal()); // 1
globalCount = 999;  // 糟糕！被意外修改了
console.log(incrementGlobal()); // 1000

// 方式2：使用闭包（好！）
function createSecureCounter() {
    let count = 0;  // 外部无法直接访问
    
    return function() {
        count++;
        return count;
    };
}

const secureCounter = createSecureCounter();
console.log("\n闭包方式:");
console.log(secureCounter()); // 1
console.log(secureCounter()); // 2
// count 变量无法从外部访问或修改！

// ============================================

// 闭包：函数可以访问外部作用域的变量
function createCounter() {
    let count = 0;  // 私有变量
    
    return {
        increment: function() {
            count++;
            return count;
        },
        decrement: function() {
            count--;
            return count;
        },
        getCount: function() {
            return count;
        }
    };
}

const counter = createCounter();
console.log("increment:", counter.increment()); // 1
console.log("increment:", counter.increment()); // 2
console.log("getCount:", counter.getCount());   // 2
console.log("decrement:", counter.decrement()); // 1

// ============================================
// 实用示例：创建私有变量
// ============================================

function createBankAccount(initialBalance) {
    let balance = initialBalance;
    
    return {
        deposit(amount) {
            balance += amount;
            return balance;
        },
        withdraw(amount) {
            if (amount <= balance) {
                balance -= amount;
                return balance;
            }
            return "余额不足";
        },
        getBalance() {
            return balance;
        }
    };
}

const account = createBankAccount(1000);
console.log("\n初始余额:", account.getBalance());
console.log("存款 500:", account.deposit(500));
console.log("取款 200:", account.withdraw(200));
console.log("当前余额:", account.getBalance());

// ============================================
// 与 C++ 的对比
// ============================================

// C++ 中你会这样写：
/*
class BankAccount {
private:
    double balance;  // private 成员
    
public:
    BankAccount(double initial) : balance(initial) {}
    
    double deposit(double amount) {
        balance += amount;
        return balance;
    }
};
*/

// JavaScript 没有真正的 private（ES2022 之前），闭包提供了类似功能！

// ============================================
// 闭包的实际应用场景
// ============================================

// 1. 事件处理器
function setupButton(buttonId) {
    let clickCount = 0;  // 每个按钮有自己的计数
    
    return function() {
        clickCount++;
        console.log(`按钮 ${buttonId} 被点击了 ${clickCount} 次`);
    };
}

const button1Handler = setupButton("btn1");
const button2Handler = setupButton("btn2");

button1Handler(); // 按钮 btn1 被点击了 1 次
button1Handler(); // 按钮 btn1 被点击了 2 次
button2Handler(); // 按钮 btn2 被点击了 1 次

// 2. 函数工厂
function createMultiplier(multiplier) {
    return function(number) {
        return number * multiplier;
    };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log("\n函数工厂:");
console.log("double(5):", double(5));   // 10
console.log("triple(5):", triple(5));   // 15

// 3. 延迟执行和缓存
function createCache() {
    const cache = {};  // 私有缓存对象
    
    return function(key, value) {
        if (value !== undefined) {
            cache[key] = value;
            return `已缓存: ${key}`;
        }
        return cache[key] || "未找到";
    };
}

const myCache = createCache();
console.log("\n缓存示例:");
console.log(myCache("name", "张三"));
console.log(myCache("name"));  // 张三

// ============================================
// 总结：闭包的核心价值
// ============================================
// 1. 数据隐藏：外部无法直接访问内部变量
// 2. 状态保持：变量在函数执行后仍然存在
// 3. 避免污染：不需要创建全局变量
// 4. 模块化：每个闭包都是独立的实例
