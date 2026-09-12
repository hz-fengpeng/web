// ============================================
// 练习 01 参考答案
// ============================================
//
// 和 exercise-01.ts 是**同一个程序**，只是类型都补上了。
// 建议的用法：
//   1. 先做 exercise-01.ts，做到 `npm run check:exercises` 干净
//   2. 再对比这个文件，重点看**思路**的不同，而不是写法是否逐字一样
//
// 这个文件本身就是干净的：`npm run check:exercises` 不该因为它报错。
// 它和 exercise-01.ts 用的是**不同的变量名**（加了 S 后缀），
// 所以两个文件同时在一个目录里也不会冲突。
//
// 每个 TODO 后面都有一小段"为什么这么写"，这是这个文件真正的价值。

// ============================================
// TODO 1：数据结构
// ============================================

// 等级用联合字面量类型 —— 这就是"只能是这四个值之一"的表达方式。
// 为什么不用 string？因为 string 允许 "X"、"随便什么"，拼错了也不报错。
type GradeS = "A" | "B" | "C" | "D";

interface StudentS {
  id: number;
  name: string;
  scores: number[];
  note?: string;        // note 是可选的，所以加 ?
}

// 标上 StudentS[] 之后，这个数组里少写/多写字段都会被立刻发现。
const studentsS: StudentS[] = [
  { id: 1, name: "张三", scores: [90, 85, 92], note: "班长" },
  { id: 2, name: "李四", scores: [70, 65, 80] },
  { id: 3, name: "王五", scores: [] },
];

// 为什么标在变量上而不是靠推断？
// 推断出来的类型是"这个字面量的形状"，而我们想要的是"Student 这个概念"。
// 标上之后，以后加字段、改字段，编译器会帮我们找出所有要改的地方。

// ============================================
// TODO 2：函数的参数和返回值
// ============================================

// 参数必须标类型。返回值这里标了 number，是有意的：
// 一旦标了，函数体里"不小心返回了字符串"会被立刻发现。
// 注意 reduce 的两个参数不需要标 —— 因为 scores 已经是 number[]，
// TS 能从 reduce 的签名推断出 sum 和 n 都是 number。
// 这就是"类型标在入口，内部自动推导"，不用到处写。
function averageS(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

console.log("--- 平均分 ---");
for (const student of studentsS) {
  console.log(`  ${student.name}: ${averageS(student.scores)}`);
}

// ============================================
// TODO 3：返回值可能是 null
// ============================================

// 关键点：返回类型写 GradeS | null，而不是 GradeS。
// 如果只写 GradeS，那 return null 那行会报错 ——
// 这个报错是**好事**，它在说"你承诺了一定有等级，但这里没有"。
// 正确的做法是把 null 写进类型，让调用方不得不处理这种情况。
function toGradeS(score: number): GradeS {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

function gradeOfS(student: StudentS): GradeS | null {
  if (student.scores.length === 0) {
    return null;
  }
  return toGradeS(averageS(student.scores));
}

console.log("\n--- 等级 ---");
for (const student of studentsS) {
  const grade = gradeOfS(student);
  // 必须判断 null 才能用 —— 这就是把 null 写进返回类型的收益：
  // 编译器逼着你处理"没成绩"这种情况，而不是等你上线后崩在这里。
  console.log(`  ${student.name}: ${grade === null ? "暂无成绩" : grade}`);
}

// 对照一下 JS 的写法：JS 里 null 会一路传下去，
// 直到某处 `.toUpperCase()` 抛 "Cannot read properties of null" 才发现。
// 从"运行时崩溃"提前到"编译期报错"，这就是类型系统的主要价值。

// ============================================
// TODO 4：判别联合 + 穷尽性检查
// ============================================

// 三个 kind 组成一个联合，每个成员带着自己需要的数据。
// 注意 empty 那个成员**没有**多余字段 —— 这是判别联合的常见形态。
type ReportS =
  | { kind: "ok"; grade: GradeS; average: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

function renderReportS(report: ReportS): string {
  switch (report.kind) {
    case "ok":
      // 这个分支里 report 就是 { kind: "ok"; grade; average }，
      // 直接访问 grade 和 average 都是类型安全的
      return `${report.grade}（平均 ${report.average}）`;
    case "empty":
      return "暂无成绩";
    case "error":
      return `出错了：${report.message}`;
    default:
      // 走到这里说明三个分支都没匹配上 —— 那 report 就只能是 never。
      // 如果将来给 ReportS 加了第四种情况而忘了在这里处理，
      // 这行会报 "not assignable to parameter of type 'never'"，
      // 并且报错信息里会写出你漏掉的那个类型。
      return assertNeverS(report);
  }
}

function assertNeverS(value: never): never {
  throw new Error(`未处理的情况：${JSON.stringify(value)}`);
}

console.log("\n--- 成绩单 ---");
console.log(renderReportS({ kind: "ok", grade: "A", average: 89 }));
console.log(renderReportS({ kind: "empty" }));
console.log(renderReportS({ kind: "error", message: "学生不存在" }));

// ============================================
// TODO 5：类型谓词校验外部数据
// ============================================

// 这个函数的返回类型是 unknown，**不要改成 any**。
// unknown 是"我还不知道这是什么，用之前必须先检查"；
// any 是"别管了，随便用" —— 后者会让类型检查在这里彻底失效。
function fetchRawS(): unknown {
  return [
    { id: 1, name: "张三", scores: [90] },
    { id: 2, name: "李四" },
    { id: 3, name: 3, scores: [80] },
  ];
}

// 单项检查：只负责回答"这一个值是不是学生"
function isStudentS(value: unknown): value is StudentS {
  if (typeof value !== "object" || value === null) {
    return false;       // 这一行同时排除了 null 和"根本不是对象"
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.scores) &&
    candidate.scores.every((score) => typeof score === "number")
    // note 是可选的，所以不检查 —— 存在但不是字符串的情况这里放过了，
    // 真实项目里可能要更严格（或者直接用 zod 这类库）
  );
}

function parseStudentsS(raw: unknown): StudentS[] {
  // 两步，缺一不可：
  //   ① Array.isArray(raw) 先把 unknown 收窄成 any[]
  //   ② .filter(isStudentS) 用谓词过滤，结果类型自动变成 StudentS[]
  //
  // ⚠️ 这里有个**很容易写错**的地方：别把谓词写成"整个数组是不是学生数组"
  //    然后 `isStudentList(raw) ? raw : []`。那样语义就变成了
  //    "只要有一项不合格就把整批扔掉" —— 和题目要求的"跳过不合格项"不同。
  //    写这份答案时我真的先写错成了后者，跑出来是"合格的 0 个"。
  //
  //    想清楚你要的是哪种语义：
  //      过滤（跳过坏的）  → filter(isStudent)
  //      整批校验（全好才算数）→ every(isStudent)
  //    两者都能用谓词写，但业务含义完全不同。
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isStudentS);
}

console.log("\n--- 校验外部数据 ---");
const parsedS = parseStudentsS(fetchRawS());
console.log(`  合格的 ${parsedS.length} 个：`, parsedS.map((s) => s.name).join("、"));
// 预期输出"合格的 1 个：张三"—— 李四缺 scores，第三条的 name 是数字，都被跳过了。
// 注意这里"过滤掉不合格数据"是一个**业务选择** —— 也可以选择整批拒绝并报错。
// 类型系统只负责让这个选择变得显式，不替你决定怎么选。

// ============================================
// TODO 6：异步 + catch
// ============================================

async function loadReportS(id: number): Promise<ReportS> {
  try {
    if (id <= 0) {
      throw new Error(`非法的 id：${id}`);
    }
    return { kind: "ok", grade: "A", average: 90 };
  } catch (e) {
    // e 的类型是 unknown —— 因为 JS 的 throw 可以扔任何东西，
    // 不一定是 Error。所以访问 .message 之前必须先判断。
    return {
      kind: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

// 注意返回类型写的是 Promise<ReportS>，不是 ReportS ——
// async 函数在运行时**一定**返回 Promise，所以类型也必须这么写。
// 而里面那两处 return 写的是普通对象，TS 会自动帮你包起来 ——
// 这是 async 函数的一个便利：里面写返回值，外面标 Promise。
console.log("\n--- 异步 ---");
console.log(" ", await loadReportS(1));
console.log(" ", await loadReportS(-1));

// ============================================
// TODO 7：工具类型
// ============================================

// Omit<StudentS, "id"> = "StudentS 去掉 id 之后剩下的部分"。
// 好处是**不用重复写字段**：以后给 StudentS 加个班级字段，
// NewStudentS 自动跟着有，不会出现两份定义不一致的情况。
//
// ⚠️ 要注意 Omit 的第二个参数不检查拼写（见 04-advanced/03 第二节）。
//    这里写 "id" 是对的，但如果你手滑写成 "idd"，TS 不会报错，
//    结果是 NewStudentS 变成了完整的 StudentS —— 只能靠自己核对。
type NewStudentS = Omit<StudentS, "id">;

const draftS: NewStudentS = { name: "赵六", scores: [88] };
// const badDraft: NewStudentS = { id: 9, name: "赵六", scores: [88] };
//   ❌ error TS2353: Object literal may only specify known properties,
//      and 'id' does not exist in type 'NewStudentS'.
//   ↑ 多写 id 会被拦住，这正是我们想要的效果

console.log("\n--- 工具类型 ---");
console.log("  新建学生的草稿：", draftS);

// ============================================
// 做完之后的回顾
// ============================================
// 回头看这一路加的类型，它们各自解决了什么问题：
//
//   Grade 联合字面量    → 挡住"拼错的等级"
//   Student interface   → 挡住"字段写错、漏写"
//   参数/返回值类型      → 挡住"传错类型的参数"
//   Grade | null        → 逼着调用方处理"没成绩"
//   判别联合 + never    → 逼着处理"新加的情况"
//   unknown + 谓词      → 让"外部数据的不可信"变成显式的
//   Omit                → 去掉重复定义
//
// 共同点：**把"本来会在运行时才发现的问题"提前到编译期**，
// 并且把"作者心里的假设"写成了编译器能检查的东西。
//
// 这也是为什么写 TS 时要问自己：
//   "这个类型的**约束**够不够紧？有没有表达出我真正的假设？"
// 类型写得太松（到处 any、到处 string），等于白写。

console.log("\n—— exercises/solutions-01.ts 结束 ——");
