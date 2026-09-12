// 示例 8: 列表渲染和 key
// 使用 map 渲染列表，理解 key 的重要性

/*
 * 列表渲染详细说明
 * 
 * 1. 使用 map 方法渲染列表
 * 2. key 的作用：
 *    - 帮助 React 识别哪些元素改变了
 *    - 提高渲染性能
 *    - 必须在列表中唯一
 * 
 * 3. key 的选择：
 *    ✅ 使用唯一 ID（最佳）
 *    ⚠️ 使用索引（仅当列表不会重新排序时）
 *    ❌ 不使用 key（会警告）
 * 
 * 4. 常见操作：
 *    - 渲染列表
 *    - 添加项目
 *    - 删除项目
 *    - 过滤列表
 */

import { useState } from 'react'

function Example08_Lists() {
  const [todos, setTodos] = useState([
    { id: 1, text: '学习 React', completed: false },
    { id: 2, text: '写代码', completed: true },
    { id: 3, text: '喝咖啡', completed: false }
  ])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')  // all, active, completed
  
  // 添加待办事项
  const addTodo = () => {
    if (input.trim()) {
      setTodos([
        ...todos,
        { id: Date.now(), text: input, completed: false }
      ])
      setInput('')
    }
  }
  
  // 删除待办事项
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }
  
  // 切换完成状态
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }
  
  // 过滤列表
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })
  
  return (
    <div className="example">
      <h2>08 - 列表渲染和 key</h2>
      <p>使用 map 渲染列表，每个元素需要唯一的 key</p>
      
      <div style={{ marginTop: '15px' }}>
        <h3>待办事项列表</h3>
        
        {/* 添加输入框 */}
        <div style={{ marginBottom: '10px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="输入待办事项"
          />
          <button onClick={addTodo}>添加</button>
        </div>
        
        {/* 过滤按钮 */}
        <div style={{ marginBottom: '10px' }}>
          <button 
            onClick={() => setFilter('all')}
            style={{ background: filter === 'all' ? '#007bff' : '#ccc' }}
          >
            全部 ({todos.length})
          </button>
          <button 
            onClick={() => setFilter('active')}
            style={{ background: filter === 'active' ? '#007bff' : '#ccc' }}
          >
            未完成 ({todos.filter(t => !t.completed).length})
          </button>
          <button 
            onClick={() => setFilter('completed')}
            style={{ background: filter === 'completed' ? '#007bff' : '#ccc' }}
          >
            已完成 ({todos.filter(t => t.completed).length})
          </button>
        </div>
        
        {/* 渲染列表 */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredTodos.map(todo => (
            <li 
              key={todo.id}  // 重要：使用唯一 ID 作为 key
              style={{
                padding: '10px',
                margin: '5px 0',
                background: '#f5f5f5',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  color: todo.completed ? '#999' : '#000'
                }}>
                  {todo.text}
                </span>
              </div>
              <button 
                onClick={() => deleteTodo(todo.id)}
                style={{ background: '#dc3545' }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
        
        {filteredTodos.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center' }}>
            暂无待办事项
          </p>
        )}
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 关于 key：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>key 帮助 React 识别哪些元素改变了</li>
          <li>key 必须在兄弟元素中唯一</li>
          <li>优先使用数据的唯一 ID 作为 key</li>
          <li>避免使用索引作为 key（除非列表不会重新排序）</li>
          <li>不要在渲染时生成 key（如 Math.random()）</li>
        </ul>
      </div>
    </div>
  )
}

export default Example08_Lists
