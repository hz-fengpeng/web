// 示例 4: State（状态）
// useState 是 React Hook，用于在组件中添加状态

/*
 * useState 详细说明
 * 
 * 1. 基本语法：
 *    const [状态值, 更新函数] = useState(初始值)
 * 
 * 2. 为什么需要 useState？
 *    - 普通变量改变不会触发界面更新
 *    - useState 创建的状态改变时，React 会自动重新渲染组件
 * 
 * 3. 命名规范：
 *    通常遵循 [xxx, setXxx] 的模式
 *    例如：[count, setCount]、[name, setName]
 * 
 * 4. 不同类型的初始值：
 *    - 数字：useState(0)
 *    - 字符串：useState('文本')
 *    - 布尔值：useState(false)
 *    - 数组：useState([])
 *    - 对象：useState({ key: value })
 * 
 * 5. 更新状态的方式：
 *    方式 1: 直接设置新值
 *      setCount(5)
 *    
 *    方式 2: 基于旧值更新（推荐）
 *      setCount(prevCount => prevCount + 1)
 * 
 * 6. 更新对象和数组：
 *    - 对象：setUser({ ...user, age: 26 })
 *    - 数组添加：setItems([...items, newItem])
 *    - 数组删除：setItems(items.filter(item => item.id !== id))
 * 
 * 7. 工作原理：
 *    状态改变 → React 检测到变化 → 组件重新渲染 → 显示新值
 * 
 * 8. 关键点：
 *    - 不要直接修改状态（必须用 set 函数）
 *    - 状态更新是异步的
 *    - 每个组件的状态是独立的
 */

import { useState } from 'react'

function Example04_State() {
  // useState 返回 [状态值, 更新函数]
  // count 是状态值，setCount 是更新函数，0 是初始值
  const [count, setCount] = useState(0)
  const [name, setName] = useState('访客')
  
  // 演示：基于旧值更新（推荐方式）
  const incrementByFunction = () => {
    setCount(prevCount => prevCount + 1)
  }
  
  return (
    <div className="example">
      <h2>04 - State（状态管理）</h2>
      <p>State 是组件的内部数据，当 state 改变时，组件会重新渲染</p>
      
      <div style={{ marginTop: '15px' }}>
        <h3>计数器示例</h3>
        <p>当前计数: {count}</p>
        
        {/* 方式 1: 直接设置新值 */}
        <button onClick={() => setCount(count + 1)}>+1</button>
        <button onClick={() => setCount(count - 1)}>-1</button>
        <button onClick={() => setCount(0)}>重置</button>
        
        {/* 方式 2: 使用函数更新（推荐） */}
        <button onClick={incrementByFunction}>+1 (函数方式)</button>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>输入框示例</h3>
        <p>你好, {name}!</p>
        {/* 
          受控组件：
          - value 绑定到状态
          - onChange 更新状态
          - 状态改变 → 输入框显示新值
        */}
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入你的名字"
        />
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 重要提示：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>普通变量改变不会更新界面，必须使用 useState</li>
          <li>不要直接修改状态：count = 5 ❌，要用 setCount(5) ✅</li>
          <li>状态更新是异步的，不会立即生效</li>
          <li>每次状态改变，组件会重新渲染</li>
        </ul>
      </div>
    </div>
  )
}

export default Example04_State
