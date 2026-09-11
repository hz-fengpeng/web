// ============================================
// Symbol - 唯一标识符类型
// ============================================

// Symbol 是 ES6 新增的原始数据类型
// 主要特点：每个 Symbol 都是唯一的

// ============================================
// 1. 创建 Symbol
// ============================================

let sym1 = Symbol();
let sym2 = Symbol();

console.log("sym1 === sym2:", sym1 === sym2);  // false (每个都是唯一的)

// 可以添加描述（仅用于调试）
let sym3 = Symbol("mySymbol");
let sym4 = Symbol("mySymbol");

console.log("sym3 === sym4:", sym3 === sym4);  // false (即使描述相同)
console.log("sym3 的描述:", sym3.description);  // "mySymbol"

// ============================================
// 2. 为什么需要 Symbol？
// ============================================

// 场景 1: 避免属性名冲突
const person = {
    name: "张三",
    age: 25
};

// 如果你想添加一个内部属性，但不想和其他属性冲突
const id = Symbol("id");
person[id] = 12345;

console.log("\nperson 对象:", person);
console.log("person[id]:", person[id]);
console.log("person.name:", person.name);

// ============================================
// 3. Symbol 作为对象属性
// ============================================

const PASSWORD = Symbol("password");
const user = {
    username: "zhangsan",
    [PASSWORD]: "secret123"  // 使用 Symbol 作为属性名
};

console.log("\nuser.username:", user.username);
console.log("user[PASSWORD]:", user[PASSWORD]);

// Symbol 属性不会出现在常规遍历中
console.log("\nObject.keys(user):", Object.keys(user));  // 只显示 username
console.log("for...in 遍历:");
for (let key in user) {
    console.log(key);  // 只显示 username
}

// 获取 Symbol 属性需要特殊方法
console.log("\nObject.getOwnPropertySymbols:", Object.getOwnPropertySymbols(user));

// ============================================
// 4. 全局 Symbol 注册表
// ============================================

// Symbol.for() 创建全局 Symbol
let globalSym1 = Symbol.for("app.id");
let globalSym2 = Symbol.for("app.id");

console.log("\nglobalSym1 === globalSym2:", globalSym1 === globalSym2);  // true

// 获取 Symbol 的 key
console.log("Symbol.keyFor(globalSym1):", Symbol.keyFor(globalSym1));  // "app.id"

// ============================================
// 5. 内置 Symbol
// ============================================

// JavaScript 有很多内置的 Symbol，用于自定义对象行为

// Symbol.iterator - 定义对象的迭代行为
const myArray = {
    data: [1, 2, 3, 4, 5],
    [Symbol.iterator]() {
        let index = 0;
        let data = this.data;
        return {
            next() {
                if (index < data.length) {
                    return { value: data[index++], done: false };
                }
                return { done: true };
            }
        };
    }
};

console.log("\n使用 for...of 遍历自定义对象:");
for (let value of myArray) {
    console.log(value);
}

// ============================================
// 6. 实际应用场景
// ============================================

// 场景 1: 定义对象的私有属性
const _private = Symbol("private");

class MyClass {
    constructor() {
        this[_private] = "这是私有数据";
        this.public = "这是公开数据";
    }
    
    getPrivate() {
        return this[_private];
    }
}

const obj = new MyClass();
console.log("\nobj.public:", obj.public);
console.log("obj.getPrivate():", obj.getPrivate());
console.log("Object.keys(obj):", Object.keys(obj));  // 只显示 public

// 场景 2: 定义常量（避免重复）
const COLOR_RED = Symbol("red");
const COLOR_GREEN = Symbol("green");
const COLOR_BLUE = Symbol("blue");

function getColor(color) {
    switch(color) {
        case COLOR_RED:
            return "红色";
        case COLOR_GREEN:
            return "绿色";
        case COLOR_BLUE:
            return "蓝色";
    }
}

console.log("\ngetColor(COLOR_RED):", getColor(COLOR_RED));

// ============================================
// 7. Symbol 的特点总结
// ============================================

console.log("\n=== Symbol 特点 ===");
console.log("1. 每个 Symbol 都是唯一的");
console.log("2. 不能用 new Symbol() 创建");
console.log("3. 可以作为对象属性名");
console.log("4. 不会出现在 for...in、Object.keys() 中");
console.log("5. 不会被 JSON.stringify() 序列化");

// ============================================
// 8. 类型检查
// ============================================

let sym = Symbol("test");
console.log("\ntypeof sym:", typeof sym);  // "symbol"
console.log("sym.toString():", sym.toString());  // "Symbol(test)"

// ============================================
// 9. 常见的内置 Symbol
// ============================================

console.log("\n常见的内置 Symbol:");
console.log("Symbol.iterator - 迭代器");
console.log("Symbol.toStringTag - 自定义 toString 行为");
console.log("Symbol.hasInstance - 自定义 instanceof 行为");
console.log("Symbol.toPrimitive - 类型转换");
