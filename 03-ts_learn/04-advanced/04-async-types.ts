// ============================================
// 04 异步的类型
// ============================================
//
// 异步本身（回调 → Promise → async/await）是 JS 的内容，
// 已经写在 js_learn 的异步那一章了。这里只讲 **TS 加了什么**：
//   - Promise<T> 怎么标类型
//   - await 之后类型怎么变
//   - catch 里的变量为什么是 unknown（最容易踩的坑）
//
// 一句话概括：TS 把"异步"变成了类型系统里的一等公民，
// 于是"忘了 await"这种错误能在编译期被抓出来。

// ============================================
// 一、Promise<T>：一个"未来的 T"
// ============================================
// Promise<T> 里的 T 是**成功时**的值的类型。
// 对比 C++：最接近的是 std::future<T>，
//   C++ 的 future.get() 会阻塞，JS 的 await 会挂起当前函数（不阻塞线程）。

const laterNumber: Promise<number> = Promise.resolve(42);
const laterString: Promise<string> = Promise.resolve("hello");

console.log("--- Promise<T> ---");
console.log("  Promise.resolve(42) 的类型是 Promise<number>");

// 一般不用手写 Promise<T>，而是让 TS 从 Promise.resolve / async 函数推断。

// ============================================
// 二、async 函数：返回类型必须写成 Promise<T>
// ============================================
// 关键规则：async 函数里写 `return 42`，但**返回类型要标 Promise<number>**。
// 因为 async 函数在运行时返回的一定是 Promise。

async function getCount(): Promise<number> {
  return 42;                  // 注意这里不加 await，也不是 Promise，TS 会自动包装
}
// 如果标成 number：
// async function bad(): number { return 1; }
//   ❌ error TS1064: The return type of an async function or method must be
//      the global Promise<T> type. Did you mean to write 'Promise<number>'?
//   报错信息很贴心，直接把正确写法告诉你了。

console.log("\n--- async 的返回类型 ---");
console.log("  async 函数返回的是 Promise，所以调用处要 await");

// ============================================
// 三、await 会"解开"一层
// ============================================
// await 的规则：Promise<T> → T。如果本来就不是 Promise，那 await 它等于原值。

async function awaitDemo(): Promise<void> {
  const n = await laterNumber;         // number
  const s = await laterString;         // string
  console.log("  await Promise<number> 得到：", typeof n, n);
  console.log("  await Promise<string> 得到：", typeof s, s);

  const direct = await 42;             // await 非 Promise 也合法，就是 42 本身
  console.log("  await 42 得到：", typeof direct, direct);
}
console.log("\n--- await 解开一层 ---");
await awaitDemo();

// ⚠️ 最常见的错误：**忘了 await**。TS 能抓住这个：
async function forgetAwait(): Promise<void> {
  const notANumber = laterNumber;      // 类型是 Promise<number>，不是 number
  // const bad: number = notANumber;
  //   ❌ error TS2322: Type 'Promise<number>' is not assignable to type 'number'.
  console.log("  忘了 await 时，拿到的是 Promise 对象：", notANumber instanceof Promise);
}
await forgetAwait();

// 对比 JS：纯 JS 里忘了 await 是完全合法的代码，只是行为不对（拿到 Promise），
// 往往要等运行到 `x + 1` 变成 "[object Promise]1" 才发现。
// **这是 TS 给异步带来的最大价值之一。**

// ============================================
// 四、并行：all / allSettled / race / any
// ============================================
// 这四个函数的**类型**各不相同，值得分别记一下。

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function parallelDemo(): Promise<void> {
  // --- Promise.all：全成功才算成功；返回类型是**元组** ---
  const [n, s] = await Promise.all([delay(1, 10), delay("a", 20)]);
  //      ↑ number      ↑ string   —— 类型精确保留，不是 (number|string)
  const checkN: number = n;
  const checkS: string = s;
  console.log("\n--- Promise.all ---");
  console.log("  不同类型 → 元组：", checkN, checkS);

  // 如果数组里都是同一类型，结果就是普通数组：
  const nums = await Promise.all([delay(1, 1), delay(2, 1)]);
  const checkNums: number[] = nums;
  console.log("  同一类型 → 数组：", checkNums);

  // --- Promise.allSettled：不管成功失败都要结果 ---
  const settled = await Promise.allSettled([delay(1, 1), Promise.reject(new Error("炸了"))]);
  console.log("\n--- Promise.allSettled ---");
  for (const item of settled) {
    // item 是个判别联合，靠 status 字段区分 —— 和 03 节学的模式一样
    if (item.status === "fulfilled") {
      console.log("  成功：", item.value);
    } else {
      console.log("  失败：", item.reason instanceof Error ? item.reason.message : item.reason);
    }
  }

  // --- Promise.race：谁先结束用谁 ---
  const raced = await Promise.race([delay(1, 10), delay("a", 20)]);
  console.log("\n--- Promise.race ---");
  console.log("  类型是 number | string（各成员类型的联合）：", raced);
  // const bad: number = raced;
  //   ❌ error TS2322: Type 'string | number' is not assignable to type 'number'.
  //   race 的结果类型是**联合**，用之前得自己判断 ——
  //   这点很反直觉：你明明知道快的那个是哪个，但 TS 不知道。

  // --- Promise.any：第一个**成功**的 ---
  const anyed = await Promise.any([delay(1, 10), delay("a", 20)]);
  console.log("--- Promise.any ---");
  console.log("  类型也是联合：", anyed);
}
await parallelDemo();

// 四个放一起对比：
//
//   方法                  全部成功才成功    结果类型               失败时
//   -------------------   --------------   --------------------   ------------------
//   Promise.all           是               元组 / 数组            reject（第一个错误）
//   Promise.allSettled    不会失败         判别联合数组           永远 fulfilled
//   Promise.race          看谁先结束       各类型的联合           看先结束的那个
//   Promise.any           任一成功即可     各类型的联合           AggregateError
//
// 实用建议：
//   几个都要 → all（最常用）
//   每个结果都要处理（成功失败都不能丢）→ allSettled
//   只要最快的一个 → race / any

// ============================================
// 五、⚠️ catch 里的变量是 unknown（最容易踩的坑）
// ============================================
// 这条单独讲，因为从 JS 过来的人 100% 会踩。

async function errorDemo(): Promise<void> {
  try {
    JSON.parse("{ 这不是合法 JSON");
  } catch (e) {
    // console.log(e.message);
    //   ❌ error TS18046: 'e' is of type 'unknown'.
    //
    // 为什么是 unknown？因为 JS 里 `throw` 可以扔**任何东西**：
    //   throw "一段字符串"、throw 42、throw { code: 1 } 都合法。
    //   TS 没法保证扔出来的一定是 Error，所以最诚实的就是 unknown。

    // ✅ 正确写法：先判断再访问
    if (e instanceof Error) {
      console.log("\n--- catch 里的 unknown ---");
      console.log("  判断之后才能访问 message：", e.message);
    } else {
      console.log("  扔出来的不是 Error：", String(e));
    }
  }
}
await errorDemo();

// 三层写法，按场景选：
//
// 1. 想用 message 等 Error 的属性 → `if (e instanceof Error)`（最稳妥）
// 2. 只是想打印出来 → 用 String(e) 或者直接 console.log(e)，不需要类型断言
// 3. 确定就是自己扔的 Error → 写一个类型谓词（04-advanced/02）

// ⚠️ 不要图省事写 `catch (e: any)` ——
//    虽然能过编译，但等于把 TS 的保护关掉了，而且 any 会传染给后续代码。
//    `catch (e: unknown)` 是默认行为，接受它就好。

// 对比 C++：
//   C++ 的 catch (const std::exception& e) 是**按类型**捕获的，
//     类型不匹配就捕获不到，所以 e 的类型是确定的
//   JS 只有"一个 catch 管所有"，所以类型只能是 unknown

// ============================================
// 六、Awaited：剥掉 Promise
// ============================================
// 上一节（工具类型）提过，这里给个实战场景。

async function fetchUserName(): Promise<string> {
  return "张三";
}

// 想拿到"这个 async 函数最终给出来的值"的类型，要剥两层：
type UserName = Awaited<ReturnType<typeof fetchUserName>>;   // string
const userName: UserName = await fetchUserName();
console.log("\n--- Awaited ---");
console.log("  Awaited<ReturnType<...>> 得到的是：", userName);

// 为什么需要两层？因为 async 函数的返回类型本身就是 Promise<string>：
//   ReturnType<typeof fetchUserName>  →  Promise<string>
//   Awaited<...>                      →  string
// 这正好对应运行时的 `await fetchUserName()`。

// ============================================
// 七、一个完整的例子
// ============================================
// 把上面这些组合起来：一个带类型安全的"取数据"函数。

interface Post {
  id: number;
  title: string;
}

// 模拟一个失败的接口调用
async function fetchPost(id: number): Promise<Post> {
  await delay(null, 10);
  if (id <= 0) {
    throw new Error(`非法的 id：${id}`);
  }
  return { id, title: `第 ${id} 篇文章` };
}

async function loadPosts(ids: number[]): Promise<void> {
  // 用 allSettled：即使有失败的，也要把成功的都展示出来
  const results = await Promise.allSettled(ids.map((id) => fetchPost(id)));

  const posts: Post[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      posts.push(result.value);
    } else {
      // result.reason 是 unknown，按第五节的规矩先判断
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.log("  跳过一条：", reason);
    }
  }

  console.log("\n--- 完整例子 ---");
  console.log(`  拿到 ${posts.length} 篇：`, posts.map((p) => p.title).join("、"));
}
await loadPosts([1, 2, -1, 3]);

// 这个例子里的每个类型决定都不是装饰：
//   Promise<Post>                  让下面的 post.title 有补全
//   allSettled 而不是 all          故意要"部分成功"的语义
//   result.status === "fulfilled"  判别联合自动收窄
//   reason instanceof Error        因为 catch/reason 是 unknown

// ============================================
// 小结
// ============================================
// - Promise<T> 的 T 是成功值的类型；async 函数的返回类型要写 Promise<T>
// - await 解一层：Promise<T> → T；await 非 Promise 也合法，就是原值
// - ⚠️ 忘了 await 会被 TS 抓住（拿到的是 Promise 对象），这是 TS 对异步最大的帮助
// - all → 元组/数组；allSettled → 判别联合数组；race/any → 联合类型
// - ⚠️ catch (e) 里 e 是 unknown，要先 instanceof Error 再访问属性
// - Awaited<ReturnType<F>> 拿到 async 函数解包后的类型

console.log("\n—— 04-advanced/04-async-types.ts 结束 ——");
