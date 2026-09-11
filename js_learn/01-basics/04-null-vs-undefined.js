// ============================================
// null vs undefined - 重要区别
// ============================================

// undefined - "未定义"，系统自动赋值
// null - "空值"，程序员主动赋值

// ============================================
// 1. undefined 的情况
// ============================================

// 情况 1: 声明但未赋值
let a;
console.log("声明但未赋值:", a);  // undefined

// 情况 2: 访问不存在的对象属性
let person = { name: "张三" };
console.log("不存在的属性:", person.age);  // undefined

// 情况 3: 函数没有返回值
function noReturn() {
    // 没有 return 语句
}
console.log("无返回值函数:", noReturn());  // undefined

// 情况 4: 函数参数未传递
function greet(name) {
    console.log("参数:", name);
}
greet();  // undefined

// ============================================
// 2. null 的情况
// ============================================

// null 表示"故意设置为空"
let user = null;  // 明确表示"没有用户"
console.log("\n主动设置为 null:", user);

// 实际使用场景
let currentUser = null;  // 初始化：还没有登录用户

function login(username) {
    if (username) {
        currentUser = { name: username };
    }
}

console.log("登录前:", currentUser);  // null
login("张三");
console.log("登录后:", currentUser);  // { name: "张三" }

// ============================================
// 3. 类型检查
// ============================================

console.log("\n类型检查:");
console.log("typeof undefined:", typeof undefined);  // "undefined"
console.log("typeof null:", typeof null);            // "object" (这是 JS 的历史 bug！)

// ============================================
// 4. 比较
// ============================================

console.log("\n比较:");
console.log("null == undefined:", null == undefined);    // true (宽松相等)
console.log("null === undefined:", null === undefined);  // false (严格相等)

console.log("null == 0:", null == 0);    // false
console.log("undefined == 0:", undefined == 0);  // false

// ============================================
// 5. 布尔转换
// ============================================

console.log("\n布尔转换:");
console.log("Boolean(null):", Boolean(null));          // false
console.log("Boolean(undefined):", Boolean(undefined));  // false

if (!null) {
    console.log("null 在 if 中被视为 false");
}

if (!undefined) {
    console.log("undefined 在 if 中被视为 false");
}

// ============================================
// 6. 实际使用建议
// ============================================

console.log("\n使用建议:");

// ✅ 好的做法
let data = null;  // 明确表示"暂时没有数据"

function fetchData() {
    // 如果获取失败，返回 null
    return null;
}

// ❌ 不好的做法
let value = undefined;  // 不要主动赋值为 undefined

// ============================================
// 7. 检查空值的最佳实践
// ============================================

function processValue(val) {
    // 方法 1: 检查是否为 null 或 undefined
    if (val == null) {  // 同时检查 null 和 undefined
        console.log("\n值为空");
        return;
    }
    
    // 方法 2: 使用严格相等
    if (val === null) {
        console.log("值为 null");
    }
    
    if (val === undefined) {
        console.log("值为 undefined");
    }
    
    // 方法 3: 使用空值合并运算符（ES2020）
    const result = val ?? "默认值";
    console.log("使用 ?? 运算符:", result);
}

processValue(null);
processValue(undefined);
processValue("实际值");

// ============================================
// 总结
// ============================================

console.log("\n=== 总结 ===");
console.log("undefined: 系统自动赋值，表示'未定义'");
console.log("null: 程序员主动赋值，表示'空值'");
console.log("建议: 用 null 表示'故意为空'，让 undefined 保持其默认含义");
