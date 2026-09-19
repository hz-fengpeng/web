/**
 * 12 - useRef
 *
 * useRef(初始值) 返回一个 { current: 初始值 } 的盒子：
 *
 *   1. 这个盒子跨渲染永远是同一个对象
 *   2. 改 .current 不会触发重新渲染
 *
 * 对比一下就懂了：
 *
 *   useState —— "会广播的变量"：改了值，React 重新渲染，界面跟着变
 *   useRef   —— "私下记事的便签"：改了值，没人收到通知，界面不动
 *
 * 它有三个经典用途：
 *
 *   1. 拿到真实的 DOM 元素（命令式"逃生舱"）
 *   2. 存不该触发渲染的值（定时器 id、上一次的值、渲染计数器）
 *   3. 惰性初始化（只建一次的东西，比如第三方 SDK 的实例）
 */

import { useEffect, useRef, useState } from 'react'

// ============================================
// 用途 1：拿到真实的 DOM 元素
// ============================================

/*
 * C/C++ 类比：平时 React 帮你把界面"声明"出来，你不碰 DOM；
 * ref 相当于塞给你一个句柄（HWND、文件描述符），
 * 让你跳过 React 直接调 DOM 自己的方法。
 *
 * 三条规则：
 *   - ref 只能挂在 DOM 标签上：<input ref={inputRef} />
 *   - 首次渲染时 ref.current 还是 null —— React 要等提交到页面之后才填进去，
 *     所以只能在事件回调和 useEffect 里用，不能在渲染期间用
 *   - 读随便用（focus、select、量尺寸、播放媒体），
 *     改文本和结构要小心 —— 见下面那段「为什么手改 DOM 会和 React 失联」
 */

/*
 * ── 为什么手改 DOM 会和 React 失联 ──
 *
 * 下面这个盒子：
 *
 *   <div ref={boxRef}>盒子里显示的是 state：{count}</div>
 *
 * 在 JSX 里是两个子节点（一段静态字符串 + 一个表达式），
 * React 给它们各建了一个独立的文本节点：
 *
 *   ["#text:盒子里显示的是 state：", "#text:0"]
 *
 * 于是有两种改法，DOM 层面完全不同：
 *
 *   ① box.firstChild.nodeValue = 'X'   只改值，节点还是原来那个
 *   ② box.textContent = 'X'            先把所有子节点从树上摘掉
 *                                      （parentNode 变成 null），再塞一个新节点
 *
 * 而 React 是"记账式"更新：它脑子里有一棵自己的树（fiber 树），
 * 每个 fiber 上挂着对应的 DOM 节点引用；更新时它只做自己算出来的 diff，
 * 落到 DOM 上就是往"它记着的那个节点"写一句 nodeValue，
 * 从不回头检查这个节点还在不在树上。
 *
 * 把节点抓在手里实测（手改前先存下旧节点的引用），做 ② 的结果是：
 *
 *   手改后：         页面上 = "【我把子节点全换了】"   旧节点[1].nodeValue = "0"  parentNode = null
 *   count 0→1 之后： 页面上 = "【我把子节点全换了】"   旧节点[1].nodeValue = "1"  parentNode = null
 *   count 1→2 之后： 页面上 = "【我把子节点全换了】"   旧节点[1].nodeValue = "2"  parentNode = null
 *
 * nodeValue 一路在变 —— React 确实写了，只是写进了一个已经不在页面上的对象。
 *
 * C/C++ 视角：这就是悬垂指针。
 *   React 的 fiber 树 ≈ 一份"影子数据结构"，里面存的是指向真实 DOM 节点的指针；
 *   textContent = ... 相当于把节点从链表里 unlink 掉，而 React 手里那份指针还在
 *   → 对象没被回收（React 的引用让它活着）、写入不报错，
 *     也没有任何机制会告诉你"你写进了一个已经脱链的节点"。
 *
 * 两种改法的结局不一样：
 *   ① 改值：节点还是 React 认识的那个，等它下次要更新这段文本时就把你盖回去
 *          （实测：把数字那个节点改成 999，再点一次 +1 → 页面显示 1）
 *   ② 换节点：React 再也够不着它，那一块界面从此静止，
 *          直到这块 DOM 被整个重建（换 key、条件渲染先卸载再挂载、或者刷新页面）
 *
 * 下面这个演示做的是第 ② 种（textContent = ...）。
 *
 * 所以结论是：根因不是 textContent/innerHTML/appendChild 这些 API 不好，
 * 而是 React 不读 DOM，它只按自己的账本写。
 */
function DomRefDemo() {
  const inputRef = useRef(null)
  const boxRef = useRef(null)
  const [msg, setMsg] = useState('还没操作过')
  const [count, setCount] = useState(0)

  const handleFocus = () => {
    // 这个就是真实的 DOM 节点，可以直接 console.log 出来看
    console.log('inputRef.current 是什么：', inputRef.current)
    inputRef.current.focus() // 调 DOM 自己的方法
    inputRef.current.select() // 全选里面的文字
    setMsg('已聚焦并全选 —— 用的是 DOM 原生的 focus() / select()')
  }

  const handlePaint = () => {
    // 绕过 React 直接改：这一句会把盒子里原来的两个文本节点一起换掉
    boxRef.current.textContent = '这段文字是手动塞进去的'
    boxRef.current.style.background = '#ffe3e3'
    setMsg('已经手改了盒子里的文字和背景（React 完全不知道）')
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #4c6ef5', marginBottom: '30px' }}>
      <h3>用途 1：拿到真实的 DOM 元素</h3>

      <div>
        <input ref={inputRef} defaultValue="点右边的按钮试试" />
        <button onClick={handleFocus}>聚焦并全选</button>
        <button onClick={handlePaint}>直接改下面的 DOM</button>
      </div>

      <div
        ref={boxRef}
        style={{ marginTop: '10px', padding: '10px', background: '#f1f3f5' }}
      >
        盒子里显示的是 state：{count}
      </div>

      <button onClick={() => setCount(count + 1)}>
        让 React 更新这个盒子（count 会变成 {count + 1}）
      </button>

      <p style={{ marginTop: '10px' }}>{msg}</p>

      <p style={{ fontSize: '14px', color: '#666' }}>
        先点「直接改下面的 DOM」，再点「让 React 更新这个盒子」：
        按钮上的数字会变（说明 state 确实在变），但盒子里的文字<strong>不会</strong>
        变回 state 的值。因为 boxRef.current.textContent = ... 把盒子里原来的两个文本节点
        一起换掉了，React 手里还攥着那两个已经不在页面上的旧节点，
        新值全写进了那里 —— 不报错，界面却再也不更新了。
        （手改的背景色倒是会留下，因为 React 只在 style 里某个属性变化时才去动它。）
        在这个演示里，除了刷新页面没有别的办法让它恢复 —— 这就是"绕过 React
        操作 DOM"要付的代价，所以它只能当逃生舱，不能当常规手段。
      </p>
    </div>
  )
}

// ============================================
// 用途 2：存不该触发渲染的值
// ============================================

// ---- 2a. 同样是"记一个数"，ref 和 state 的区别 ----
function SilentValueDemo() {
  const [n, setN] = useState(0)
  const silentRef = useRef(0)

  const handleSilent = () => {
    silentRef.current++
    console.log(`silentRef.current 变成 ${silentRef.current} 了，但界面不会更新`)
  }

  return (
    <div style={{ marginTop: '15px' }}>
      <h4>2a. ref 改了界面不动，state 改了界面才动</h4>
      <p>
        silentRef.current = <strong>{silentRef.current}</strong>（点下面第一个按钮，
        界面上的数字不会变） | n = {n}
      </p>
      <button onClick={handleSilent}>只改 ref.current</button>
      <button onClick={() => setN(n + 1)}>改 state（触发渲染）</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        先点几次「只改 ref.current」（界面没反应），再点「改 state」——
        你会发现 ref 那个数字一下子跳到了最新的值。
        因为 ref 的值一直都改成功了，只是没人通知界面刷新而已。
      </p>
    </div>
  )
}

// ---- 2b. 定时器的 id：不需要显示在界面上，但要能被按钮拿到 ----
function TimerDemo() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null) // setInterval 的返回值，不需要显示出来

  const start = () => {
    if (timerRef.current) return // 已经在跑了，别开第二个
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
    setRunning(true)
    console.log('启动定时器，id =', timerRef.current)
  }

  const stop = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setRunning(false)
    console.log('停止定时器')
  }

  // 组件卸载时兜底清理（忘了这一步，定时器会一直跑下去）
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <div style={{ marginTop: '15px' }}>
      <h4>2b. 定时器的 id</h4>
      <p>
        已经跑了 <strong>{seconds}</strong> 秒（{running ? '计时中' : '已停止'}）
      </p>
      <button onClick={start}>开始</button>
      <button onClick={stop}>停止</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        为什么用 useRef 而不是普通变量？因为「停止」按钮要能拿到这个 id，
        而普通变量每次渲染都会被重新声明。用它也不需要界面跟着刷新。
      </p>
    </div>
  )
}

// ---- 2c. 上一次的值：封装成自定义 Hook ----
function usePrevious(value) {
  const prevRef = useRef(null)

  // 在 effect 里写 ref：渲染期间只读、提交之后才写，这样是"纯"的
  useEffect(() => {
    prevRef.current = value
  }, [value])

  return prevRef.current
}

function PreviousValueDemo() {
  const [count, setCount] = useState(0)
  const prev = usePrevious(count)

  return (
    <div style={{ marginTop: '15px' }}>
      <h4>2c. 上一次的值（自定义 Hook）</h4>
      <p>
        上一次：<strong>{prev === null ? '（还没有）' : prev}</strong> → 当前：
        <strong>{count}</strong>
      </p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        「上一次的值」本身不需要触发渲染，所以放 ref 里；
        如果放 state，每次记录都会多渲染一轮。
      </p>
    </div>
  )
}

// ============================================
// 用途 3：惰性初始化（只建一次的东西）
// ============================================

let engineCreated = 0

function createEngine(name) {
  engineCreated++
  return { id: `engine#${engineCreated}`, owner: name }
}

/*
 * 和示例 11 里那个 engine 是同一个套路：
 *
 *   const ref = useRef(null)
 *   if (!ref.current) ref.current = createEngine()
 *
 * 为什么不用模块级变量？模块级变量 ≈ C 里的 static 全局变量，
 * 整个模块只有一份 —— 下面两个面板就会共用同一个 engine 互相打架。
 * useRef 是"每个组件实例一份"，这才是"实例字段"的语义。
 *
 * ⚠️ StrictMode 下渲染函数会执行两遍，所以这段会建两次，
 *    第一遍建出来的实例会被丢掉（控制台里能看到两组创建日志）。
 *    真有副作用的初始化（比如初始化原生 SDK）放到 useEffect 里做更稳妥。
 */
function EnginePanel({ name, color }) {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = createEngine(name)
    console.log(`[${name}] 创建了一个新的 engine：${engineRef.current.id}`)
  }
  const engine = engineRef.current

  const [mode, setMode] = useState('空闲')

  return (
    <div style={{ padding: '15px', border: `2px solid ${color}`, marginTop: '10px' }}>
      <p>
        <strong>{name}</strong> 面板
      </p>
      <p>我的 engine：{engine.id}（主人：{engine.owner}）</p>
      <p>当前模式：{mode}</p>
      <button onClick={() => setMode(mode === '空闲' ? '通话中' : '空闲')}>
        切换模式（触发重渲染）
      </button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        点几次「切换模式」，engine 始终是同一个 —— 因为它存在 ref 里，
        跨渲染保持同一个对象，而且改它也不会引发额外渲染。
      </p>
    </div>
  )
}

function LazyInitDemo() {
  return (
    <div style={{ padding: '20px', border: '2px solid #7950f2', marginBottom: '30px' }}>
      <h3>用途 3：惰性初始化（只建一次的东西）</h3>
      <p>两个面板各自持有一个 engine，互不干扰：</p>
      <EnginePanel name="面板 A" color="#f59f00" />
      <EnginePanel name="面板 B" color="#37b24d" />
    </div>
  )
}

// ============================================
// 反例：这些事别用 useRef
// ============================================

function BadUsageDemo() {
  // 注意这里连一个 useState 都没有 —— 所以这个组件永远不会重新渲染
  const countRef = useRef(0)

  const handleAdd = () => {
    // ❌ 想靠 ref 更新界面
    countRef.current++
    console.log(`countRef.current 已经加到 ${countRef.current}，但界面不会变`)
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #ff6b6b', marginBottom: '30px' }}>
      <h3>❌ 反例：该用 state 的地方用了 ref</h3>
      <p>
        界面上要显示的数字：<strong>{countRef.current}</strong>
      </p>
      <button onClick={handleAdd}>+1（改的是 ref，数字看控制台）</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        点多少次，界面上都是 0：ref 的值确实在涨（控制台里看得到），
        但没人通知 React 重新渲染，界面自然不知道。
        判断标准很简单 —— <strong>要显示在界面上的，用 useState</strong>。
      </p>
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export default function Example12_useRef() {
  return (
    <div className="example">
      <h2>12 - useRef</h2>
      <p>一个跨渲染不变的盒子，改了它不会触发重新渲染</p>

      <div
        style={{
          marginTop: '15px',
          padding: '15px',
          background: '#e7f5ff',
          borderRadius: '5px',
          marginBottom: '20px',
        }}
      >
        <h4>📦 useRef vs useState：</h4>
        <table style={{ fontSize: '14px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 10px' }}></th>
              <th style={{ textAlign: 'left', padding: '4px 10px' }}>useState</th>
              <th style={{ textAlign: 'left', padding: '4px 10px' }}>useRef</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 10px' }}>改了会重新渲染吗</td>
              <td style={{ padding: '4px 10px' }}>会</td>
              <td style={{ padding: '4px 10px' }}>不会</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 10px' }}>改完什么时候能读到新值</td>
              <td style={{ padding: '4px 10px' }}>下次渲染</td>
              <td style={{ padding: '4px 10px' }}>立刻（同一个对象）</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 10px' }}>适合放什么</td>
              <td style={{ padding: '4px 10px' }}>要显示在界面上的</td>
              <td style={{ padding: '4px 10px' }}>只在背后记着的</td>
            </tr>
          </tbody>
        </table>

        <h4>⚠️ 注意事项：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>
            <strong>改 .current 不会重新渲染</strong> —— 想让界面变，得配一个
            useState 来触发
          </li>
          <li>
            <strong>别在渲染期间读写 ref.current</strong>（惰性初始化那种幂等写法除外）。
            渲染函数要保持"纯"，StrictMode 会跑两遍，并发渲染下这次渲染还可能被整个丢弃
          </li>
          <li>
            <strong>首次渲染时 ref.current 是 null</strong> —— React 提交到页面之后才填进去
          </li>
          <li>
            <strong>DOM ref 在卸载时会被置回 null</strong> ——
            别在延迟执行的回调里想当然地用它
          </li>
          <li>
            <strong>拿到的节点别乱改</strong>：focus、select、量尺寸、播放媒体随便用，
            但 textContent / innerHTML / appendChild 这类改动 React 并不知情，
            会让那块界面和 state 永久失联（用途 1 里演示了这个坑）
          </li>
          <li>
            和 C 的 <code>static</code> 全局变量不一样：ref 是<strong>每个组件实例一份</strong>
          </li>
        </ul>

        <h4>🔧 动手改一改：</h4>
        <ol style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>把 2a 里的 silentRef 换成 useState，看界面的反应有什么不同</li>
          <li>
            把 EnginePanel 里的 engineRef 换成模块级变量，再给两个面板各点几次按钮，
            看它们是不是开始共用同一个 engine
          </li>
          <li>在渲染函数里 console.log(inputRef.current)，看首次渲染打印的是什么</li>
          <li>把 main.jsx 里的 StrictMode 去掉，再数一数 engine 被创建了几次</li>
        </ol>
      </div>

      <DomRefDemo />

      <div style={{ padding: '20px', border: '2px solid #f59f00', marginBottom: '30px' }}>
        <h3>用途 2：存不该触发渲染的值</h3>
        <SilentValueDemo />
        <TimerDemo />
        <PreviousValueDemo />
      </div>

      <LazyInitDemo />
      <BadUsageDemo />
    </div>
  )
}
