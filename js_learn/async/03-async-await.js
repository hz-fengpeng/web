// ============================================
// async/await - 最现代的异步语法
// ============================================

// 模拟异步操作
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUser(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (id > 0) {
                resolve({ id: id, name: "张三", age: 25 });
            } else {
                reject(new Error("无效的 ID"));
            }
        }, 1000);
    });
}

// ============================================
// 使用 async/await（看起来像同步代码）
// ============================================

async function getUserData() {
    console.log("开始获取用户数据...");
    
    try {
        const user = await fetchUser(1);
        console.log("用户:", user);
        
        await delay(1000);
        console.log("处理完成");
        
        return user;
    } catch (error) {
        console.error("错误:", error.message);
    }
}

getUserData();

// ============================================
// 顺序执行多个异步操作
// ============================================

async function processSteps() {
    console.log("\n开始处理步骤...");
    
    await delay(1000);
    console.log("步骤 1 完成");
    
    await delay(1000);
    console.log("步骤 2 完成");
    
    await delay(1000);
    console.log("步骤 3 完成");
    
    console.log("所有步骤完成");
}

//processSteps();

// ============================================
// 并行执行（使用 Promise.all）
// ============================================

async function fetchMultipleUsers() {
    console.log("\n并行获取多个用户...");
    
    const users = await Promise.all([
        fetchUser(1),
        fetchUser(2),
        fetchUser(3)
    ]);
    
    console.log("所有用户:", users);
}

//fetchMultipleUsers();

// ============================================
// 错误处理
// ============================================

async function handleErrors() {
    try {
        const user = await fetchUser(-1);  // 会失败
        console.log(user);
    } catch (error) {
        console.error("\n捕获错误:", error.message);
    }
}

//handleErrors();
