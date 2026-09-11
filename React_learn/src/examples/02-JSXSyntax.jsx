// 示例 2: JSX 语法
// JSX 允许在 JavaScript 中写类似 HTML 的代码

function Example02_JSXSyntax() {
  const name = '小明'
  const age = 25
  const hobbies = ['编程', '阅读', '运动']
  
  return (
    <div className="example">
      <h2>02 - JSX 语法</h2>
      
      {/* 使用 {} 在 JSX 中嵌入 JavaScript 表达式 */}
      <p>姓名: {name}</p>
      <p>年龄: {age}</p>
      <p>明年: {age + 1} 岁</p>
      
      {/* 渲染列表 */}
      <p>爱好:</p>
      <ul>
        {hobbies.map((hobby, index) => (
          <li key={index}>{hobby}</li>
        ))}
      </ul>
      
      {/* 条件渲染 */}
      <p>{age >= 18 ? '成年人' : '未成年'}</p>
    </div>
  )
}

export default Example02_JSXSyntax
