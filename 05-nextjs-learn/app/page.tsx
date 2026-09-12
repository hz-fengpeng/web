// 这是首页组件 - 默认是 Server Component
export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-blue-600">
          欢迎学习 Next.js！
        </h1>
        
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">什么是 Next.js？</h2>
            <p className="text-gray-700">
              Next.js 是一个基于 React 的全栈框架，提供了：
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
              <li>服务端渲染 (SSR) 和静态生成 (SSG)</li>
              <li>基于文件系统的路由</li>
              <li>API 路由</li>
              <li>自动代码分割和优化</li>
              <li>内置 CSS 和 Tailwind 支持</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">学习路径</h2>
            <div className="space-y-2">
              <a href="/basics" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded transition">
                📚 1. 基础概念
              </a>
              <a href="/routing" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded transition">
                🔄 2. 路由和导航
              </a>
              <a href="/data" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded transition">
                📊 3. 数据获取
              </a>
            </div>
          </section>

          <section className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-xl font-semibold mb-2 text-green-800">💡 提示</h3>
            <p className="text-green-700">
              这个页面是一个 <strong>Server Component</strong>，
              默认在服务器端渲染，性能更好！
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
