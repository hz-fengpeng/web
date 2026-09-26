# 中国宏观经济指标

macOS 桌面应用，把**按官方统计口径定义**的宏观经济指标集中到一个可交互、口径可追溯的看板里。
Electron + React + TypeScript，本地 SQLite。

> ⚠️ **库里的数值是合成的演示数据，不是真实统计。** 界面顶部有一条常驻、不可关闭的横幅说明
> 这一点。各指标的「口径说明」记的是**真实统计口径**，仅用于指导界面呈现。
> 应用**完全不联网**，也不生成任何数据——它只把随应用发布的 `resources/macro.db`
> 复制到用户目录后读取（[§3.2.0](docs/02-数据层.md)）。

**完整设计与决策记录见 [docs/](docs/README.md)**（按主题分 6 篇，`§X.Y` 是稳定编号）。

---

## 运行

```bash
npm install
npm run dev          # 开发模式（HMR）
npm run build        # 类型检查 + 构建
npm run dist:mac     # 打包成未签名的本地 .app（约 289MB）
```

> ⚠️ **如果在 VS Code 的集成终端里启动，请用 `env -u ELECTRON_RUN_AS_NODE npm run dev`。**
>
> VS Code 会给集成终端注入 `ELECTRON_RUN_AS_NODE=1`，该变量让 Electron 二进制退化成普通
> Node。症状是启动即报 `does not provide an export named 'app'`，且
> `electron --version` 打印的是 Node 版本号而不是 Electron 版本号——极易误诊为构建问题。
> 用系统终端启动也可以避免。

## 测试

```bash
npm test             # 42 例，全部离线
npm run typecheck    # tsc --noEmit，node/web 两个 project 各跑一遍
```

测试与源码同目录（`src/main/db/migrate.test.ts`、`src/main/db/bootstrap.test.ts`、
`src/renderer/src/charts/lineOption.test.ts`）。
没有 E2E、没有联网用例、也没有 CI——本机的 `npm test` 就是全部的自动化关口
（[§10.3](docs/05-工程化与交付.md)）。

## 数据与合规

- 数据是**内置的合成示例库**，随项目提交，版权问题不存在；但**不得被当成真实统计**。
- 应用仅本地运行、**个人自用、不对外分发**（[§1.4](docs/01-产品定义.md)）。不签名、不公证、不做自动更新。
- 渲染进程的 CSP 是 `connect-src 'none'`，**应用根本不联网**（[§9.2](docs/05-工程化与交付.md)）。

## 当前进度

**M0 → M2a 已完成**：骨架与技术验证、迁移机制、数据固化为内置库、详情页折线图。
指标定义在 [`src/shared/indicators.ts`](src/shared/indicators.ts)——**10 个指标**，
那是指标元数据的唯一事实源。

下一步是 M2b（设计系统 + 概览页）。里程碑与风险见 [docs/06-里程碑与决策.md](docs/06-里程碑与决策.md)。
