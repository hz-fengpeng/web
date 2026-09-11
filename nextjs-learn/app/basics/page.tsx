// 基础概念页面
export default function BasicsPage() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">📚 基础概念</h1>
        
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">1. Server Components vs Client Components</h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-lg">Server Components (默认)</h3>
                <ul className="list-disc list-inside mt-2 text-gray-700">
                  <li>在服务器端渲染</li>
                  <li>可以直接访问数据库和后端资源</li>
                  <li>不会增加客户端 JavaScript 包大小</li>
                  <li>不能使用 useState, useEffect 等 hooks</li>
                </ul>
                <pre className="bg-gray-100 p-3 rounded mt-2 text-sm">
{`// 默认就是 Server Component
export default function MyComponent() {
  return <div>我是服务器组件</div>
}`}
                </pre>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-lg">Client Components</h3>
                <ul className="list-disc list-inside mt-2 text-gray-700">
                  <li>在客户端渲染</li>
                  <li>可以使用 React hooks (useState, useEffect 等)</li>
                  <li>可以使用浏览器 API</li>
                  <li>需要在文件顶部添加 'use client'</li>
                </ul>
                <pre className="bg-gray-100 p-3 rounded mt-2 text-sm">
{`'use client'  // 声明为客户端组件

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>
    点击: {count}
  </button>
}`}
                </pre>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">2. 文件系统路由</h2>
            <p className="text-gray-700 mb-3">
              Next.js 使用文件系统来定义路由，非常直观：
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm">
{`app/
├── page.tsx              → /
├── about/
│   └── page.tsx          → /about
├── blog/
│   ├── page.tsx          → /blog
│   └── [id]/
│       └── page.tsx      → /blog/123 (动态路由)
└── dashboard/
    ├── layout.tsx        → 共享布局
    └── page.tsx          → /dashboard`}
              </pre>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">3. 特殊文件</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-3">page.tsx</span>
                <span className="text-gray-700">定义页面 UI</span>
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-3">layout.tsx</span>
                <span className="text-gray-700">定义共享布局</span>
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-3">loading.tsx</span>
                <span className="text-gray-700">加载状态 UI</span>
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-3">error.tsx</span>
                <span className="text-gray-700">错误处理 UI</span>
              </li>
            </ul>
          </section>

          <a href="/" className="inline-block mt-6 text-blue-600 hover:underline">
            ← 返回首页
          </a>
        </div>
      </main>
    </div>
  );
}
