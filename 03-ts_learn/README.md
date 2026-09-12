                         TypeScript
                              │
                    ┌─────────┴─────────┐
                    │                   │
              类型系统（学这个）      运行时（不归它管）
                    │
        ┌───────────┼───────────┐
        │           │           │
     基础类型      对象/函数    类型收窄
        │           │           │
    联合/字面量   泛型/重载    谓词/工具类型
        │           │           │
        └───────────┴───────────┘
                    │
              ┌─────┴─────┐
              │           │
           React       Next.js
              │           │
              └─────┬─────┘
                    │
                真实项目

# TypeScript 学习路径

## 学之前

**前置知识**：先看完 [`js_learn/`](../js_learn/)。

这一点不能跳过。TypeScript 是 JavaScript 的**超集** —— 它加的是类型，
语法、运行时行为、异步模型、DOM 操作全都是 JS 原来那套。
不懂 JS 直接学 TS，会变成"在背类型语法"，而不知道那些类型在描述什么。

**写给 C/C++ 背景的人**：这个目录里每个文件都尽量和 C/C++ 对照着讲。
但有一件事要先说清楚，否则会别扭很久 ——

> **TypeScript 的类型只活到编译结束。编译完之后，类型全都不存在了。**

C++ 的类型是代码的一部分（决定内存布局、函数重载、模板实例化）；
TS 的类型是**一份文档**，编译器读完、检查完，就把它们全部删掉，
剩下的就是一份普通的 JavaScript。

这条差别会推出一堆看起来很怪的行为，后面会一个个遇到：

| 你会觉得奇怪 | 原因 |
|---|---|
| `private` 字段运行时还能访问 | 编译完 `private` 就没了（用 `#` 才是真私有） |
| 用 `as` 断言后运行时报错 | `as` 只是让编译器闭嘴，不做任何转换 |
| `interface` 编译后不见了 | 它只描述形状，不产生代码 |
| 泛型没有代码膨胀 | 编译后 `<T>` 直接删掉，不存在多份实例 |
| `enum` 在这个目录里用不了 | 它需要生成代码，和"只擦类型"冲突（见下文） |

## 怎么运行

这个目录用**两条命令**，各管一件事：

```bash
cd ts_learn
npm install          # 第一次需要，装 typescript 和 @types/node

npm run check        # ① 类型检查：tsc 检查所有 .ts，只报错不产出
node 01-basics/01-why-typescript.ts   # ② 运行：node 直接把类型擦掉并执行
```

**为什么要分成两条？**

因为较新的 Node.js（这个仓库用的是 23.11）能直接运行 `.ts` 文件，
但它的做法是**只擦类型、不做检查**：

```bash
node 01-basics/01-why-typescript.ts
# 能跑，而且哪怕是类型全错的文件也照样跑得起来
```

它会打印一句 `ExperimentalWarning: Type Stripping is an experimental feature`——
这不是出错了，是在提醒你这个功能还是实验性的。

所以分工是：

| 命令 | 做什么 | 类比 |
|---|---|---|
| `node file.ts` | 擦掉类型，执行代码 | 运行 |
| `npx tsc --noEmit` | 检查类型，**不**产出任何文件 | 编译期检查（像 `-Wall -Werror`） |

`npm run check` 就是这个 `tsc --noEmit`。**改完代码要跑它**，
不然类型错误不会自己冒出来 —— node 根本不管。

还有一个：

```bash
npm run watch              # 开着，存盘自动重查
npm run check:exercises    # 检查 exercises/ 里的练习（见下）
```

## 学习顺序

| # | 目录 | 内容 | 文件 |
|---|---|---|---|
| 1 | `01-basics/` | 为什么需要 TS、基础类型、类型推断、any/unknown/never、空安全 | 5 |
| 2 | `02-functions/` | 函数类型、重载、泛型 | 3 |
| 3 | `03-objects/` | interface、class、联合/字面量类型 | 3 |
| 4 | `04-advanced/` | 类型收窄、类型谓词、工具类型、异步类型 | 4 |
| 5 | `exercises/` | 把一段 JS 改造成 TS | 2 |

按顺序看。每个文件都是独立可运行的，从头读到尾，
`console.log` 会告诉你每一步发生了什么。

**怎么读这些文件**：里面经常出现这种写法 ——

```ts
// console.log(value.toUpperCase());
//   ❌ error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
```

这是**故意注释掉的报错代码**。这些报错信息都是从真实的 `tsc` 输出里
复制过来的（不是凭印象写的），可以放心相信。想亲手验证，
把注释去掉再跑 `npm run check` 就行。

## 练习

`exercises/` 里是一段**故意没写类型**的 JS 代码，`npm run check:exercises`
一上来会报 **14 个错** —— 那正是题目。

```bash
npm run check:exercises     # 开始：14 个错。目标：0 个
node exercises/exercise-01.ts
```

做完对比 `exercises/solutions-01.ts`（它是干净的，永远不报错）。

练习用单独的 tsconfig（`exercises/tsconfig.json`），
所以**它有错不影响** `npm run check` —— 这样日常检查永远是干净的。

## 和 C/C++ 的对照总表

| 概念 | C / C++ | TypeScript |
|---|---|---|
| 类型检查时机 | 编译期 + 运行时（RTTI） | **只有编译期** |
| 类型是否影响运行 | 是（内存布局、重载、模板） | 否，编译后全部删除 |
| 类型系统 | 名义类型（看名字/继承） | **结构类型（看形状）** |
| 空值 | `nullptr` 到处传 | `T \| null`，强制你判断 |
| 联合类型 | `union` / `std::variant` | `A \| B`（不用额外写访问器） |
| 枚举 | `enum` | 联合字面量 + `as const` 对象 |
| 泛型 | `template<typename T>` | `<T>`（无代码膨胀、无特化） |
| 函数类型 | `std::function` / 函数指针 | `(a: number) => number` |
| 动态类型转换 | `dynamic_cast` | `instanceof` / 类型谓词 |
| 只读 | `const` | `readonly`（更弱的保证） |
| 访问控制 | `private`（编译器 + 链接期） | `private`（**仅编译器**） |
| 真私有 | —— | `#field` |
| 扩展类型 | 改不了别人的头文件 | **声明合并**（`interface` 同名自动合并） |

## `tsconfig.json` 逐项说明

这个文件决定"检查到什么程度"。当前配置：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",          // 生成/假定的 JS 版本
    "lib": ["ES2022"],           // 能用哪些标准库（不含 DOM）
    "types": ["node"],           // 额外加载 @types/node 的声明
    "module": "nodenext",        // 模块系统
    "moduleResolution": "nodenext",

    "strict": true,              // 打开一整套最严格检查 ← 最重要的一行
    "skipLibCheck": true,        // 不检查 node_modules 里的声明，快很多

    "noEmit": true,              // 只检查，不产出 .js
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,

    "erasableSyntaxOnly": true   // 只允许"能擦掉"的语法 ← 见下文
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "exercises"]
}
```

几个值得单独说的：

### `strict: true` 是最重要的一行

它一次打开一整族检查，其中影响最大的是：

- `noImplicitAny` —— 参数不标类型就报错（`TS7006`），挡住"忘了写"的情况
- `strictNullChecks` —— `null` / `undefined` 不能当别的类型用，
  这是 TS 最有价值的检查。**看别人项目时如果感觉"TS 没什么用"，
  八成是因为这一项没开。**

学语法阶段建议一直开着。迁移老项目时，可以一项一项打开。

### 为什么 `lib` 里没有 `DOM`

因为这些脚本跑在 node 里，没有 `window` / `document`。
如果把 DOM 声明也加进来，写 `document.title` 不会报错，
但一运行就崩（node 里没有 document）。

只列 `ES2022` 的代价是：`console`、`setTimeout`、`process` 这些
也都没人声明了，会报 `TS2584: Cannot find name 'console'`。
所以需要 `"types": ["node"]` 来补上 —— 这就是 `@types/node` 的用途。

**记住这个规律**：
`lib` 描述的是"**标准语言**里有什么"，`types` 描述的是"**这个运行环境**额外给了什么"。
以后写浏览器代码，就是 `lib: ["ES2022", "DOM"]`。

### `erasableSyntaxOnly: true` 是本目录特有的约束

这条是为了和"node 直接运行 .ts"保持一致。

node 运行 TS 的方式是**擦除**（把类型相关的东西删掉），
它**不会**生成任何新的代码。所以凡是"需要编译器额外生成代码"的语法，
一律用不了，报错是 `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.`

被禁的就这几种：

| 用不了 | 换成 |
|---|---|
| `enum Color { Red }` | 联合字面量 + `as const` 对象（`03-objects/03`） |
| `namespace Foo {}` | ES 模块（`import` / `export`） |
| `constructor(private x: T)` | 普通字段 + 构造函数里赋值（`03-objects/02`） |
| 旧式 `experimentalDecorators` | 本目录用不到 |

**为什么值得忍这个限制？** 因为它反过来让你看清一件事：
**TS 的哪些特性是"真的类型"，哪些是"tsc 帮你生成代码"的语法糖。**
`enum` 和参数属性看起来很"类型"，其实都会变成真实的运行时代码 ——
而 `interface`、`type`、泛型不会。这个区别在调试和打包时经常有用。

顺带一提：那几种语法在普通 TS 项目里是能用的，
只是本目录为了"node 能直接跑"而关掉了。知道这个取舍就行。

### 一个太宽松的地方：数组越界不检查

```ts
const arr: number[] = [1, 2];
console.log(arr[99]);      // 类型是 number，实际是 undefined —— 不报错
```

想要严格的越界检查，加这一项：

```jsonc
"noUncheckedIndexedAccess": true   // 让 arr[99] 的类型变成 number | undefined
```

它是**独立于 `strict` 的**（`strict` 不包含它），因为它会让很多现有代码报错。
本目录没开，免得初学时被大量的 `| undefined` 淹没。等习惯了再打开试试。

同样的还有 `exactOptionalPropertyTypes`、`noImplicitOverride`、
`noPropertyAccessFromIndexSignature` —— 都属于"更严格但更啰嗦"，按需加。

## 这个目录里没有的东西

说完有的，也说说什么**不在这里**，免得你以为漏了：

- **异步本身**（回调 → Promise → async/await 的用法）→ 在 `js_learn/05-async/`。
  这里只讲**异步的类型**（`04-advanced/04-async-types.ts`）。
- **DOM 操作** → 在 `js_learn/06-dom/`。TS 里操作 DOM 就是给那些 API 加类型标注，
  前提是先知道 DOM 本身怎么用。
- **构建工具**（webpack / vite / esbuild）→ 学习阶段用不上。
  真实项目里 TS 一般由这些工具编译，不直接跑 `tsc`。
- **运行时类型校验** —— TS **不做**这件事，编译完之后没有任何保护。
  要在运行时校验数据（比如接口返回的 JSON），得用 `04-advanced/02` 的类型谓词，
  或者 zod / valibot 这类库。
- **`.d.ts` 声明文件的编写** —— 给第三方 JS 库补类型时才需要，属于进阶话题。

## 下一步

学完这个目录，接下来是：

- [`React_learn/`](../React_learn/) —— React 的组件、props、状态。
  TS 在这里的价值会立刻体现出来：组件的 props 就是"用类型描述的接口"，
  编辑器能自动补全，写错立刻报错。
- [`nextjs-learn/`](../nextjs-learn/) —— Next.js 全栈框架。
  `React_learn` 之后再看。

如果现在就想动手，推荐用 TS 重写一遍 `js_learn/06-dom/` 里的待办事项应用
（`04-todo-app.html`）—— 把那种"一个字符串拼出来的 HTML"换成有类型的
数据结构和渲染函数，会很有体感。

---

**版本**：TypeScript 7.0.2 · Node.js 23.11.0（本文档写作时的版本号）
