// ============================================
// 对象 - 类似 C++ 的 struct，但更灵活
// ============================================

// 创建对象
let person = {
    name: "张三",
    age: 25,
    city: "北京",
    greet: function() {
        console.log(`你好，我是 ${this.name}`);
    }
};

console.log("person:", person);
console.log("访问属性:", person.name);
console.log("访问属性:", person["age"]);
person.greet();

// ============================================
// 添加/修改/删除属性
// ============================================

person.email = "zhangsan@example.com";  // 添加
person.age = 26;                         // 修改
delete person.city;                      // 删除

console.log("\n修改后:", person);

// ============================================
// 对象方法的简写（ES6）
// ============================================

let calculator = {
    add(a, b) {
        return a + b;
    },
    subtract(a, b) {
        return a - b;
    }
};

console.log("\ncalculator.add(5, 3):", calculator.add(5, 3));

// ============================================
// 对象解构
// ============================================

let { name, age } = person;
console.log("\n解构:", name, age);

// ============================================
// 遍历对象
// ============================================

console.log("\n遍历对象属性:");
for (let key in person) {
    console.log(`${key}: ${person[key]}`);
}

// Object.keys/values/entries
console.log("\nObject.keys:", Object.keys(person));
console.log("Object.values:", Object.values(person));
console.log("Object.entries:", Object.entries(person));

// ============================================
// 类（ES6）- 类似 C++ 的类
// ============================================

class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    
    area() {
        return this.width * this.height;
    }
    
    perimeter() {
        return 2 * (this.width + this.height);
    }
}

let rect = new Rectangle(10, 5);
console.log("\n矩形面积:", rect.area());
console.log("矩形周长:", rect.perimeter());
