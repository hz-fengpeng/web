// ============================================
// 01 interface：描述对象的形状
// ============================================
//
// interface 和 C++ 的接口类不是一回事。
// 在 TS 里它只是"描述一个对象长什么样"，不产生任何运行时代码。

interface User {
  name: string;
  age: number;
}

const user: User = { name: "张三", age: 20 };
console.log("基本用法：", user.name, user.age);

// ============================================
// 一、可选属性和只读属性
// ============================================

interface Config {
  readonly host: string;      // readonly：创建之后不能改
  port?: number;              // ?：可以不存在
  timeout?: number;
}

const config: Config = { host: "localhost" };
config.port = 8000;           // ✅ 可选属性可以后续补上
console.log("\n可选属性：", config);

// config.host = "example.com";
//   ❌ error TS2540: Cannot assign to 'host' because it is a read-only property.

// ⚠️ readonly 只是**编译期**的限制，运行时没有任何保护
const mutable = { host: "localhost" } as Config;
(mutable as { host: string }).host = "被改掉了";
console.log("readonly 被绕过之后：", mutable.host);
console.log("  想有运行时保护，得用 Object.freeze()");

// 对比 C++：
//   C++ 的 const 编译期检查，但 const 对象可能被放在只读段，真的改不了
//   TS 的 readonly 纯粹是编译期的"建议"，编译完就没了

// ============================================
// 二、方法和索引签名
// ============================================

interface Calculator {
  // 方法：两种写法等价
  add(a: number, b: number): number;
  subtract: (a: number, b: number) => number;

  // 索引签名：表示"任意字符串 key，值是 number"
  readonly [key: string]: unknown;
}

const calc: Calculator = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  memory: 0,           // 索引签名允许加别的属性
};
console.log("\n方法：", calc.add(1, 2), calc.subtract(5, 2));
console.log("索引签名允许的额外属性：", calc.memory);

// 索引签名会让类型变得宽松（任何 key 都合法），能用具体字段就别用它。
// 真正需要"任意 key"的场景，通常用 Record（见 04-advanced/03）。

// ============================================
// 三、interface 和 type 有什么区别
// ============================================
// 两者大部分场景可以互换，区别只有几条：

// 1. interface 可以"声明合并"（同名 interface 会自动合并），type 不行
interface Window {
  myGlobal: string;
}
interface Window {
  anotherGlobal: number;
}
// 现在 Window 同时有两个属性。这个特性主要用于给第三方库扩展类型，
// 日常写代码时反而是个隐患，所以很多团队禁用。

// 2. type 能表示联合、元组、字面量等"不是对象"的类型，interface 不行
type Status = "ok" | "error";         // ✅ type 能做
type Pair = [number, number];         // ✅ type 能做
// interface Status2 = "ok" | "error";  ← ❌ interface 只能描述对象形状

// 3. interface 可以用 extends 继承，type 用 & 交叉
interface Animal { name: string }
interface Dog extends Animal { breed: string }

type AnimalT = { name: string };
type DogT = AnimalT & { breed: string };

const dog: Dog = { name: "旺财", breed: "柴犬" };
const dog2: DogT = { name: "来福", breed: "边牧" };
console.log("\n继承与交叉：", dog, dog2);

// 怎么选？社区的主流建议：
//   描述对象形状（尤其是要给外部用的）→ interface
//   联合类型、元组、需要组合的复杂类型 → type
// 本目录后面统一用 type，因为它更灵活；实际项目里两种都很常见。

// ============================================
// 四、结构类型系统（重点，和 C++ 完全不同）
// ============================================
// TS 判断"类型对不对"看的是**形状**，不是名字，也不是继承关系。
// 这叫"结构类型系统"（structural typing）；C++ 是"名义类型系统"（nominal）。

interface Named {
  name: string;
}

function greet(person: Named): string {
  return `你好，${person.name}`;
}

// 下面这些类型都没有写 implements Named，也没有继承它，
// 但只要"形状对得上"，就能传进去：

greet({ name: "张三" });                    // ① 对象字面量

const employee = { name: "李四", age: 30 }; // ② 多了个属性
greet(employee);                            //    ✅ 可以传

class Robot {                               // ③ 一个完全无关的类
  name: string;                             //    注意这里没用"参数属性"简写，
  constructor(name: string) {               //    本环境禁用了那个语法（见 02-functions/03）
    this.name = name;
  }
}
greet(new Robot("R2D2"));                   //    ✅ 也可以传

console.log("\n结构类型：形状对就能传，不管它叫什么名字");

// 对比 C++：
//   struct Named { string name; };
//   struct User  { string name; int age; };
//   void greet(Named n);
//   greet(user);   // ❌ 编译错误：User 不是 Named，没有继承关系就不行
//
// 这是从 C++ 过来最需要转变的一个观念：
// TS 里"类型"描述的是**值的形状**，而不是"它属于哪个家族"。

// 一个要注意的例外：**多余属性检查**只对"字面量"生效。
// greet({ name: "王五", age: 20 });
//   ❌ error TS2353: Object literal may only specify known properties,
//      and 'age' does not exist in type 'Named'.
// 直接写对象字面量时 TS 会额外检查属性名；
// 先赋给变量再传（上面 ② 那样）就不检查了。这是为了防止拼写错误，是特例不是规则。

// ============================================
// 小结
// ============================================
// - interface 只描述形状，不产生运行时代码
// - readonly 和 ? 是编译期的，运行时没有保护
// - interface vs type：对象形状用 interface，联合/元组/组合用 type
// - TS 是结构类型系统：看形状不看名字（和 C++ 相反）
// - 多余属性检查只对对象字面量生效

console.log("\n—— 03-objects/01-interfaces.ts 结束 ——");
