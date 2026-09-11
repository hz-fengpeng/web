# Next.js 学习指南

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

这是一个标准的 Next.js 14/15 项目模板。

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
- 读取 `tailwind.config.ts` 和 `postcss.config.mjs` 样式配置

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
cd nextjs-learning
npm run dev
```

然后访问 http://localhost:3000

### 其他命令

```bash
npm run build    # 构建生产版本
npm run start    # 启动生产服务器（需先 build）
npm run lint     # 运行 ESLint 检查代码
```
