'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 这是一个 Client Component，因为使用了 useRouter hook
export default function RoutingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">🔄 路由和导航</h1>
        
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">1. Link 组件导航</h2>
            <p className="text-gray-700 mb-3">
              使用 Next.js 的 Link 组件进行客户端导航，无需刷新页面：
            </p>
            <pre className="bg-gray-100 p-3 rounded mb-3 text-sm">
{`import Link from 'next/link'

<Link href="/about">关于我们</Link>`}
            </pre>
            <div className="space-y-2">
              <Link 
                href="/" 
                className="block p-3 bg-blue-50 hover:bg-blue-100 rounded transition"
              >
                → 导航到首页
              </Link>
              <Link 
                href="/basics" 
                className="block p-3 bg-blue-50 hover:bg-blue-100 rounded transition"
              >
                → 导航到基础概念
              </Link>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">2. useRouter 编程式导航</h2>
            <p className="text-gray-700 mb-3">
              在客户端组件中，可以使用 useRouter 进行编程式导航：
            </p>
            <pre className="bg-gray-100 p-3 rounded mb-3 text-sm">
{`'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/about')  // 导航
router.back()          // 返回
router.refresh()       // 刷新`}
            </pre>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/')}
                className="block w-full p-3 bg-green-500 text-white hover:bg-green-600 rounded transition"
              >
                使用 router.push() 导航到首页
              </button>
              <button 
                onClick={() => router.back()}
                className="block w-full p-3 bg-gray-500 text-white hover:bg-gray-600 rounded transition"
              >
                使用 router.back() 返回上一页
              </button>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">3. 动态路由</h2>
            <p className="text-gray-700 mb-3">
              使用方括号创建动态路由：
            </p>
            <pre className="bg-gray-100 p-3 rounded mb-3 text-sm">
{`app/blog/[id]/page.tsx

export default function BlogPost({ params }: { params: { id: string } }) {
  return <div>文章 ID: {params.id}</div>
}`}
            </pre>
            <div className="space-y-2">
              <Link 
                href="/blog/1" 
                className="block p-3 bg-purple-50 hover:bg-purple-100 rounded transition"
              >
                → 查看文章 1 (动态路由示例)
              </Link>
              <Link 
                href="/blog/2" 
                className="block p-3 bg-purple-50 hover:bg-purple-100 rounded transition"
              >
                → 查看文章 2 (动态路由示例)
              </Link>
            </div>
          </section>

          <Link href="/" className="inline-block mt-6 text-blue-600 hover:underline">
            ← 返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
