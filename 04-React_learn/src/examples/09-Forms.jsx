// 示例 9: 表单处理
// 受控组件和表单验证

/*
 * 表单处理详细说明
 * 
 * 1. 受控组件：
 *    - 表单元素的值由 React state 控制
 *    - value 绑定到 state
 *    - onChange 更新 state
 * 
 * 2. 非受控组件：
 *    - 使用 ref 直接访问 DOM
 *    - 不推荐（除非特殊情况）
 * 
 * 3. 常见表单元素：
 *    - input (text, email, password, number)
 *    - textarea
 *    - select
 *    - checkbox
 *    - radio
 * 
 * 4. 表单验证：
 *    - 实时验证
 *    - 提交时验证
 *    - 显示错误信息
 */

import { useState } from 'react'

function Example09_Forms() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    interests: [],
    bio: '',
    agree: false
  })
  
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  
  // 处理输入变化
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // 清除该字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }
  
  // 处理多选框
  const handleInterestChange = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }
  
  // 表单验证
  const validate = () => {
    const newErrors = {}
    
    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空'
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少 3 个字符'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }
    
    if (!formData.password) {
      newErrors.password = '密码不能为空'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少 6 个字符'
    }
    
    if (!formData.age) {
      newErrors.age = '年龄不能为空'
    } else if (formData.age < 1 || formData.age > 120) {
      newErrors.age = '年龄必须在 1-120 之间'
    }
    
    if (!formData.gender) {
      newErrors.gender = '请选择性别'
    }
    
    if (!formData.agree) {
      newErrors.agree = '请同意用户协议'
    }
    
    return newErrors
  }
  
  // 提交表单
  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = validate()
    
    if (Object.keys(newErrors).length === 0) {
      setSubmitted(true)
      console.log('表单数据:', formData)
    } else {
      setErrors(newErrors)
      setSubmitted(false)
    }
  }
  
  return (
    <div className="example">
      <h2>09 - 表单处理</h2>
      <p>受控组件和表单验证</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '15px' }}>
        {/* 文本输入 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            用户名 *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="至少 3 个字符"
            style={{ 
              width: '100%',
              border: errors.username ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.username && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.username}
            </span>
          )}
        </div>
        
        {/* 邮箱输入 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            邮箱 *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@email.com"
            style={{ 
              width: '100%',
              border: errors.email ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.email && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.email}
            </span>
          )}
        </div>
        
        {/* 密码输入 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            密码 *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="至少 6 个字符"
            style={{ 
              width: '100%',
              border: errors.password ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.password && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.password}
            </span>
          )}
        </div>
        
        {/* 数字输入 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            年龄 *
          </label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            placeholder="1-120"
            style={{ 
              width: '100%',
              border: errors.age ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.age && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.age}
            </span>
          )}
        </div>
        
        {/* 下拉选择 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            性别 *
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            style={{ 
              width: '100%',
              border: errors.gender ? '1px solid red' : '1px solid #ddd'
            }}
          >
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="other">其他</option>
          </select>
          {errors.gender && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.gender}
            </span>
          )}
        </div>
        
        {/* 多选框 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            兴趣爱好
          </label>
          {['编程', '阅读', '运动', '音乐'].map(interest => (
            <label key={interest} style={{ marginRight: '15px' }}>
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestChange(interest)}
              />
              {interest}
            </label>
          ))}
        </div>
        
        {/* 文本域 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            个人简介
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="介绍一下自己..."
            rows="3"
            style={{ width: '100%' }}
          />
        </div>
        
        {/* 单个复选框 */}
        <div style={{ marginBottom: '15px' }}>
          <label>
            <input
              type="checkbox"
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
            />
            我同意用户协议 *
          </label>
          {errors.agree && (
            <div style={{ color: 'red', fontSize: '12px' }}>
              {errors.agree}
            </div>
          )}
        </div>
        
        <button type="submit">提交</button>
      </form>
      
      {/* 提交成功提示 */}
      {submitted && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724'
        }}>
          <h4>✓ 提交成功！</h4>
          <p>用户名: {formData.username}</p>
          <p>邮箱: {formData.email}</p>
          <p>年龄: {formData.age}</p>
          <p>性别: {formData.gender}</p>
          <p>兴趣: {formData.interests.join(', ') || '无'}</p>
          <p>简介: {formData.bio || '无'}</p>
        </div>
      )}
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 表单最佳实践：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>使用受控组件（value + onChange）</li>
          <li>实时验证提供更好的用户体验</li>
          <li>显示清晰的错误信息</li>
          <li>使用 e.preventDefault() 阻止默认提交</li>
          <li>考虑使用表单库（如 Formik、React Hook Form）</li>
        </ul>
      </div>
    </div>
  )
}

export default Example09_Forms
