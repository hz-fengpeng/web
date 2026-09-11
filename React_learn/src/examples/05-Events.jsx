// 示例 5: 事件处理
// React 中的事件处理与 DOM 事件类似，但使用驼峰命名

/*
 * 事件处理详细说明
 * 
 * 1. React 事件属性（必须驼峰命名）：
 *    ✅ onClick, onChange, onSubmit, onMouseEnter
 *    ❌ onclick, onchange（小写不行）
 *    这是 React 的规定，必须遵守
 * 
 * 2. 事件处理函数名（可以随意命名）：
 *    - handleClick（推荐，业界最常见）
 *    - handle_click（下划线也可以）
 *    - onClick（也常见）
 *    - increment（直接描述动作）
 *    - abc（随便起名，但不推荐）
 *    函数名可以随意，但推荐使用 handle 前缀
 * 
 * 3. 常见命名模式：
 *    模式 1: handle + 事件类型
 *      handleClick, handleChange, handleSubmit
 *    
 *    模式 2: handle + 组件名 + 事件类型
 *      handleButtonClick, handleInputChange
 *    
 *    模式 3: on + 事件类型
 *      onClick, onChange, onSubmit
 *    
 *    模式 4: 动词开头
 *      incrementCounter, updateName, submitForm
 * 
 * 4. 原生 HTML vs React：
 *    HTML: <button onclick="handleClick()">  (小写，字符串)
 *    React: <button onClick={handleClick}>   (驼峰，函数引用)
 * 
 * 5. 常见事件类型：
 *    - onClick: 点击
 *    - onDoubleClick: 双击
 *    - onChange: 输入框内容改变
 *    - onSubmit: 表单提交
 *    - onMouseEnter: 鼠标移入
 *    - onMouseLeave: 鼠标移出
 *    - onKeyDown: 键盘按下
 *    - onFocus: 获得焦点
 *    - onBlur: 失去焦点
 * 
 * 6. 事件对象 (e)：
 *    - e.preventDefault(): 阻止默认行为
 *    - e.stopPropagation(): 阻止事件冒泡
 *    - e.target: 触发事件的元素
 *    - e.target.value: 输入框的值
 */

import { useState } from 'react'

function Example05_Events() {
  const [message, setMessage] = useState('')
  const [clickCount, setClickCount] = useState(0)
  
  // 事件处理函数
  const handleClick = () => {
    setClickCount(clickCount + 1)
    setMessage(`按钮被点击了 ${clickCount + 1} 次`)
  }
  
  const handleDoubleClick = () => {
    setMessage('按钮被双击了！')
  }
  
  const handleMouseEnter = () => {
    setMessage('鼠标移入了按钮')
  }
  
  const handleSubmit = (e) => {
    e.preventDefault() // 阻止表单默认提交行为
    setMessage('表单已提交！')
  }
  
  // 演示：不同的函数命名风格（都可以工作）
  const onButtonClick = () => {
    setMessage('使用 on 前缀的函数')
  }
  
  const increment = () => {
    setMessage('直接描述动作的函数名')
  }
  
  return (
    <div className="example">
      <h2>05 - 事件处理</h2>
      <p>React 事件使用驼峰命名: onClick, onChange, onSubmit 等</p>
      
      <div style={{ marginTop: '15px' }}>
        <h3>各种事件示例</h3>
        <button onClick={handleClick}>单击我</button>
        <button onDoubleClick={handleDoubleClick}>双击我</button>
        <button onMouseEnter={handleMouseEnter}>鼠标移入</button>
        
        {/* 演示不同的函数命名风格 */}
        <button onClick={onButtonClick}>on 前缀</button>
        <button onClick={increment}>动作描述</button>
        
        {/* 直接写箭头函数（简单逻辑时可以这样） */}
        <button onClick={() => setMessage('内联箭头函数')}>内联函数</button>
        
        {message && (
          <p style={{ 
            marginTop: '10px', 
            padding: '10px', 
            background: '#e3f2fd',
            borderRadius: '4px'
          }}>
            {message}
          </p>
        )}
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>表单提交</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="输入内容" />
          <button type="submit">提交</button>
        </form>
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 重要提示：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li><strong>React 事件属性必须驼峰：</strong>onClick ✅, onclick ❌</li>
          <li><strong>函数名可以随意：</strong>但推荐 handle 前缀（如 handleClick）</li>
          <li><strong>原生 HTML：</strong>onclick="func()" (小写，字符串)</li>
          <li><strong>React：</strong>onClick={'{func}'} (驼峰，函数引用)</li>
          <li><strong>e.preventDefault()：</strong>阻止默认行为（如表单提交刷新页面）</li>
          <li><strong>e.target.value：</strong>获取输入框的值</li>
        </ul>
      </div>
    </div>
  )
}

export default Example05_Events
