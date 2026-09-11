// ============================================
// 异步编程 - JS 的重要特性
// ============================================

// 1. 回调函数（Callback）
console.log("开始");

setTimeout(() => {
    console.log("2 秒后执行");
}, 2000);

console.log("结束");
// 输出顺序: 开始 -> 结束 -> 2 秒后执行

// ============================================
// 模拟异步操作
// ============================================

function fetchData(callback) {
    console.log("\n正在获取数据...");
    setTimeout(() => {
        const data = { id: 1, name: "用户数据" };
        callback(data);
    }, 1000);
}

fetchData((data) => {
    console.log("收到数据:", data);
});

// ============================================
// 回调地狱问题
// ============================================

function step1(callback) {
    setTimeout(() => {
        console.log("\n步骤 1 完成");
        callback();
    }, 1000);
}

function step2(callback) {
    setTimeout(() => {
        console.log("步骤 2 完成");
        callback();
    }, 1000);
}

function step3(callback) {
    setTimeout(() => {
        console.log("步骤 3 完成");
        callback();
    }, 1000);
}

// 嵌套回调（不推荐）
step1(() => {
    step2(() => {
        step3(() => {
            console.log("所有步骤完成");
        });
    });
});
