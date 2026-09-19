/**
 * 11 - useCallback
 *
 * useCallback 解决什么问题？
 *
 * 函数组件每次渲染，函数体都会重新执行一遍，
 * 里面定义的函数也就被重新创建 —— 是一个全新的函数对象。
 *
 * 如果这个函数当 props 传给了用 React.memo 包裹的子组件，
 * 子组件比较 props 时发现「函数不一样了」，就会白白重新渲染一次。
 *
 * useCallback 的作用：把函数缓存起来，依赖不变就返回同一个引用。
 *
 * 一句话记住它：useCallback 不是为了「少创建函数」，
 * 而是为了「让函数引用保持稳定」。
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'

// ============================================
// 演示 1：子组件被"连坐"重新渲染
// ============================================

/*
 * React.memo：把组件包一层，props 没变就跳过渲染
 *
 * 它比较 props 的方式类似 ===（准确说是 Object.is）：
 *   - 数字、字符串：值相等就相等
 *   - 对象、数组、函数：比的是"是不是同一个对象"（相当于 C 里的指针地址）
 *
 * 函数是对象，每次渲染新建的那个，和上一次的永远不是同一个。
 *
 * ⚠️ 开发模式下 src/main.jsx 里包了 <React.StrictMode>，
 *    React 会把组件函数执行两次（故意这么做，帮你提前发现副作用问题），所以：
 *
 *      - 控制台里每个组件连着打印两行日志（挂载时「第 1 次」会打印两遍）
 *      - 界面上显示的次数是 1、3、5…… 而不是 1、2、3
 *        （挂载那一轮的两遍各拿到一个新的 ref，第一遍的结果被丢掉了，
 *          只有第二遍算数，之后每次重渲染都在它上面 +2）
 *      - 想看整齐的 1、2、3，把 main.jsx 里的 StrictMode 去掉就行
 *
 *    这不影响结论 —— 要看的是「加不加 useCallback 时这个数字涨不涨」。
 */
const MemoChild = memo(function MemoChild({ onClick, label }) {
  // 用 ref 记渲染次数：改 ref.current 不会触发额外渲染
  const renderCount = useRef(0)
  renderCount.current++

  console.log(`[${label}] 子组件渲染，第 ${renderCount.current} 次`)

  return (
    <div style={{ marginTop: '10px', padding: '10px', border: '1px dashed #adb5bd' }}>
      <p>我是被 React.memo 包裹的子组件</p>
      <p>我只看 props 变没变，props 没变我就不该渲染</p>
      <p>
        我的渲染次数：<strong>{renderCount.current}</strong>
      </p>
      <button onClick={onClick}>清空父组件的输入框</button>
    </div>
  )
})

function BadParent() {
  const [text, setText] = useState('')
  const [count, setCount] = useState(0)

  // ❌ 没有 useCallback：每次渲染都会新建一个函数
  const handleReset = () => {
    setText('')
  }

  console.log('[❌ 没有 useCallback] 父组件渲染，handleReset 是一个全新的函数')

  return (
    <div style={{ padding: '20px', border: '2px solid #ff6b6b', marginBottom: '30px' }}>
      <h3>❌ 不好的方式：回调函数每次渲染都是新的</h3>
      <p>
        在输入框里打字 → 父组件的 text 变了 → 父组件重新渲染 → 新的 handleReset
        → 子组件发现 props 变了 → 跟着重新渲染
      </p>
      <p>（可子组件跟 text 一点关系都没有，纯属被连坐）</p>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在这里打字，看子组件的渲染次数"
      />
      <button onClick={() => setCount(count + 1)}>
        父组件的无关计数 +1（{count}）
      </button>

      <MemoChild onClick={handleReset} label="❌ 没有 useCallback" />
    </div>
  )
}

function GoodParent() {
  const [text, setText] = useState('')
  const [count, setCount] = useState(0)

  // ✅ useCallback：依赖数组为空 → 不管父组件渲染多少次，都是同一个函数引用
  const handleReset = useCallback(() => {
    setText('')
  }, [])

  console.log('[✅ 有 useCallback] 父组件渲染，handleReset 还是上次那个函数')

  return (
    <div style={{ padding: '20px', border: '2px solid #51cf66', marginBottom: '30px' }}>
      <h3>✅ 好的方式：用 useCallback 稳住函数引用</h3>
      <p>
        一样在输入框里打字 → 父组件照样重新渲染，但 handleReset
        还是同一个引用 → 子组件 props 没变 → 跳过渲染
      </p>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在这里打字，看子组件的渲染次数"
      />
      <button onClick={() => setCount(count + 1)}>
        父组件的无关计数 +1（{count}）
      </button>

      <MemoChild onClick={handleReset} label="✅ 有 useCallback" />
    </div>
  )
}

// ============================================
// 演示 2：依赖数组的坑 —— 闭包捕获的是「那一次的变量」
// ============================================

/*
 * 这和 C/C++ 的直觉不太一样，值得单独讲：
 *
 *   C 里：int count = 0; 回调里读的是 count 这个"变量本身"，
 *         别人改了 count，回调读到的是新值。
 *
 *   React 里：每次渲染的 count 都是一个全新的局部常量（快照），
 *         每个渲染都有自己的 count。
 *         useCallback(fn, []) 相当于把第一次渲染那个 fn 连同
 *         它捕获的 count=0 一起冻住了，之后再也不更新。
 *
 * 结果就是所谓的「闭包陷阱 / stale closure」：函数读到的永远是旧值。
 */
function ClosureDemo() {
  const [count, setCount] = useState(0)

  // ❌ 依赖数组写空，但函数里用到了 count
  const addWrong = useCallback(() => {
    console.log('[❌] addWrong 里看到的 count =', count, '（永远是最初那次渲染的 0）')
    setCount(count + 1) // 等价于 setCount(0 + 1)，永远算成 1
  }, [])

  // ✅ 写法一：用函数式更新，不依赖外面的 count
  const addRight = useCallback(() => {
    setCount((c) => c + 1) // React 会把"最新的值"交给你
  }, [])

  return (
    <div style={{ padding: '20px', border: '2px solid #f59f00', marginBottom: '30px' }}>
      <h3>⚠️ 依赖数组的坑：闭包陷阱（stale closure）</h3>
      <p>当前 count：{count}</p>

      <button onClick={addWrong}>❌ 空依赖 + 读 count（点到 1 就卡住）</button>
      <button onClick={addRight}>✅ 空依赖 + 函数式更新（正常累加）</button>

      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <p>
          点第一个按钮：0 → 1，再点还是 1。因为缓存的函数里，count
          被冻在了 0，永远算 setCount(1)。
        </p>
        <p>
          另一种修法是老实用 <code>[count]</code> 当依赖，函数能读到新值了，
          但 count 一变函数引用又会变 —— 又回到演示 1 的问题。
          所以能写成函数式更新就用函数式更新。
        </p>
      </div>
    </div>
  )
}

// ============================================
// 演示 3：真实场景 —— 订阅事件（useEffect 的依赖）
// ============================================

/*
 * 这是 useCallback 最刚需的场景，没有它代码是「坏」的而不只是「慢」的。
 *
 * 用法和 Electron 里 RTC engine 的事件监听一模一样：
 *
 *   useEffect(() => {
 *     engine.addListener('onUserJoined', onUserJoined)
 *     return () => {
 *       engine.removeListener('onUserJoined', onUserJoined)
 *     }
 *   }, [onUserJoined])
 *
 * 移除监听时，必须传入注册时的那一个函数引用（和 C 里传函数指针一样，
 * 地址对不上就摘不掉）。所以 onUserJoined 必须用 useCallback 包起来。
 */
function createEngine() {
  let listener = null

  return {
    addListener(name, fn) {
      listener = fn
      console.log(`[engine] addListener('${name}') —— 注册成功`)
    },
    removeListener(name, fn) {
      if (listener === fn) {
        listener = null
        console.log(`[engine] removeListener('${name}') —— 移除成功`)
      } else {
        console.log(`[engine] removeListener('${name}') —— 移除失败：不是注册时那个函数`)
      }
    },
    emit(name, ...args) {
      if (listener) listener(...args)
      else console.log(`[engine] emit('${name}') —— 当前没有监听者`)
    },
  }
}

function SubscribeBad() {
  const [user, setUser] = useState('暂无')
  const [tick, setTick] = useState(0)

  // 模拟第三方 SDK：整个组件生命周期里只创建一次
  //
  // useRef 存"不属于界面"的东西：它跨渲染保持同一个对象，改 .current 不会触发渲染。
  // 不能用模块级变量代替 —— 那样两个面板会共用同一个 engine 互相打架。
  const engineRef = useRef(null)
  if (!engineRef.current) engineRef.current = createEngine()
  const engine = engineRef.current
  // ⚠️ StrictMode 下渲染跑两遍，createEngine() 实际被调用了两次，
  //    第一次建出来的实例是被丢掉的。真有副作用的初始化（比如初始化原生 SDK）
  //    放到 useEffect 里做更稳妥。

  // ❌ 没有 useCallback：每次渲染都是新函数
  const onUserJoined = (name) => {
    console.log('[❌] 收到事件：用户加入', name)
    setUser(name)
  }

  useEffect(() => {
    engine.addListener('onUserJoined', onUserJoined)

    return () => {
      engine.removeListener('onUserJoined', onUserJoined)
    }
  }, [onUserJoined]) // 依赖每次渲染都变 → 每次渲染都「先清理、再注册」

  return (
    <div style={{ padding: '20px', border: '2px solid #ff6b6b', marginBottom: '30px' }}>
      <h3>❌ 没有 useCallback：每次渲染都在重复注册</h3>
      <p>当前用户：{user}</p>
      <button onClick={() => engine.emit('onUserJoined', '张三')}>模拟收到事件</button>
      <button onClick={() => setTick(tick + 1)}>触发一次无关的重渲染（{tick}）</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        看控制台：每次渲染都会先 removeListener 再 addListener，哪怕这次渲染和事件毫无关系。
        真实项目里这会变成订阅泄漏、重复回调、内存增长。
      </p>
    </div>
  )
}

function SubscribeGood() {
  const [user, setUser] = useState('暂无')
  const [tick, setTick] = useState(0)

  const engineRef = useRef(null)
  if (!engineRef.current) engineRef.current = createEngine()
  const engine = engineRef.current

  // ✅ 空依赖 + 函数式更新 → 整个组件生命周期内都是同一个引用
  const onUserJoined = useCallback((name) => {
    console.log('[✅] 收到事件：用户加入', name)
    setUser(name)
  }, [])

  useEffect(() => {
    engine.addListener('onUserJoined', onUserJoined)

    // 传进去的是同一个引用，才摘得掉
    return () => {
      engine.removeListener('onUserJoined', onUserJoined)
    }
  }, [onUserJoined, engine]) // 两个依赖都不会变 → 只在挂载/卸载时跑

  return (
    <div style={{ padding: '20px', border: '2px solid #51cf66', marginBottom: '30px' }}>
      <h3>✅ 有 useCallback：注册一次，用到卸载</h3>
      <p>当前用户：{user}</p>
      <button onClick={() => engine.emit('onUserJoined', '李四')}>模拟收到事件</button>
      <button onClick={() => setTick(tick + 1)}>触发一次无关的重渲染（{tick}）</button>
      <p style={{ fontSize: '14px', color: '#666' }}>
        看控制台：addListener 只在挂载时出现，之后怎么重渲染都不会再注册
        （StrictMode 下会多一轮「注册 → 移除 → 再注册」，那是它故意做的压力测试）。
      </p>
    </div>
  )
}

// ============================================
// 主组件
// ============================================

export default function Example11_useCallback() {
  return (
    <div className="example">
      <h2>11 - useCallback</h2>
      <p>缓存函数引用，避免子组件被无谓地重新渲染</p>

      <div
        style={{
          marginTop: '15px',
          padding: '15px',
          background: '#fff3bf',
          borderRadius: '5px',
          marginBottom: '20px',
        }}
      >
        <h4>💡 什么时候才需要 useCallback：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>函数要作为 props 传给 <code>React.memo</code> 包裹的子组件</li>
          <li>函数是某个 <code>useEffect</code> 的依赖（比如注册/清理事件监听）</li>
          <li>函数要传给别的 Hook 当依赖（自定义 Hook、Context 的 value 等）</li>
        </ul>

        <h4>⚠️ 注意事项：</h4>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>
            <strong>它不会阻止组件自己渲染</strong> —— 只缓存函数，不缓存 UI。
            真正跳过渲染的是 <code>React.memo</code>，useCallback 只是配合它
          </li>
          <li>
            <strong>没人接的 useCallback 没有意义</strong>：子组件没包 memo，
            或者函数只在组件内部用，包了也是白包
          </li>
          <li>
            <strong>依赖数组必须诚实</strong>：漏写依赖 → 闭包里读到旧值（演示 2）；
            依赖写多了 → 引用老在变，缓存形同虚设
          </li>
          <li>
            <strong>缓存本身也有成本</strong>（存旧函数 + 比对依赖），
            React 官方建议先测量再优化，别见函数就套
          </li>
          <li>
            依赖里出现对象/数组/内联箭头函数时，每次都算「变了」，
            这种情况通常要配合 <code>useMemo</code> 一起用
            （它缓存的是「值」，和 useCallback 是一对）
          </li>
        </ul>

        <h4>🔧 动手改一改：</h4>
        <ol style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>把 GoodParent 里的 useCallback 删掉，看子组件渲染次数是不是开始涨</li>
          <li>给 BadParent 的 MemoChild 去掉 memo，再打字 —— 这时 useCallback 也救不了它</li>
          <li>把 addWrong 的依赖改成 [count]，看它是否能正常累加（注意它变成了每次都新建）</li>
          <li>把 main.jsx 里的 StrictMode 去掉，渲染次数就变成 1、2、3 了</li>
        </ol>
      </div>

      <BadParent />
      <GoodParent />
      <ClosureDemo />
      <SubscribeBad />
      <SubscribeGood />
    </div>
  )
}
