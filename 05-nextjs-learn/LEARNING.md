# Next.js 学习指南

## 为什么需要 Next.js？

在学怎么用之前，先看清楚它填补的是哪个洞。

### 问题：Vite + React 产出的是一个空壳

看 `04-React_learn/index.html`：

```html
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

`#root` 里是空的。浏览器一开始拿到的 HTML **没有任何内容**——它必须先下载 `main.jsx` → React → 你的组件，全部执行完，才往 `#root` 里塞东西。

这个过程叫 **CSR（客户端渲染，Client-Side Rendering）**。

#### 三个直接后果

| 问题 | 原因 |
|------|------|
| **SEO 差** | 搜索引擎爬虫抓到的 HTML 就是 `<div id="root"></div>`，正文一个字没有 |
| **首屏白屏** | JS 下载 + 执行完之前页面是白的，而且资源是一条串行的下载链 |
| **够不到数据** | 数据库在服务器上，浏览器只能先有 API 层，再 fetch 回来 |

用 C/C++ 打比方：Vite + React 相当于**给客户发一份施工图纸加一支施工队**，客户到了现场才开始盖房子。Next.js 是**把房子盖好再发货**（至少首屏那间已经盖好了）。

### Next.js 做的三件事

#### 1. 在服务器上先把 HTML 拼好（SSR / SSG / RSC）

同一个组件函数，Next.js 可以先在服务器上跑一遍，把生成的 HTML 发出去。浏览器拿到的是**有内容的 HTML**，之后再由 JS "注水"（hydration）接管交互。上面三个问题一次解决。

#### 2. Server Component：直接删掉一层 API

这是 App Router 最本质的变化。以前取数据要写四层：

```
数据库 → Express API → fetch → useState → 渲染
```

现在组件本身就跑在服务器上，能直接够到数据源：

```tsx
// app/users/page.tsx —— 默认就是 Server Component
export default async function Page() {
  const users = await db.query('SELECT * FROM users');
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

所以下面「Server Component 能直接访问后端资源」不是一条优化技巧，**是一层架构被删掉了**。

#### 3. 它是框架，不是构建工具

Vite 是构建工具（bundler），只负责把源码变成浏览器能跑的 JS；路由、API 层、图片字体优化一个都没带。

| 需要什么 | Vite + React | Next.js |
|---------|-------------|---------|
| 路由 | 自己装 react-router | 目录即路由（`app/about/page.tsx` → `/about`） |
| 后端 API | 自己起 Express | `app/api/xxx/route.ts` |
| 图片优化 | 自己做 | `next/image` |
| 字体 | 自己做 | `next/font` |
| SSR | 基本不用想 | 默认行为 |
| 构建配置 | 自己配 | 开箱即用 |

类比：**Vite 是 gcc，Next.js 是带构建系统的一整套 SDK。**

### 反过来：什么时候不需要 Next.js

这点比上面更重要，否则容易过度使用：

- **后台管理、内部工具**：登录后才用，不需要 SEO，Server Component 的价值大打折扣
- **纯交互密集的应用**：首屏就是一块画布，SSR 帮不上忙
- **Electron**：用不上。SSR 的前提是"有服务器给爬虫和用户发 HTML"，而 Electron 的页面只在本机跑，既没有搜索引擎也没有网络首屏的问题——那里仍然是 React + Vite 那一套

### 一句话总结

Vite + React 解决「**怎么写组件**」；Next.js 解决「**HTML 谁来生成、路由谁来管、数据谁来取**」。

## create-next-app 是什么？

`create-next-app` 是 Next.js 官方提供的脚手架工具，用于快速创建新的 Next.js 项目。

### 主要功能

- **快速初始化**：自动生成项目结构和必要的配置文件
- **交互式设置**：在创建过程中可以选择 TypeScript、ESLint、Tailwind CSS 等配置
- **最佳实践**：生成的项目遵循 Next.js 官方推荐的目录结构和配置

### 使用方式

```bash
# 使用 npx（推荐）
npx create-next-app@latest

# 或指定项目名称
npx create-next-app@latest my-app

# 使用 yarn
yarn create next-app

# 使用 pnpm
pnpm create next-app
```

### 常见选项

运行命令后会提示选择：
- 是否使用 TypeScript
- 是否使用 ESLint
- 是否使用 Tailwind CSS
- 是否使用 `src/` 目录
- 是否使用 App Router（新版路由系统）
- 是否自定义默认 import alias

### 本项目配置

这个项目就是用 `create-next-app` 创建的，包含了：
- App Router 结构（`app/` 目录）
- TypeScript 配置
- Tailwind CSS（从 `postcss.config.mjs` 可以看出）
- ESLint 配置

版本以 `package.json` 为准：`next 16.1.6` + `react 19.2.3`，也就是 Next.js 16 的模板（App Router 是它的默认路由系统）。

## 项目结构说明

```
nextjs-learning/
├── app/                    # App Router (Next.js 13+ 的新路由系统)
│   ├── page.tsx           # 首页 (对应路由: /)
│   ├── layout.tsx         # 根布局组件
│   └── globals.css        # 全局样式
├── public/                # 静态资源文件夹
└── next.config.ts         # Next.js 配置文件
```

## 核心概念

### 1. 路由系统 (App Router)
- `app/page.tsx` → 访问 `/`
- `app/about/page.tsx` → 访问 `/about`
- `app/blog/[id]/page.tsx` → 动态路由，如 `/blog/1`

### 2. 组件类型

#### Server Components (服务器组件) - 默认

**什么是 Server Component？**

Server Component 是在服务器端渲染的 React 组件，HTML 在服务器生成后发送给浏览器。这是 Next.js App Router 中的**默认组件类型**。

**特点：**
- ✅ 在服务器端执行，不会发送到客户端
- ✅ 可以直接访问后端资源（数据库、文件系统、API）
- ✅ 减少客户端 JavaScript 包大小
- ✅ 更好的 SEO（搜索引擎能看到完整 HTML）
- ✅ 更快的首屏加载
- ❌ 不能使用浏览器 API（如 `window`、`localStorage`）
- ❌ 不能使用 React Hooks（如 `useState`、`useEffect`）
- ❌ 不能添加事件处理器（如 `onClick`）

**示例：**
```tsx
// app/page.tsx - 默认就是 Server Component
export default function Home() {
  // 可以直接在这里进行数据库查询
  // const data = await db.query('SELECT * FROM users');
  
  return (
    <div>
      <h1>这是一个 Server Component</h1>
      <p>这段 HTML 在服务器生成</p>
    </div>
  );
}
```

#### Client Components (客户端组件)

**什么是 Client Component？**

Client Component 是在浏览器端渲染和交互的组件，需要用 `'use client'` 声明。

**特点：**
- ✅ 可以使用 React Hooks（`useState`、`useEffect` 等）
- ✅ 可以使用浏览器 API
- ✅ 可以添加交互事件（`onClick`、`onChange` 等）
- ✅ 可以使用第三方交互库
- ❌ 会增加客户端 JavaScript 包大小
- ❌ 不能直接访问服务器资源

**示例：**
```tsx
'use client'  // 必须在文件顶部声明

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        点击 +1
      </button>
    </div>
  );
}
```

#### 如何选择？

| 场景 | 使用组件类型 |
|------|-------------|
| 展示静态内容 | Server Component |
| 需要交互（点击、输入） | Client Component |
| 需要使用 Hooks | Client Component |
| 直接查询数据库 | Server Component |
| 使用浏览器 API | Client Component |
| SEO 优化 | Server Component |

#### 组合使用

可以在 Server Component 中嵌套 Client Component：

```tsx
// app/page.tsx (Server Component)
import Counter from './Counter';  // Client Component

export default function Home() {
  return (
    <div>
      <h1>这是 Server Component</h1>
      <Counter />  {/* 这是 Client Component */}
    </div>
  );
}
```

**最佳实践：**
- 默认使用 Server Component
- 只在需要交互时才使用 Client Component
- 尽量将 Client Component 放在组件树的叶子节点

### 3. 布局 (Layout)
- `layout.tsx` 是共享的 UI 布局
- 可以嵌套，子路由会继承父路由的布局

## 学习步骤

1. ✅ 项目已创建
2. 📝 查看基础页面示例
3. 🔄 学习路由和导航
4. 📊 学习数据获取
5. 🎨 学习样式和 Tailwind CSS

## npm run dev 启动流程详解

### 1. 命令执行链路

```bash
npm run dev
  ↓
执行 package.json 中的 "dev": "next dev"
  ↓
启动 Next.js 开发服务器
```

### 2. 启动过程

当你运行 `npm run dev` 时，Next.js 会：

#### 第一步：读取配置
- 读取 `next.config.ts` 配置文件
- 读取 `tsconfig.json` TypeScript 配置
- 读取 `postcss.config.mjs` 样式配置
- 读取 `app/globals.css`：Tailwind v4 的配置就写在这里（`@import "tailwindcss"` 和 `@theme inline`），**v4 已经取消了 `tailwind.config.ts` 这个文件**

#### 第二步：编译和构建
- 扫描 `app/` 目录，识别所有路由
- 编译 TypeScript 文件为 JavaScript
- 处理 CSS 和 Tailwind 样式
- 进行代码分割和优化

#### 第三步：启动开发服务器
- 默认在 `http://localhost:3000` 启动服务器
- 启用热模块替换 (HMR)，文件修改后自动刷新
- 启用 Fast Refresh，保持组件状态

#### 第四步：渲染首页
当你访问 `http://localhost:3000` 时：

```
1. 匹配路由 → app/page.tsx
2. 加载布局 → app/layout.tsx
3. 渲染流程：
   RootLayout (layout.tsx)
     └── Home (page.tsx)
```

### 3. 文件监听

开发服务器会监听文件变化：
- 修改 `.tsx`、`.ts` 文件 → 自动重新编译
- 修改 `.css` 文件 → 自动更新样式
- 修改配置文件 → 需要重启服务器

### 4. 关键文件作用

| 文件 | 作用 |
|------|------|
| `app/layout.tsx` | 根布局，包裹所有页面，定义 HTML 结构 |
| `app/page.tsx` | 首页组件，对应 `/` 路由 |
| `app/globals.css` | 全局样式文件 |
| `next.config.ts` | Next.js 配置（路由、环境变量等） |
| `package.json` | 定义脚本命令和依赖 |

### 5. 开发模式特性

- **热重载 (HMR)**：修改代码后浏览器自动更新，无需手动刷新
- **Fast Refresh**：保持 React 组件状态，只更新修改的部分
- **错误提示**：在浏览器和终端显示详细的错误信息
- **TypeScript 检查**：实时类型检查和错误提示

## 运行项目

```bash
cd 05-nextjs-learn
npm install      # 第一次运行前先装依赖，装完才会有 node_modules
npm run dev
```

然后访问 http://localhost:3000

### 其他命令

```bash
npm run build    # 构建生产版本
npm run start    # 启动生产服务器（需先 build）
npm run lint     # 运行 ESLint 检查代码
```
