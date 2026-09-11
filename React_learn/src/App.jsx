import Example01_BasicComponent from './examples/01-BasicComponent'
import Example02_JSXSyntax from './examples/02-JSXSyntax'
import Example03_Props from './examples/03-Props'
import Example04_State from './examples/04-State'
import Example05_Events from './examples/05-Events'
import Example06_useEffect from './examples/06-useEffect'
import Example07_ConditionalRendering from './examples/07-ConditionalRendering'
import Example08_Lists from './examples/08-Lists'
import Example09_Forms from './examples/09-Forms'
import Example10_Context from './examples/10-Context'

function App() {
  return (
    <div className="container">
      <h1>React 学习示例</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        从基础到进阶，逐步学习 React 核心概念
      </p>
      
      <Example01_BasicComponent />
      <Example02_JSXSyntax />
      <Example03_Props />
      <Example04_State />
      <Example05_Events />
      <Example06_useEffect />
      <Example07_ConditionalRendering />
      <Example08_Lists />
      <Example09_Forms />
      <Example10_Context />
    </div>
  )
}

export default App
