// ============================================
// Promise - 解决回调地狱
// ============================================

// ============================================
// Promise 基本语法
// ============================================

/*
Promise 是一个对象，代表异步操作的最终完成或失败

语法：
new Promise((resolve, reject) => {
    // 异步操作
    if (成功) {
        resolve(结果);  // 将 Promise 状态改为 fulfilled
    } else {
        reject(错误);   // 将 Promise 状态改为 rejected
    }
});

Promise 三种状态：
1. pending（进行中）- 初始状态
2. fulfilled（已成功）- 操作成功完成
3. rejected（已失败）- 操作失败

Promise 方法：
- .then(onFulfilled, onRejected) - 处理成功和失败
- .catch(onRejected) - 处理失败（相当于 .then(null, onRejected)）
- .finally(onFinally) - 无论成功失败都执行
*/

// ============================================
// 创建 Promise 示例
// ============================================
function fetchUser(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (id > 0) {
                resolve({ id: id, name: "张三" });
            } else {
                reject("无效的 ID");
            }
        }, 1000);
    });
}

// 使用 Promise
console.log("开始获取用户...");
fetchUser(1)
    .then(user => {
        console.log("成功:", user);
        return user.id;
    })
    .then(id => {
        console.log("用户 ID:", id);
    })
    .catch(error => {
        console.error("错误:", error);
    })
    .finally(() => {
        console.log("操作完成");
    });

// ============================================
// Promise 链式调用
// ============================================

/*
重要概念：每个 .then() 都会返回一个新的 Promise

链式调用规则：
1. 如果 .then() 返回一个普通值，会被包装成 fulfilled 的 Promise
2. 如果 .then() 返回一个 Promise，下一个 .then() 会等待这个 Promise
3. 如果 .then() 抛出错误，会返回 rejected 的 Promise
4. 如果 .then() 没有 return，相当于 return undefined
*/

// 示例：理解 .then() 返回新 Promise
const promiseA = fetchUser(1);
const promiseB = promiseA.then(user => {
    console.log("\n第一个 then 执行");
    return user.id;  // 返回普通值 1
});
const promiseC = promiseB.then(id => {
    console.log("第二个 then 执行，收到:", id);
    return id * 2;   // 返回普通值 2
});
const promiseD = promiseC.then(doubled => {
    console.log("第三个 then 执行，收到:", doubled);
});

// 等价于链式写法：
// fetchUser(1)
//     .then(user => user.id)
//     .then(id => id * 2)
//     .then(doubled => console.log(doubled));

// 示例：返回 Promise vs 返回普通值
function example1() {
    return Promise.resolve(1)
        .then(value => {
            console.log("\n返回普通值:", value);
            return value + 1;  // 返回 2（普通值）
        })
        .then(value => {
            console.log("收到普通值:", value);  // 立即执行，收到 2
            return new Promise(resolve => {
                setTimeout(() => resolve(value + 1), 1000);
            });  // 返回 Promise
        })
        .then(value => {
            console.log("收到 Promise 结果:", value);  // 等待 1 秒后执行，收到 3
        });
}

example1();

function step1() {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("\n步骤 1");
            resolve(1);
        }, 1000);
    });
}

function step2(value) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("步骤 2");
            resolve(value + 1);
        }, 1000);
    });
}

function step3(value) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("步骤 3");
            resolve(value + 1);
        }, 1000);
    });
}

step1()
    .then(result => step2(result))
    .then(result => step3(result))
    .then(result => {
        console.log("最终结果:", result);
    });

// ============================================
// .then() 返回值的不同情况
// ============================================

console.log("\n--- .then() 返回值测试 ---");

// 情况 1: 返回普通值
Promise.resolve(10)
    .then(value => {
        console.log("\n情况1 - 返回普通值:", value);
        return value * 2;  // 返回 20
    })
    .then(value => {
        console.log("下一个 then 收到:", value);  // 20
    });

// 情况 2: 返回 Promise
Promise.resolve(10)
    .then(value => {
        console.log("\n情况2 - 返回 Promise:", value);
        return Promise.resolve(value * 2);  // 返回 Promise<20>
    })
    .then(value => {
        console.log("下一个 then 收到:", value);  // 20（自动解包）
    });

// 情况 3: 不返回任何值
Promise.resolve(10)
    .then(value => {
        console.log("\n情况3 - 不返回值:", value);
        // 没有 return 语句
    })
    .then(value => {
        console.log("下一个 then 收到:", value);  // undefined
    });

// 情况 4: 抛出错误
Promise.resolve(10)
    .then(value => {
        console.log("\n情况4 - 抛出错误:", value);
        throw new Error("出错了");  // 返回 rejected Promise
    })
    .then(value => {
        console.log("这里不会执行");
    })
    .catch(error => {
        console.log("catch 捕获到:", error.message);
    });

// ============================================
// Promise.all - 并行执行
// ============================================

const promise1 = Promise.resolve(3);
const promise2 = new Promise(resolve => setTimeout(() => resolve(42), 1000));
const promise3 = Promise.resolve("完成");

Promise.all([promise1, promise2, promise3])
    .then(values => {
        console.log("\nPromise.all 结果:", values);
    });

// ============================================
// Promise 其他静态方法
// ============================================

// Promise.race - 返回最快完成的
const fast = new Promise(resolve => setTimeout(() => resolve("快"), 100));
const slow = new Promise(resolve => setTimeout(() => resolve("慢"), 1000));

Promise.race([fast, slow])
    .then(result => {
        console.log("\nPromise.race 结果:", result); // 输出: 快
    });

// Promise.allSettled - 等待所有 Promise 完成（无论成功失败）
const p1 = Promise.resolve(100);
const p2 = Promise.reject("出错了");
const p3 = Promise.resolve(200);

Promise.allSettled([p1, p2, p3])
    .then(results => {
        console.log("\nPromise.allSettled 结果:");
        results.forEach((result, index) => {
            console.log(`Promise ${index + 1}:`, result);
        });
    });

// Promise.any - 返回第一个成功的（ES2021）
const p4 = Promise.reject("错误1");
const p5 = Promise.resolve("成功");
const p6 = Promise.reject("错误2");

Promise.any([p4, p5, p6])
    .then(result => {
        console.log("\nPromise.any 结果:", result); // 输出: 成功
    })
    .catch(error => {
        console.log("所有 Promise 都失败了:", error);
    });

// ============================================
// Promise 错误处理
// ============================================

function riskyOperation() {
    return new Promise((resolve, reject) => {
        const random = Math.random();
        setTimeout(() => {
            if (random > 0.5) {
                resolve("操作成功");
            } else {
                reject(new Error("操作失败"));
            }
        }, 500);
    });
}

riskyOperation()
    .then(result => {
        console.log("\n", result);
    })
    .catch(error => {
        console.error("\n捕获错误:", error.message);
    })
    .finally(() => {
        console.log("清理资源");
    });
