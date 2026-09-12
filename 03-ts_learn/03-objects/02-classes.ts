// ============================================
// 02 class：类与访问修饰符
// ============================================
//
// 先说清楚一件事：JS 本身就有 class（ES6 加的），TS 只是给它加了类型部分。
// 所以这里讲的大多是"类型标注怎么写"，而不是"TS 新增了类"。
//
// 和 C++ 的对应关系：
//   public / private / protected  ←→  同名，但含义不同（见第三节）
//   readonly                      ←→  const 成员
//   implements                    ←→  抽象基类 / 纯虚接口
//   extends                       ←→  继承
//   abstract                      ←→  纯虚函数 / 抽象类

// ============================================
// 一、字段和方法的类型
// ============================================

class Point {
  // 字段必须标类型（或者给初始值让它推断）
  x: number;
  y: number;
  readonly label: string = "点";       // readonly：初始化后不能改

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // 方法：参数和返回值都要标
  distanceTo(other: Point): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  toString(): string {
    return `${this.label}(${this.x}, ${this.y})`;
  }
}

const p1 = new Point(0, 0);
const p2 = new Point(3, 4);
console.log("两点距离：", p1.distanceTo(p2));
console.log(p1.toString(), p2.toString());
// p1.label = "别的";   // ❌ error TS2540: Cannot assign to 'label' because it is a read-only property.

// ⚠️ 你可能在教程里见过这种简写，本环境**用不了**：
//   constructor(private x: number, private y: number) {}
// 这叫"参数属性"，需要编译器生成赋值代码，而 node 只擦类型不生成代码。
//   报错：error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
// 写成上面 Point 那样（先声明字段，再在构造函数里赋值）就行。

// ============================================
// 二、访问修饰符
// ============================================
// 三种修饰符和 C++ 同名，另外 JS 自己还有 # 私有字段。

class Counter {
  public label: string;            // public 是默认值，写不写一样
  private count = 0;               // TS 的 private：编译期检查
  protected step = 1;              // protected：自己和子类可以访问
  #secret = 42;                    // JS 的 #：运行时真正私有

  constructor(label: string) {
    this.label = label;
  }

  increment(): void {
    this.count += this.step;
  }

  get value(): number {            // getter：像属性一样读，实际是方法
    return this.count;
  }

  set value(next: number) {        // setter
    if (next < 0) throw new Error("不能是负数");
    this.count = next;
  }

  revealSecret(): number {
    return this.#secret;           // 类内部才能访问 #
  }
}

const counter = new Counter("计数器");
counter.increment();
counter.increment();
console.log("\n计数：", counter.value, "（用 getter 读的）");
counter.value = 10;                // 用 setter 写
console.log("设置后：", counter.value);
console.log("私有字段能被自己的方法读出来：", counter.revealSecret());

// ❌ 编译期拦住的：
// counter.count = 100;
//   error TS2341: Property 'count' is private and only accessible within class 'Counter'.
// counter.#secret;
//   这是**语法错误**（不是类型错误）—— # 字段在类外面根本写不出来。

// ⚠️ 但 TS 的 private 只活在编译期，运行时就是普通属性：
console.log("\n绕过 private：", (counter as unknown as { count: number }).count);
console.log("  ↑ private 编译完就没了，运行时照样能拿到 —— 想要真私有请用 #");

// 所以从安全性上排个序：
//   #        >  runtime 强制，外面根本无法访问
//   private  >  编译期检查，防手滑，防不住恶意

// ============================================
// 三、implements：类实现接口
// ============================================
// 注意 implements 只做"检查"，不会自动帮你生成任何东西（不像 C++ 的继承会带来成员）。

interface Serializable {
  serialize(): string;
}

interface Comparable {
  compareTo(other: this): number;
}

class Version implements Serializable, Comparable {
  major: number;
  minor: number;

  constructor(major: number, minor: number) {
    this.major = major;
    this.minor = minor;
  }

  serialize(): string {
    return `${this.major}.${this.minor}`;
  }

  compareTo(other: Version): number {
    return this.major - other.major || this.minor - other.minor;
  }
}

const v1 = new Version(1, 2);
const v2 = new Version(1, 10);
console.log("\n实现接口：", v1.serialize(), v2.serialize());
console.log("比较结果：", v1.compareTo(v2), "（负数表示 v1 更小）");

// 少实现一个方法会报错：
// class Bad implements Serializable {
//   ❌ error TS2420: Class 'Bad' incorrectly implements interface 'Serializable'.
//      Property 'serialize' is missing in type 'Bad' but required in type 'Serializable'.
// }

// ============================================
// 四、继承与抽象类
// ============================================

abstract class Shape {
  // 抽象方法：只声明，子类必须实现
  abstract area(): number;

  // 普通方法：子类直接继承
  describe(): string {
    return `${this.constructor.name} 的面积是 ${this.area().toFixed(2)}`;
  }
}

class Circle extends Shape {
  radius: number;

  constructor(radius: number) {
    super();                 // 必须调用 super()，否则 this 不能用
    this.radius = radius;
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Rectangle extends Shape {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }

  area(): number {
    return this.width * this.height;
  }
}

console.log("\n--- 继承 ---");
const shapes: Shape[] = [new Circle(1), new Rectangle(3, 4)];
for (const shape of shapes) {
  console.log(" ", shape.describe());
}

// new Shape();
//   ❌ error TS2511: Cannot create an instance of an abstract class.

// 子类没实现抽象方法也会被拦住：
// class BadShape extends Shape {}
//   ❌ error TS2515: Non-abstract class 'BadShape' does not implement
//      inherited abstract member area from class 'Shape'.

// ============================================
// 五、和 C++ 的对照
// ============================================
//
//   概念              C++                          TS
//   ---------------   --------------------------   ---------------------------
//   访问控制          public/private/protected     同名（但 private 仅编译期）
//   真私有            （不存在这个概念）             # 字段
//   只读成员          const 成员 / const 对象        readonly（仅编译期）
//   接口              class 全是纯虚函数             interface + implements
//   抽象类            abstract class                abstract class
//   多重继承          支持（菱形继承的坑）           不支持继承多类，但能 implements 多个接口
//   虚函数/动态分派    需要 virtual                  JS 方法天然都是动态分派
//   构造顺序          基类 → 成员 → 派生类构造体      必须先 super() 才能用 this
//
// 一个容易踩的点：JS 的方法**默认就是虚函数**，没有 virtual 这个关键字，
// 也不存在"非虚调用"。想调基类实现用 super.method()。

// ============================================
// 小结
// ============================================
// - 字段和方法都要标类型；构造函数里要自己赋值（不能用参数属性简写）
// - private/protected/readonly 都只在编译期生效
// - 想真私有用 # 字段
// - implements 只做检查不生成代码；extends 才是继承
// - 抽象类用 abstract，不能 new

console.log("\n—— 03-objects/02-classes.ts 结束 ——");
