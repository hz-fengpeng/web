// 示例 3: Props（属性）
// Props 用于父组件向子组件传递数据

// 子组件：接收 props
function UserCard({ name, age, role }) {
  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '10px', 
      margin: '10px 0',
      borderRadius: '4px'
    }}>
      <h3>{name}</h3>
      <p>年龄: {age}</p>
      <p>职位: {role}</p>
    </div>
  )
}

// 父组件：传递 props
function Example03_Props() {
  return (
    <div className="example">
      <h2>03 - Props（属性传递）</h2>
      <p>Props 让组件可以接收外部数据，实现组件复用</p>
      
      <UserCard name="张三" age={28} role="前端工程师" />
      <UserCard name="李四" age={32} role="后端工程师" />
      <UserCard name="王五" age={25} role="UI 设计师" />
    </div>
  )
}

export default Example03_Props
