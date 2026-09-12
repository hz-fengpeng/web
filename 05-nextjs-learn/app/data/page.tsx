// 数据获取示例 - Server Component
async function getUsers() {
  // 模拟 API 调用
  // 在真实项目中，这里可以是数据库查询或外部 API 调用
  const res = await fetch('https://jsonplaceholder.typicode.com/users?_limit=5', {
    // Next.js 扩展了 fetch，支持缓存控制
    cache: 'no-store' // 每次都获取新数据
  })
  
  if (!res.ok) {
    throw new Error('获取数据失败')
  }
  
  return res.json()
}

export default async function DataPage() {
  // 在 Server Component 中直接 await 数据
  const users = await getUsers()

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">📊 数据获取</h1>
        
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">Server Component 数据获取</h2>
            <p className="text-gray-700 mb-4">
              在 Server Component 中，可以直接使用 async/await 获取数据：
            </p>
            
            <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`async function getData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store' // 不缓存，每次都获取新数据
    // cache: 'force-cache' // 缓存数据（默认）
    // next: { revalidate: 60 } // 60秒后重新验证
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}`}
            </pre>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">✅ 优势：</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>数据在服务器端获取，更安全</li>
                <li>可以直接访问数据库</li>
                <li>减少客户端 JavaScript</li>
                <li>SEO 友好</li>
              </ul>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">实时数据示例</h2>
            <p className="text-gray-700 mb-4">
              下面的用户数据是从 API 获取的：
            </p>
            
            <div className="space-y-3">
              {users.map((user: any) => (
                <div 
                  key={user.id} 
                  className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition"
                >
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                  <p className="text-gray-500 text-sm">{user.company.name}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">缓存策略</h2>
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">force-cache (默认)</h4>
                <p className="text-sm text-gray-700">缓存数据，直到手动重新验证</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">no-store</h4>
                <p className="text-sm text-gray-700">每次请求都获取新数据</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold">revalidate</h4>
                <p className="text-sm text-gray-700">在指定时间后重新验证数据</p>
              </div>
            </div>
          </section>

          <a href="/" className="inline-block mt-6 text-blue-600 hover:underline">
            ← 返回首页
          </a>
        </div>
      </main>
    </div>
  );
}
