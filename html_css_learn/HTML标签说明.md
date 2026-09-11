# HTML 标签说明

## div 是什么

`<div>` 是 **division（分区）** 的缩写，是一个**容器元素**，用来包裹和组织其他内容。

### 基本概念

```html
<div>
  这里可以放任何内容
</div>
```

它本身没有特殊的样式或功能，就像一个**空盒子**，你可以往里面放东西。

### 在代码中的使用

```jsx
<div className="example">
  <h2>01 - 基础组件</h2>
  <p>这是一个最简单的 React 组件</p>
  <p>组件名称必须以大写字母开头</p>
  <p>组件返回 JSX（看起来像 HTML 的语法）</p>
</div>
```

这个 `<div>` 就像一个盒子，把标题 `<h2>` 和三个段落 `<p>` 包在一起。

### 为什么需要 div

**1. 组织内容**
```jsx
// ❌ 错误：React 组件只能返回一个根元素
function MyComponent() {
  return (
    <h1>标题</h1>
    <p>段落</p>  // 报错！
  )
}

// ✅ 正确：用 div 包裹
function MyComponent() {
  return (
    <div>
      <h1>标题</h1>
      <p>段落</p>
    </div>
  )
}
```

**2. 应用样式**
```jsx
<div className="example">  {/* 给这个盒子加样式 */}
  <h2>标题</h2>
</div>
```

对应的 CSS：
```css
.example {
  padding: 20px;
  border: 1px solid #ccc;
  background: white;
}
```

**3. 布局**
```jsx
<div className="container">
  <div className="header">头部</div>
  <div className="content">内容</div>
  <div className="footer">底部</div>
</div>
```

### 常见的 HTML 标签

```jsx
<div>通用容器</div>
<p>段落文字</p>
<h1>一级标题</h1>
<h2>二级标题</h2>
<span>行内文本</span>
<button>按钮</button>
<input />输入框
<img />图片
<ul>列表</ul>
<a>链接</a>
```

### div vs 其他标签

```jsx
// div - 块级容器（独占一行）
<div>内容1</div>
<div>内容2</div>
// 显示为：
// 内容1
// 内容2

// span - 行内容器（不换行）
<span>内容1</span>
<span>内容2</span>
// 显示为：
// 内容1内容2
```

### 语义化标签（更好的选择）

现代 HTML 推荐使用更有意义的标签：

```jsx
// 老式写法
<div className="header">头部</div>
<div className="nav">导航</div>
<div className="main">主内容</div>
<div className="footer">底部</div>

// 现代写法（更清晰）
<header>头部</header>
<nav>导航</nav>
<main>主内容</main>
<footer>底部</footer>
```

### 类比理解

想象你在整理房间：

- `<div>` = 收纳盒（可以放任何东西）
- `<p>` = 书（专门放文字段落）
- `<h1>` = 标签纸（写标题）
- `<button>` = 开关（可以点击）
- `<img>` = 相框（放图片）

`<div>` 就是最通用的收纳盒，你可以用它来组织其他东西。

### 实际例子

```jsx
// 一个用户卡片
<div className="user-card">
  <img src="avatar.jpg" />
  <div className="user-info">
    <h3>张三</h3>
    <p>前端工程师</p>
  </div>
  <button>关注</button>
</div>
```

这里用了多个 `<div>` 来组织布局，让内容结构清晰。

## 总结

**`<div>` 就是一个通用的容器盒子，用来包裹和组织页面内容**。
