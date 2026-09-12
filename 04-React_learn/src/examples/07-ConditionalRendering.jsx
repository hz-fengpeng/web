// 示例 7: 条件渲染
// 根据条件显示不同的内容

/*
 * 条件渲染的方式
 * 
 * 1. if/else 语句（在 return 之前）
 * 2. 三元运算符 condition ? true : false
 * 3. && 运算符（短路运算）
 * 4. switch 语句
 * 5. 立即执行函数
 */

import { useState } from 'react'

function Example07_ConditionalRendering() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState('guest')
  const [showMessage, setShowMessage] = useState(false)
  
  // 方式 1: if/else（在 return 之前）
  let greeting
  if (isLoggedIn) {
    greeting = <h3>欢迎回来！</h3>
  } else {
    greeting = <h3>请先登录</h3>
  }
  
  return (
    <div className="example">
      <h2>07 - 条件渲染</h2>
      <p>根据不同条件显示不同的内容</p>
      
      <div style={{ marginTop: '15px' }}>
        <h3>方式 1: if/else 语句</h3>
        {greeting}
        <button onClick={() => setIsLoggedIn(!isLoggedIn)}>
          {isLoggedIn ? '退出登录' : '登录'}
        </button>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>方式 2: 三元运算符</h3>
        <p>
          {isLoggedIn ? (
            <span style={{ color: 'green' }}>✓ 已登录</span>
          ) : (
            <span style={{ color: 'red' }}>✗ 未登录</span>
          )}
        </p>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>方式 3: && 运算符（短路运算）</h3>
        <button onClick={() => setShowMessage(!showMessage)}>
          {showMessage ? '隐藏消息' : '显示消息'}
        </button>
        {/* 只有 showMessage 为 true 时才显示 */}
        {showMessage && (
          <p style={{ 
            marginTop: '10px', 
            padding: '10px', 
            background: '#e3f2fd',
            borderRadius: '4px'
          }}>
            这是一条消息！
          </p>
        )}
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>方式 4: switch 语句（多条件）</h3>
        <select value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="guest">访客</option>
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
        
        {/* 根据用户类型显示不同内容 */}
        {(() => {
          switch (userType) {
            case 'admin':
              return <p style={{ color: 'red' }}>👑 管理员权限</p>
            case 'user':
              return <p style={{ color: 'blue' }}>👤 普通用户权限</p>
            case 'guest':
              return <p style={{ color: 'gray' }}>👻 访客权限</p>
            default:
              return null
          }
        })()}
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 使用建议：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>简单条件用三元运算符: condition ? A : B</li>
          <li>只显示/隐藏用 &&: condition && {'<Component />'}</li>
          <li>复杂逻辑用 if/else 或 switch</li>
          <li>避免在 JSX 中写太复杂的逻辑</li>
        </ul>
      </div>
    </div>
  )
}

export default Example07_ConditionalRendering
