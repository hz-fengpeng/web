// 示例 6: useEffect Hook
// useEffect 用于处理副作用（side effects）

/*
 * useEffect 详细说明
 * 
 * 1. 什么是副作用？
 *    - 数据获取（API 请求）
 *    - 订阅事件
 *    - 手动修改 DOM
 *    - 定时器
 *    - 日志记录
 * 
 * 2. 基本语法：
 *    useEffect(() => {
 *      // 副作用代码
 *      return () => {
 *        // 清理函数（可选）
 *      }
 *    }, [依赖数组])
 * 
 * 3. 依赖数组的作用：
 *    - [] 空数组：只在组件挂载时执行一次
 *    - [count]：当 count 变化时执行
 *    - 不传：每次渲染都执行（慎用）
 * 
 * 4. 执行时机：
 *    - 组件渲染完成后执行
 *    - 在浏览器绘制之后执行
 * 
 * 5. 清理函数：
 *    - 组件卸载时执行
 *    - 下次 effect 执行前执行
 *    - 用于清理定时器、取消订阅等
 */

import { useState, useEffect } from 'react'

function Example06_useEffect() {
  const [count, setCount] = useState(0)
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [data, setData] = useState(null)
  
  // 示例 1: 每次 count 变化时执行
  useEffect(() => {
    document.title = `点击了 ${count} 次`
    console.log('count 变化了:', count)
  }, [count])  // 依赖 count
  
  // 示例 2: 只在组件挂载时执行一次（定时器）
  useEffect(() => {
    console.log('组件挂载了')
    
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    
    // 清理函数：组件卸载时清除定时器
    return () => {
      console.log('组件卸载，清除定时器')
      clearInterval(timer)
    }
  }, [])  // 空数组：只执行一次
  
  // 示例 3: 模拟 API 请求
  useEffect(() => {
    // 模拟异步数据获取
    const fetchData = async () => {
      setData('加载中...')
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setData('数据加载完成！')
    }
    
    fetchData()
  }, [])
  
  return (
    <div className="example">
      <h2>06 - useEffect Hook</h2>
      <p>useEffect 用于处理副作用，如数据获取、订阅、定时器等</p>
      
      <div style={{ marginTop: '15px' }}>
        <h3>示例 1: 更新页面标题</h3>
        <p>当前计数: {count}</p>
        <p>（查看浏览器标签页标题）</p>
        <button onClick={() => setCount(count + 1)}>+1</button>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>示例 2: 定时器</h3>
        <p>当前时间: {time}</p>
        <p>（每秒自动更新）</p>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <h3>示例 3: 模拟数据获取</h3>
        <p>数据状态: {data || '准备加载...'}</p>
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>💡 重要提示：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>useEffect 在组件渲染后执行</li>
          <li>依赖数组 [] 表示只执行一次</li>
          <li>依赖数组 [count] 表示 count 变化时执行</li>
          <li>返回的清理函数在组件卸载时执行</li>
          <li>常用于 API 请求、定时器、事件监听</li>
        </ul>
      </div>
    </div>
  )
}

export default Example06_useEffect
