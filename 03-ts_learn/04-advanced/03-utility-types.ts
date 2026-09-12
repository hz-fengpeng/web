// ============================================
// 03 工具类型（utility types）
// ============================================
//
// TS 自带了一批"类型函数"：你给它一个类型，它返回一个新类型。
// 它们不是新的语法，全部都是用**映射类型**（mapped type）写出来的，本节会拆开看。
//
// 这批工具在 React / 后端接口代码里出现频率极高，值得当成常用词记下来。
// 下面每条都是"定义 + 例子 + 什么时候用"。

interface User {
  id: number;
  name: string;
  email: string;
}

// ============================================
// 一、Partial / Required / Readonly
// ============================================

// Partial<T>：把所有属性变成可选
const draft: Partial<User> = { name: "张三" };
console.log("Partial：", draft, "（只填了 name 也不报错）");

// Required<T>：把所有属性变成必填（Partial 的反操作）
const full: Required<Partial<User>> = { id: 1, name: "张三", email: "a@b.c" };
console.log("Required：", full);

// Readonly<T>：把所有属性变成只读
const frozen: Readonly<User> = { id: 1, name: "张三", email: "a@b.c" };
console.log("Readonly：", frozen.name);
// frozen.id = 2;
//   ❌ error TS2540: Cannot assign to 'id' because it is a read-only property.

// ⚠️ 和前面讲的一样，Readonly 只是**编译期**的，运行时没人拦你。
//    真要冻结得用 Object.freeze()。
//
// 什么时候用？
//   Partial     → 表单草稿、局部更新（PATCH 接口的请求体）
//   Required    → 配置项在某个阶段应该已经填全了
//   Readonly    → 函数参数、常量表，防止被改
//
// 注意 Readonly / Partial 都只作用于**第一层**：
//   Readonly<{ a: { b: number } }> 里的 a 只读，但 a.b 还能改。

// ============================================
// 二、Pick / Omit：挑属性、去属性
// ============================================

// Pick<T, K>：只保留 K 这几个属性
type UserPreview = Pick<User, "id" | "name">;
const preview: UserPreview = { id: 1, name: "张三" };
console.log("\nPick：", preview);

// Omit<T, K>：去掉 K 这几个属性，其余保留
type UserInput = Omit<User, "id">;        // id 通常由后端生成，创建时不传
const newUser: UserInput = { name: "李四", email: "l@b.c" };
console.log("Omit：", newUser);

// Pick 写错 key 会被拦住：
// type Bad = Pick<User, "nickname">;
//   ❌ error TS2344: Type '"nickname"' does not satisfy the constraint 'keyof User'.

// ⚠️ 但 Omit 写错 key **不会**报错：
type StillFine = Omit<User, "nickname">;  // 悄悄变成了 User，一点提示都没有
const fine: StillFine = { id: 1, name: "a", email: "b" };
console.log("Omit 写错 key 时（不报错）：", Object.keys(fine), "—— 属性一个都没少");

// 为什么？因为 Omit 的第二个参数类型是 `keyof any`（也就是 string | number | symbol），
// 它对所有 key 都放行。这是 Pick 和 Omit 的一个不对称，写 Omit 时要自己核对拼写。
// 这也是为什么有些人宁可写 Pick —— 至少有编译期检查。

// ============================================
// 三、Record：构造"字典"类型
// ============================================
// Record<K, V> 表示"key 是 K，value 是 V 的对象"。
// 对应 C++ 的 std::map<K, V>，但 TS 这边只是**类型描述**，不是容器。

type Role = "admin" | "editor" | "viewer";

// key 限定在几个字面量内，**而且三个都必须写全**（这是 Record 的好处）
const permissions: Record<Role, string[]> = {
  admin: ["读", "写", "删"],
  editor: ["读", "写"],
  viewer: ["读"],
};
console.log("\nRecord 限定 key：", permissions.admin);

// 少写一个 key 会报错：
// const bad: Record<Role, string[]> = { admin: [], editor: [] };
//   ❌ error TS2741: Property 'viewer' is missing in type '{ admin: never[]; editor: never[]; }'
//      but required in type 'Record<Role, string[]>'.
//   （这正是 Record 比索引签名好的地方：索引签名没法要求"key 必须写全"）

// key 是开放字符串时就是普通的字典：
const counters: Record<string, number> = { 苹果: 1, 香蕉: 2 };
console.log("Record 当字典：", counters.苹果, counters["香蕉"]);

// 多余 key 会被拦：
// const extra: Record<"a", number> = { a: 1, b: 2 };
//   ❌ error TS2353: Object literal may only specify known properties,
//      and 'b' does not exist in type 'Record<"a", number>'.

// 对比 interface 的索引签名（03-objects/01 第二节）：
//   interface Dict { [key: string]: number }     ← 老写法
//   type Dict = Record<string, number>           ← 新写法，等价但更短
// 固定 key 用 Record<联合, V>，能强制写全；key 完全任意时两者差不多。

// ============================================
// 四、从函数里"取类型"：ReturnType / Parameters
// ============================================
// 这对工具让你不用重复写类型 —— 类型从已有的函数**推导**出来。

function createUser(id: number, name: string) {
  return { id, name, createdAt: new Date() };
}

// 取返回值类型
type NewUser = ReturnType<typeof createUser>;
// 等价于手写 { id: number; name: string; createdAt: Date }
const created: NewUser = { id: 1, name: "张三", createdAt: new Date() };
console.log("\nReturnType：", created.name, created.createdAt instanceof Date ? "（是 Date）" : "");

// 取参数类型（得到的是**元组**）
type CreateArgs = Parameters<typeof createUser>;
// 等价于 [id: number, name: string]
const args: CreateArgs = [1, "张三"];
console.log("Parameters：", args);

// ⚠️ 注意 `typeof createUser` 里那个 typeof。
//    这在类型位置上是**取值的类型**，和运行时表达式 `typeof x` 不是一回事：
//      console.log(typeof createUser)   ← 运行时，得到 "function"
//      ReturnType<typeof createUser>    ← 类型位置，得到函数的签名
//    同一个关键字两个身份，看它在类型位置还是表达式位置。

// 什么时候用？最常见的是给"包装函数"标类型，避免复制粘贴：
function logAndCall<F extends (...args: never[]) => unknown>(fn: F, ...args: Parameters<F>): ReturnType<F> {
  console.log(`  调用 ${fn.name}，参数 ${JSON.stringify(args)}`);
  return fn(...args) as ReturnType<F>;
}
console.log("包装函数：");
logAndCall(createUser, 1, "张三");
logAndCall((a: number, b: number) => a + b, 3, 4);

// ============================================
// 五、Awaited / NonNullable
// ============================================

// Awaited<T>：把 Promise 剥掉，而且**会一直剥到底**
type Inner = Awaited<Promise<Promise<string>>>;   // 得到 string，不是 Promise<string>
const inner: Inner = "剥干净了";
console.log("\nAwaited：", inner);

// 注意 Promise<T> 本身在 async 函数里会自动被 await 解开，
// Awaited 主要用于"我要拿到某个 async 函数的**解包后**返回类型"：
async function fetchCount(): Promise<number> {
  return 42;
}
type Count = Awaited<ReturnType<typeof fetchCount>>;   // number
const count: Count = 42;
console.log("Awaited + ReturnType：", count);

// NonNullable<T>：从类型里去掉 null 和 undefined
type MaybeName = string | null | undefined;
type Name = NonNullable<MaybeName>;      // string
const name: Name = "张三";
console.log("NonNullable：", name);

// 实用场景：把可选属性变成必填
type RequiredName = { name?: string };
type ConcreteName = { [K in keyof RequiredName]-?: NonNullable<RequiredName[K]> };
const concrete: ConcreteName = { name: "张三" };
console.log("组合起来用：", concrete);

// ============================================
// 六、Exclude / Extract：对联合类型做筛选
// ============================================
// 注意这两个只对**联合类型**有意义，对对象属性不生效。

type Status = "pending" | "success" | "failed" | "cancelled";

type FinalStatus = Extract<Status, "success" | "failed">;      // "success" | "failed"
type PendingStatus = Exclude<Status, "success" | "failed" | "cancelled">;  // "pending"

const final1: FinalStatus = "success";
const pending1: PendingStatus = "pending";
console.log("\nExtract：", final1, " Exclude：", pending1);

// 一句话区分（名字很容易记反）：
//   Extract<T, U>  ← "提取" T 里**能**赋给 U 的  → 保留交集
//   Exclude<T, U>  ← "排除" T 里**能**赋给 U 的  → 去掉交集
// 拿不准的时候看名字第一个字母：Extract = 留，Exclude = 去。

// 配合判别联合特别好用，可以按 kind 把成员挑出来：
type ApiResult =
  | { kind: "ok"; data: string }
  | { kind: "error"; message: string };

type OkResult = Extract<ApiResult, { kind: "ok" }>;
const ok: OkResult = { kind: "ok", data: "成功" };
console.log("Extract 挑判别联合的成员：", ok);

// 还有 InstanceType<T>（取类的实例类型）、ConstructorParameters<T>（取构造函数参数），
// 用得少，知道有这么回事就行，需要时查文档。

// ============================================
// 七、拆开看：它们都是"映射类型"
// ============================================
// 工具类型不是编译器魔法，自己也能写。Partial 的定义就一行：

type MyPartial<T> = { [K in keyof T]?: T[K] };

// 拆解这行的三个部分：
//   keyof T        → T 的所有属性名组成的联合类型
//   [K in ...]     → 遍历它们（这就是"映射"，像 for 循环，但是对类型）
//   ?: T[K]        → 每个属性都变成可选，类型还是原来的 T[K]
//
// 对比 C++：这相当于模板元编程里的"对每个成员做变换"，
// 但 TS 的写法是**声明式**的，没有递归模板那套复杂度。

const myDraft: MyPartial<User> = { name: "张三" };
console.log("\n自己写的 MyPartial：", myDraft, "（和内置 Partial 效果一样）");

// 再试一个：把类型里所有属性变成"可空"
type Nullable<T> = { [K in keyof T]: T[K] | null };
const nullableUser: Nullable<User> = { id: null, name: "张三", email: null };
console.log("自己写的 Nullable：", nullableUser);

// 映射类型里还能加修饰符：
//   [K in keyof T]?    加可选      [K in keyof T]-?   去掉可选
//   readonly [K in ...] 加只读    -readonly [K in ...] 去掉只读
// 上面 NonNullable 那个例子里就用了 -? 来去掉可选。

// ============================================
// 八、⚠️ 工具类型会让类型变"松"，注意取舍
// ============================================
// 一个真实的教训：工具类型是从**已有的类型**推导出来的，
// 它会忠实地把原类型的性质也带过来。
//
// 比如 User 里如果有可选字段，Pick 出来的也是可选的；
// 如果原类型很宽（比如有一堆可选属性），Omit 之后可能还是很宽。
//
// 更重要的是第一节说的：**它们都只作用一层**。
// 嵌套对象里的属性不会被 Partial / Readonly 影响。
// 需要深层版本时得自己写递归的映射类型（或者用 type-fest 这类库的 DeepPartial）。
//
// 实用建议：
//   1. 数据结构简单时，手写类型反而更清楚，别为了少写几行硬套工具类型
//   2. 只在"确实是同一个东西的不同视角"时用（创建视图 Omit id、编辑视图 Partial）
//   3. 类型别名起个好名字（UserPreview / UserInput），别到处写 Omit<User, "id">

// ============================================
// 小结
// ============================================
//   Partial<T>        全部变可选        Required<T>      全部变必填
//   Readonly<T>       全部变只读        Pick<T, K>       只留 K
//   Omit<T, K>        去掉 K（⚠️不检查 key 拼写）
//   Record<K, V>      构造字典，固定 key 时会强制写全
//   ReturnType<F>     函数返回值类型    Parameters<F>    函数参数元组
//   Awaited<T>        剥掉 Promise      NonNullable<T>   去掉 null/undefined
//   Extract<T, U>     保留交集          Exclude<T, U>    去掉交集
//
// - 它们全都是"映射类型"，自己三行就能写一个 Partial
// - 都只作用一层，深层要自己写递归版本
// - 别滥用：能让类型更清楚的才用

console.log("\n—— 04-advanced/03-utility-types.ts 结束 ——");
