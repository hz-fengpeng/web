// ============================================
// 练习 01：把一段 JS 改造成 TS
// ============================================
//
// 这个文件是**故意没有类型**的，相当于一段从 JS 项目里直接搬过来的代码。
//
// 怎么做：
//   1. 跑 `npm run check:exercises`，看现在有多少错
//   2. 按 TODO 一条条加类型，直到这个命令**一行报错都没有**
//   3. 中途随时可以 `node exercises/exercise-01.ts` 看运行结果
//      （注意：node 只擦类型不检查，所以有类型错误时它照样能跑）
//   4. 卡住了看 solutions-01.ts，但建议先自己试
//
// 起点：写这份的时候是 **14 个错**。每解决一个 TODO，这个数字就会掉一截 ——
// 可以拿它当进度条用。（所以别把数字当死目标，修完是 0 就对了。）
//
// 用到的知识分别在这些文件里：
//   interface 描述对象形状  → 03-objects/01-interfaces.ts
//   联合 / 字面量 / 判别联合 → 03-objects/03-union-and-literal.ts
//   收窄                     → 04-advanced/01-narrowing.ts
//   类型谓词校验外部数据      → 04-advanced/02-type-guards.ts
//   工具类型                 → 04-advanced/03-utility-types.ts
//   异步的类型               → 04-advanced/04-async-types.ts
//
// ⚠️ 一条重要提醒：**不要用 any**。
//    把参数标成 any 确实能让报错消失，但那等于什么都没做。
//    如果某个地方实在想不出类型，先用 unknown，然后写个类型谓词把它收窄 ——
//    这正是第 5 节的题目。

// ============================================
// TODO 1：给数据结构加 interface
// ============================================
// 每个学生有 id、name、scores（数组）、还有一个可选的 note。
// 另外成绩的等级只能是 "A" | "B" | "C" | "D" 这四种之一。

// 👇 现在 students 的类型是 TS 推断出来的，能用，但不够明确。
//    请定义 Student 和 Grade 两个类型，然后给 students 标上 Student[]。

type Grade = TODO_1_请替换成联合字面量类型;
interface Student {
  // TODO: 补上四个字段
}

const students = [
  { id: 1, name: "张三", scores: [90, 85, 92], note: "班长" },
  { id: 2, name: "李四", scores: [70, 65, 80] },
  { id: 3, name: "王五", scores: [] },
];

// ============================================
// TODO 2：给函数加参数和返回值类型
// ============================================
// average 接收一个数字数组，返回平均分。
// 注意空数组要返回 0（这个逻辑已经写好了，别改）。

function average(scores) {
  if (scores.length === 0) {
    return 0;
  }
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

console.log("--- 平均分 ---");
for (const student of students) {
  console.log(`  ${student.name}: ${average(student.scores)}`);
}

// ============================================
// TODO 3：返回值类型要能精确表达"可能没有等级"
// ============================================
// 规则：90 以上 A，80 以上 B，70 以上 C，其余 D。
// **但是**：没有成绩（空数组）时返回 null。
//
// 难点：返回类型不是 Grade，而是 Grade | null。
// 写好之后，下面那个 `student.note` 那行才能正常工作。

function toGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

function gradeOf(student) {
  if (student.scores.length === 0) {
    return null;
  }
  return toGrade(average(student.scores));
}

console.log("\n--- 等级 ---");
for (const student of students) {
  const grade = gradeOf(student);
  // TODO: grade 可能是 null，这里要先判断再用（想想 04-advanced/01 的收窄）
  //
  // ⚠️ 这行现在会让程序**崩溃**：王五没有成绩，gradeOf 返回 null，
  //    于是 `null.toUpperCase()` 抛 TypeError，后面的代码全都跑不到。
  //    你可以现在就跑一下 `node exercises/exercise-01.ts` 亲手看看这个崩溃 ——
  //    它正是类型错误 TS18047（'grade' is possibly 'null'）在警告的那件事。
  //    **"编译期的红色波浪线"和"运行时的崩溃"是同一个 bug 的两种面孔。**
  //    修好这一行，后面的 TODO 才能正常输出。
  console.log(`  ${student.name}: ${grade.toUpperCase()}`);
}

// ============================================
// TODO 4：判别联合 + 穷尽性检查
// ============================================
// 一个"成绩单结果"可能是三种情况之一：
//   { kind: "ok",    grade: Grade, average: number }
//   { kind: "empty" }                              ← 没有成绩
//   { kind: "error", message: string }             ← 数据有问题
//
// 请定义 Report 类型，并让 renderReport 的 switch 覆盖全部三种情况。
// 加一个 default 分支调用 assertNever（在下面）来做穷尽性检查。

function renderReport(report) {
  console.log("  （请在这里写 switch）");
  return "";
}

function assertNever(value: never): never {
  throw new Error(`未处理的情况：${JSON.stringify(value)}`);
}

console.log("\n--- 成绩单 ---");
console.log(renderReport({ kind: "ok", grade: "A", average: 89 }));
console.log(renderReport({ kind: "empty" }));
console.log(renderReport({ kind: "error", message: "学生不存在" }));

// ============================================
// TODO 5：校验外部数据（类型谓词）
// ============================================
// 下面这个函数模拟从接口拿到数据。返回值是 unknown —— 因为网络来的东西
// TS 一无所知，这是**正确**的做法，别改成 any。
//
// 要写两个东西：
//   ① isStudent：判断"一个值是不是学生"，类型谓词
//   ② parseStudents：拿到 unknown，返回 Student[]
//
// ⚠️ 语义要求：**跳过**不合格的项，保留合格的项（不是"有一项不合格就全扔"）。
//    这正好是 04-advanced/02 里讲的 **filter + 类型谓词** 的用法。
//
// 预期结果：3 条数据里只有张三合格，所以最后应该输出"合格的 1 个：张三"。

function fetchRaw(): unknown {
  return [
    { id: 1, name: "张三", scores: [90] },
    { id: 2, name: "李四" },                 // 缺 scores，不合格
    { id: 3, name: 3, scores: [80] },        // name 不是字符串，不合格
  ];
}

function isStudent(value): value is Student {
  // TODO: 先判断是不是对象（注意 typeof null === "object" 的陷阱），
  //       再逐个字段检查 id / name / scores
  return false;
}

function parseStudents(raw): Student[] {
  // TODO: 先确认 raw 是数组，再用 filter(isStudent) 过滤。
  //       提示：Array.isArray 能把 unknown 收窄成 any[]，之后 filter 就能用了。
  return [];
}

console.log("\n--- 校验外部数据 ---");
const parsed = parseStudents(fetchRaw());
console.log(`  合格的 ${parsed.length} 个：`, parsed.map((s) => s.name).join("、"));

// ============================================
// TODO 6：异步 + catch
// ============================================
// 这个函数从"接口"取成绩单。注意 catch 里的变量是 unknown，
// 不能直接访问 .message。

async function loadReport(id) {
  try {
    if (id <= 0) {
      throw new Error(`非法的 id：${id}`);
    }
    return { kind: "ok", grade: "A", average: 90 };
  } catch (e) {
    // TODO: e 是 unknown，先判断再访问 message
    return { kind: "error", message: e.message };
  }
}

console.log("\n--- 异步 ---");
console.log(" ", await loadReport(1));
console.log(" ", await loadReport(-1));

// ============================================
// TODO 7（进阶）：用工具类型少写重复代码
// ============================================
// 创建一个"新建学生"用的类型：和 Student 一样，但没有 id
// （id 由后端生成）。
//
// 提示：Omit

type NewStudent = TODO_7_请替换;

// 下面这行的类型标注是给你检查用的，写对了就不用改
const draft: NewStudent = { name: "赵六", scores: [88] };

console.log("\n--- 工具类型 ---");
console.log("  新建学生的草稿：", draft);

// ============================================
// 完成之后
// ============================================
// 跑 `npm run check:exercises`，应该**一行报错都没有**。
// 然后对比 solutions-01.ts，看看思路是不是一样。
// 写法不完全相同没关系 —— 类型描述的是"约束"，达到同样约束的写法可以有很多种。

console.log("\n—— exercises/exercise-01.ts 结束 ——");
