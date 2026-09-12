/**
 * 10 - Context (上下文)
 * 
 * Context 解决什么问题？
 * 当数据需要在多个层级的组件间共享时，用 props 一层层传递很麻烦
 * Context 可以让数据"跨越"组件层级，直接传递给需要的组件
 */

import { createContext, useContext, useState } from 'react'

// ============================================
// 问题演示：Props 层层传递（Props Drilling）
// ============================================

function BadExample() {
  const [user, setUser] = useState({ name: '张三', role: 'admin' })

  return (
    <div style={{ padding: '20px', border: '2px solid #ff6b6b', marginBottom: '30px' }}>
      <h3>❌ 不好的方式：Props 层层传递</h3>
      <Level1 user={user} />
    </div>
  )
}

// Level1 不需要 user，但必须接收并传递
function Level1({ user }) {
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 1 组件（不需要 user，但必须传递）</p>
      <Level2 user={user} />
    </div>
  )
}

// Level2 也不需要 user，但必须接收并传递
function Level2({ user }) {
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 2 组件（不需要 user，但必须传递）</p>
      <Level3 user={user} />
    </div>
  )
}

// Level3 才真正需要 user
function Level3({ user }) {
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 3 组件（终于用到了！）</p>
      <p>用户名：{user.name}</p>
      <p>角色：{user.role}</p>
    </div>
  )
}

// ============================================
// 解决方案：使用 Context
// ============================================

// 1. 创建 Context
const UserContext = createContext()

function GoodExample() {
  const [user, setUser] = useState({ name: '李四', role: 'user' })

  return (
    <div style={{ padding: '20px', border: '2px solid #51cf66', marginBottom: '30px' }}>
      <h3>✅ 好的方式：使用 Context</h3>
      
      {/* 2. 用 Provider 包裹组件树，提供数据 */}
      <UserContext.Provider value={user}>
        <GoodLevel1 />
      </UserContext.Provider>
    </div>
  )
}

// 中间组件不需要接收和传递 props
function GoodLevel1() {
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 1 组件（干净，不需要传递 props）</p>
      <GoodLevel2 />
    </div>
  )
}

function GoodLevel2() {
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 2 组件（干净，不需要传递 props）</p>
      <GoodLevel3 />
    </div>
  )
}

function GoodLevel3() {
  // 3. 用 useContext 直接获取数据
  const user = useContext(UserContext)
  
  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '10px' }}>
      <p>Level 3 组件（直接获取数据！）</p>
      <p>用户名：{user.name}</p>
      <p>角色：{user.role}</p>
    </div>
  )
}

// ============================================
// 实际应用：主题切换
// ============================================

// 创建主题 Context
const ThemeContext = createContext()

function ThemeExample() {
  const [theme, setTheme] = useState('light')

  // 提供主题和切换函数
  const themeValue = {
    theme,
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #4c6ef5', marginBottom: '30px' }}>
      <h3>🎨 实际应用：主题切换</h3>
      
      <ThemeContext.Provider value={themeValue}>
        <Toolbar />
        <Content />
      </ThemeContext.Provider>
    </div>
  )
}

function Toolbar() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  
  return (
    <div style={{
      padding: '10px',
      background: theme === 'light' ? '#f0f0f0' : '#333',
      color: theme === 'light' ? '#000' : '#fff',
      marginBottom: '10px'
    }}>
      <p>工具栏 - 当前主题：{theme}</p>
      <button onClick={toggleTheme}>
        切换到 {theme === 'light' ? '暗色' : '亮色'} 模式
      </button>
    </div>
  )
}

function Content() {
  const { theme } = useContext(ThemeContext)
  
  return (
    <div style={{
      padding: '20px',
      background: theme === 'light' ? '#fff' : '#222',
      color: theme === 'light' ? '#000' : '#fff'
    }}>
      <h4>内容区域</h4>
      <p>这里的样式会根据主题自动变化</p>
      <NestedComponent />
    </div>
  )
}

function NestedComponent() {
  const { theme } = useContext(ThemeContext)
  
  return (
    <div style={{
      padding: '10px',
      border: `1px solid ${theme === 'light' ? '#ccc' : '#666'}`,
      marginTop: '10px'
    }}>
      <p>嵌套组件也能直接获取主题：{theme}</p>
    </div>
  )
}

// ============================================
// 实际应用：用户认证
// ============================================

const AuthContext = createContext()

function AuthExample() {
  const [user, setUser] = useState(null)

  const login = (username) => {
    setUser({ name: username, isLoggedIn: true })
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #f59f00', marginBottom: '30px' }}>
      <h3>🔐 实际应用：用户认证</h3>
      
      <AuthContext.Provider value={{ user, login, logout }}>
        <Header />
        <MainContent />
      </AuthContext.Provider>
    </div>
  )
}

function Header() {
  const { user, logout } = useContext(AuthContext)
  
  return (
    <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px' }}>
      {user ? (
        <div>
          <span>欢迎，{user.name}！</span>
          <button onClick={logout} style={{ marginLeft: '10px' }}>退出</button>
        </div>
      ) : (
        <span>未登录</span>
      )}
    </div>
  )
}

function MainContent() {
  const { user, login } = useContext(AuthContext)
  
  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <p>请先登录</p>
        <button onClick={() => login('张三')}>登录为张三</button>
        <button onClick={() => login('李四')} style={{ marginLeft: '10px' }}>
          登录为李四
        </button>
      </div>
    )
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h4>主要内容</h4>
      <p>只有登录用户才能看到这里</p>
      <UserProfile />
    </div>
  )
}

function UserProfile() {
  const { user } = useContext(AuthContext)
  
  return (
    <div style={{ padding: '10px', background: '#e7f5ff', marginTop: '10px' }}>
      <h5>用户资料</h5>
      <p>姓名：{user.name}</p>
      <p>状态：{user.isLoggedIn ? '在线' : '离线'}</p>
    </div>
  )
}

// ============================================
// 最佳实践：自定义 Hook
// ============================================

const SettingsContext = createContext()

// 自定义 Hook，封装 Context 的使用
function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings 必须在 SettingsProvider 内部使用')
  }
  return context
}

function BestPracticeExample() {
  const [settings, setSettings] = useState({
    language: 'zh-CN',
    fontSize: 16
  })

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #7950f2' }}>
      <h3>⭐ 最佳实践：自定义 Hook</h3>
      
      <SettingsContext.Provider value={{ settings, updateSettings }}>
        <SettingsPanel />
        <DisplayArea />
      </SettingsContext.Provider>
    </div>
  )
}

function SettingsPanel() {
  // 使用自定义 Hook，更简洁
  const { settings, updateSettings } = useSettings()
  
  return (
    <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px' }}>
      <h4>设置面板</h4>
      <div>
        <label>
          语言：
          <select 
            value={settings.language}
            onChange={(e) => updateSettings('language', e.target.value)}
          >
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>
      <div style={{ marginTop: '10px' }}>
        <label>
          字体大小：
          <input 
            type="range" 
            min="12" 
            max="24" 
            value={settings.fontSize}
            onChange={(e) => updateSettings('fontSize', Number(e.target.value))}
          />
          {settings.fontSize}px
        </label>
      </div>
    </div>
  )
}

function DisplayArea() {
  const { settings } = useSettings()
  
  return (
    <div style={{ 
      padding: '20px',
      fontSize: `${settings.fontSize}px`
    }}>
      <p>当前语言：{settings.language}</p>
      <p>当前字体大小：{settings.fontSize}px</p>
      <p>这段文字的大小会随设置变化</p>
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export default function ContextExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>10 - Context (上下文)</h2>
      
      <div style={{ 
        background: '#fff3bf', 
        padding: '15px', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h4>💡 Context 使用场景：</h4>
        <ul>
          <li>主题切换（亮色/暗色模式）</li>
          <li>用户认证信息</li>
          <li>语言/国际化设置</li>
          <li>全局配置</li>
          <li>任何需要"全局"访问的数据</li>
        </ul>
        
        <h4>📝 使用步骤：</h4>
        <ol>
          <li>createContext() - 创建 Context</li>
          <li>&lt;Context.Provider value=&#123;数据&#125;&gt; - 提供数据</li>
          <li>useContext(Context) - 消费数据</li>
        </ol>
        
        <h4>⚠️ 注意事项：</h4>
        <ul>
          <li>不要滥用 Context，简单的数据传递用 props 就好</li>
          <li>Context 更新会导致所有消费组件重新渲染</li>
          <li>可以用自定义 Hook 封装 Context 的使用</li>
        </ul>
      </div>

      <BadExample />
      <GoodExample />
      <ThemeExample />
      <AuthExample />
      <BestPracticeExample />
    </div>
  )
}
