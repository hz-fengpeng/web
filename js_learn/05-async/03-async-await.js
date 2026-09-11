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
    console.log(new Date().toISOString(), "[L27]", "开始获取用户数据...");
    
    try {
        const user = await fetchUser(1);
        console.log(new Date().toISOString(), "[L31]", "用户:", user);
        
        await delay(1000);
        console.log(new Date().toISOString(), "[L34]", "处理完成");
        
        return user;
    } catch (error) {
        console.error(new Date().toISOString(), "[L38]", "错误:", error.message);
    }
}

getUserData();

// ============================================
// 顺序执行多个异步操作
// ============================================

async function processSteps() {
    console.log(new Date().toISOString(), "[L49]", "开始处理步骤...");
    
    await delay(1000);
    console.log(new Date().toISOString(), "[L52]", "步骤 1 完成");
    
    await delay(1000);
    console.log(new Date().toISOString(), "[L55]", "步骤 2 完成");
    
    await delay(1000);
    console.log(new Date().toISOString(), "[L58]", "步骤 3 完成");
    
    console.log(new Date().toISOString(), "[L60]", "所有步骤完成");
}

//processSteps();

// ============================================
// 并行执行（使用 Promise.all）
// ============================================

async function fetchMultipleUsers() {
    console.log(new Date().toISOString(), "[L70]", "并行获取多个用户...");
    
    const users = await Promise.all([
        fetchUser(1),
        fetchUser(2),
        fetchUser(3)
    ]);
    
    console.log(new Date().toISOString(), "[L78]", "所有用户:", users);
}

//fetchMultipleUsers();

// ============================================
// 错误处理
// ============================================

async function handleErrors() {
    try {
        const user = await fetchUser(-1);  // 会失败
        console.log(new Date().toISOString(), "[L90]", user);
    } catch (error) {
        console.error(new Date().toISOString(), "[L92]", "捕获错误:", error.message);
    }
}

//handleErrors();
