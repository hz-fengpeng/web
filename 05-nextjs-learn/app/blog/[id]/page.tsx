import Link from 'next/link'

// 动态路由页面
// [id] 会匹配任何路径，如 /blog/1, /blog/abc 等
export default async function BlogPost({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 在 Next.js 15+ 中，params 是一个 Promise
  const { id } = await params

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">📝 博客文章</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <span className="text-sm text-gray-500">文章 ID:</span>
            <h2 className="text-3xl font-semibold text-blue-600">{id}</h2>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 mb-4">
              这是一个动态路由示例。URL 中的 <code className="bg-gray-100 px-2 py-1 rounded">{id}</code> 
              被自动传递给这个组件。
            </p>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">💡 工作原理：</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>文件路径: <code>app/blog/[id]/page.tsx</code></li>
                <li>匹配路由: <code>/blog/*</code></li>
                <li>参数获取: <code>params.id</code></li>
              </ul>
            </div>

            <div className="bg-gray-100 p-4 rounded">
              <p className="text-sm font-mono">
                试试访问不同的 ID：
              </p>
              <div className="mt-2 space-y-1">
                <Link href="/blog/1" className="block text-blue-600 hover:underline">
                  /blog/1
                </Link>
                <Link href="/blog/hello" className="block text-blue-600 hover:underline">
                  /blog/hello
                </Link>
                <Link href="/blog/next-js-tutorial" className="block text-blue-600 hover:underline">
                  /blog/next-js-tutorial
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-x-4">
          <Link href="/routing" className="text-blue-600 hover:underline">
            ← 返回路由页面
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
