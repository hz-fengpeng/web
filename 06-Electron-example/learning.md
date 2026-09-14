# 06-Electron-example 学习笔记

## 1. 工程定位

这是一个 Agora Electron RTC SDK 的 API 示例工程。它使用 Electron 提供桌面应用运行环境，使用 React 和 Ant Design 构建界面，并通过 `agora-electron-sdk` 调用原生音视频能力。

这个工程的重点不是某个完整产品，而是展示不同 RTC API 的初始化方式、调用顺序、事件处理和资源释放方式。每个示例都可以相对独立地阅读和运行。

主要技术栈：

- Electron 22
- React 18
- TypeScript
- Ant Design 4
- React Router 5
- electron-webpack 2
- Agora Electron SDK 4.5.2

## 2. 如何运行

README 要求使用 Node.js 14 和 Yarn。工程工具链比较旧，如果使用过新的 Node.js 遇到安装或编译错误，应先切换到 README 指定的 Node.js 版本。

```bash
cd /Users/fengpeng/Desktop/web/06-Electron-example
yarn
yarn start
```

常用命令：

```bash
# 启动开发环境
yarn start

# 编译主进程和渲染进程
yarn compile

# 打包当前平台应用
yarn dist

# 打包 macOS 应用
yarn dist:mac

# 打包 Windows 应用
yarn dist:win
```

应用启动后，先在 Setting 页面填写：

- App ID：Agora 项目的 App ID，必填。
- Channel ID：测试频道名。同一频道中的用户才能互相看到和听到。
- Token：项目启用 App Certificate 时必填，而且生成 Token 时使用的频道名和 UID 必须与页面输入一致。
- UID：本地用户 ID。数值 `0` 表示让 SDK 自动分配。
- Native SDK Log Path：原生 SDK 日志输出路径，可选。

当前实现只把 App ID 持久化到 `localStorage`，其他字段主要保存在本次应用运行期间的内存中。

## 3. Electron 基础入门

Electron 是一个使用 Web 技术开发桌面应用的框架。开发者可以使用 HTML、CSS、JavaScript、TypeScript 和 React 编写界面，再将应用打包成 macOS、Windows 或 Linux 程序。

可以先把 Electron 理解成 Chromium 和 Node.js 的组合：

```text
Electron
├── Chromium：负责显示 HTML、CSS 和 React 页面
└── Node.js：负责文件、网络、系统 API 和原生模块能力
```

普通网页受到浏览器安全限制，不能随意读取本地文件或调用操作系统 API。Electron 提供了桌面应用运行环境，让 Web 页面可以通过受控的方式使用系统能力。

### 3.1 主进程与渲染进程

Electron 最重要的概念是主进程和渲染进程：

```text
操作系统
  |
  v
主进程 Main Process
  |
  +-- 创建窗口
  +-- 管理应用生命周期
  +-- 调用系统 API
  |
  v
BrowserWindow
  |
  v
渲染进程 Renderer Process
  |
  +-- HTML / CSS
  +-- React
  +-- 用户交互
```

`BrowserWindow` 由主进程创建和管理，但 `BrowserWindow` 本身不负责解析和绘制网页。当主进程调用 `loadURL()` 或 `loadFile()` 时，Electron 会让窗口内部的 `webContents` 加载页面，页面内容由 Chromium 的渲染进程负责执行和渲染：

```text
主进程
  |
  | new BrowserWindow(...)
  v
BrowserWindow（主进程中的窗口管理对象）
  |
  | loadURL() / loadFile()
  v
webContents
  |
  v
渲染进程
  |
  +-- 解析 HTML
  +-- 执行 JavaScript
  +-- 运行 React
  +-- 计算 CSS 布局
  +-- 绘制页面
```

当前工程中的对应代码是：

```js
// 在主进程中创建 BrowserWindow
const window = new BrowserWindow({
  width: 1024,
  height: 728,
});

// 加载页面后，页面代码在渲染进程中运行
window.loadURL(
  `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
);
```

学习阶段可以近似理解为：

```text
一个 BrowserWindow
≈ 一个 webContents
≈ 一个网页
≈ 一个渲染进程
```

这不是 Chromium 内部严格的一一对应关系，因为 Chromium 可能复用或切换进程，跨站 iframe 也可能使用额外的渲染进程。但对当前工程而言，可以理解为：主进程创建一个 `BrowserWindow`，Electron 再启动渲染进程来渲染这个窗口加载的 React 页面。

每个 Electron 应用只有一个主进程。主进程由 Node.js 执行，通常负责：

- 启动和退出应用。
- 创建和关闭桌面窗口。
- 管理菜单、托盘和通知。
- 访问文件系统和系统权限。
- 管理渲染进程。
- 调用需要在主进程运行的原生模块。

本工程的主进程入口是 `src/main/index.js`：

```js
app.on('ready', () => {
  mainWindow = createMainWindow();
});
```

`app` 表示整个桌面应用。Electron 准备完成后，代码调用 `createMainWindow()` 创建窗口。

渲染进程由 Chromium 执行，主要负责显示页面和处理用户交互。本工程的渲染进程入口是 `src/renderer/index.tsx`：

```tsx
const root = ReactDOM.createRoot(
  document.getElementById('app') as HTMLElement
);

root.render(<App />);
```

Electron 和 React 的职责并不相同：

- Electron 提供桌面运行环境和系统能力。
- React 构建桌面窗口内部的用户界面。

### 3.2 BrowserWindow

`BrowserWindow` 表示一个真正的桌面窗口：

```js
const window = new BrowserWindow({
  width: 1024,
  height: 728,
});
```

它类似浏览器中的一个标签页，但外面带有操作系统窗口。创建窗口之后还需要加载页面：

```js
window.loadURL('http://localhost:...');
```

开发阶段加载 Webpack 开发服务器提供的页面，打包后则加载本地生成的 `index.html`。

### 3.3 IPC 进程间通信

主进程和渲染进程属于不同进程，不能直接访问对方的变量。Electron 使用 IPC，也就是进程间通信，让两个进程交换消息。

本工程请求 macOS 摄像头权限时使用了 IPC：

```text
React 渲染进程
  -> ipcRenderer.invoke(...)
  -> Electron 主进程
  -> ipcMain.handle(...)
  -> macOS 权限 API
  -> 将结果返回渲染进程
```

渲染进程发送请求：

```ts
ipcRenderer.invoke('IPC_REQUEST_PERMISSION_HANDLER', {
  type: 'camera',
});
```

主进程处理请求：

```js
ipcMain.handle('IPC_REQUEST_PERMISSION_HANDLER', async (event, arg) => {
  return await systemPreferences.askForMediaAccess(arg.type);
});
```

可以把 `invoke` 和 `handle` 理解为一次跨进程的异步函数调用。

### 3.4 Preload 脚本

现代 Electron 应用通常还会使用 preload 脚本：

```text
主进程
  -> preload
  -> 渲染进程
```

preload 在页面加载前执行，可以通过 `contextBridge` 向 React 暴露少量经过控制的系统接口：

```js
contextBridge.exposeInMainWorld('desktopAPI', {
  requestCamera: () => ipcRenderer.invoke('request-camera'),
});
```

React 页面只需要调用受控接口：

```ts
window.desktopAPI.requestCamera();
```

这样可以避免网页直接访问全部 Node.js API。

本示例为了方便演示原生 SDK，没有采用这种现代隔离方式，而是设置了：

```js
nodeIntegration: true,
contextIsolation: false,
webSecurity: false,
```

因此 React 代码可以直接引入 Electron 和 Agora 原生模块。这种配置适合学习示例，但不建议直接复制到生产项目。

### 3.5 Electron 应用如何启动

运行 `yarn start` 后，大致发生以下过程：

```text
1. electron-webpack 编译代码
2. Electron 启动主进程
3. 主进程执行 src/main/index.js
4. Electron 触发 app ready
5. 主进程创建 BrowserWindow
6. BrowserWindow 加载 React 页面
7. 渲染进程执行 src/renderer/index.tsx
8. React 渲染 App
9. 用户打开某个 RTC 示例
10. 示例页面调用 Agora 原生 SDK
```

开发阶段的 Webpack 服务只负责提供页面和热更新，它不是 Electron 应用的业务服务端。

### 3.6 Electron 应用如何打包

开发完成后，Webpack 先编译代码，electron-builder 再把运行环境、业务代码和资源组合成安装包：

```text
Electron Runtime
+ 编译后的主进程代码
+ 编译后的 React 页面
+ Node.js 依赖
+ Agora 原生动态库
+ 图片和音频资源
+ 应用图标及权限配置
```

在这个工程里，`agora-electron-sdk` 需要通过 `asarUnpack` 解包，因为原生动态库不能像普通 JavaScript 一样直接在 ASAR 包内执行。

学习 Electron 时可以先记住一句话：主进程管理桌面应用和系统能力，渲染进程运行 React 页面，两者通过 IPC 通信。

## 4. 总体架构

```text
package.json
  |
  | yarn start
  v
electron-webpack
  |
  +-- 主进程 src/main/index.js
  |     |
  |     +-- 创建 BrowserWindow
  |     +-- 启动 Agora SDK 主进程 IPC
  |     +-- 处理 macOS 媒体权限请求
  |
  +-- 渲染进程 src/renderer/index.tsx
        |
        +-- App.tsx：菜单和路由
        +-- Setting：RTC 参数配置
        +-- Basic/Advanced/Hooks：示例页面
              |
              +-- 创建并初始化 RTC Engine
              +-- 调用 joinChannel
              +-- 接收 SDK 事件
              +-- 更新 React 状态
              +-- RtcSurfaceView 绑定视频 DOM
```

Electron 包含两个重要的运行环境：

- 主进程：管理应用生命周期、原生窗口和系统能力。
- 渲染进程：运行 React 页面，处理界面和大部分 RTC 示例逻辑。

## 5. 启动链路

### 5.1 npm scripts

入口配置位于 `package.json`：

```json
{
  "scripts": {
    "postinstall": "npm run rebuild",
    "start": "electron-webpack dev",
    "compile": "electron-webpack",
    "rebuild": "electron-rebuild -f -o ref-napi",
    "dist": "npm run compile && electron-builder"
  }
}
```

`postinstall` 会重新编译 `ref-napi`。这是因为 Electron 使用的 Node ABI 可能与系统 Node.js 不同，带有原生二进制的 Node 模块需要针对 Electron 重建。

### 5.2 electron-webpack 配置

`electron-webpack.json` 指定了两套源码目录：

```text
src/main      -> Electron 主进程
src/renderer  -> React 渲染进程
```

`webpack.renderer.additions.js` 负责补充渲染进程的 Webpack 配置：

- 支持全局 SCSS 和 CSS Modules。
- 开发环境启用 React Refresh。
- 启用 `historyApiFallback`，让 React Router 路由可以刷新。
- 将 `agora-electron-sdk`、`koffi` 和 `ref-napi` 设置为 external，避免把原生模块打进普通 Webpack bundle。

## 6. Electron 主进程

主进程入口是 `src/main/index.js`。

### 6.1 加载 Agora IPC

```js
import 'agora-electron-sdk/js/Private/ipc/main.js';
```

这行代码初始化 Agora SDK 在 Electron 主进程一侧的 IPC 支持。虽然业务代码主要在渲染进程调用 SDK，但底层原生能力仍需要主进程侧的配合。

### 6.2 创建窗口

```js
const window = new BrowserWindow({
  width: 1024,
  height: 728,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    webSecurity: false,
  },
});
```

渲染进程需要直接引入 Electron 和 Agora 原生模块，因此示例打开了 `nodeIntegration`，并关闭了 `contextIsolation`。这样写便于演示，但不适合作为生产应用的默认安全配置。正式产品通常使用 preload 脚本和受控的 IPC 接口暴露原生能力。

### 6.3 加载页面

开发环境加载 electron-webpack 的开发服务器：

```js
window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
```

生产环境加载编译生成的本地 `index.html`。

### 6.4 请求 macOS 权限

渲染进程通过 `ipcRenderer.invoke` 请求麦克风或摄像头权限，主进程通过下面的 handler 调用 macOS 系统 API：

```text
renderer/utils/permissions.ts
  -> IPC_REQUEST_PERMISSION_HANDLER
  -> main/index.js
  -> systemPreferences.askForMediaAccess
```

这个 IPC 是工程中主进程和渲染进程之间最直观的一次业务通信。

## 7. React 页面组织

### 7.1 React 入口

`src/renderer/index.tsx` 创建 React Root 并渲染 `App`：

```tsx
const root = ReactDOM.createRoot(
  document.getElementById('app') as HTMLElement
);

root.render(<App />);
```

### 7.2 菜单和路由

`src/renderer/App.tsx` 引入三组示例：

```tsx
const DATA = [Basic, Advanced, Hooks];
```

每组示例的 `index.ts` 都提供相同结构的数据：

```ts
{
  title: 'Basic',
  data: [
    {
      name: 'JoinChannelVideo',
      component: JoinChannelVideo,
    },
  ],
}
```

`App.tsx` 遍历这些数据，同时生成：

- 左侧菜单项。
- URL 路由。
- 路由对应的 React 页面组件。

新增示例时，除了创建组件，还需要将组件注册到对应目录的 `index.ts` 中。

### 7.3 三组示例的区别

#### Basic

用于学习最基础的 RTC 操作：

- `JoinChannelAudio`：音频入会。
- `JoinChannelVideo`：音视频入会和本地预览。
- `StringUid`：使用字符串用户 ID 入会。
- `VideoDecoder`：视频解码相关用法。

#### Advanced

用于学习单项高级能力，例如：

- 屏幕共享。
- 多频道。
- 媒体播放器。
- 音效与混音。
- 虚拟背景和美颜。
- 空间音频。
- CDN 推流。
- 视频裸数据处理。

#### Hooks

Hooks 示例与部分 Basic/Advanced 示例功能相似，但使用函数组件、`useState`、`useEffect`、`useRef` 和自定义 Hook 组织代码。

建议先理解 Basic 中的 class 写法，再用 Hooks 版本进行对照学习。

## 8. BaseComponent 的作用

`src/renderer/components/BaseComponent.tsx` 是 class 风格示例的公共基类。

它统一处理四类逻辑：

1. RTC Engine 生命周期。
2. 常用 SDK 事件。
3. 本地和远端用户列表。
4. 示例页面的公共布局。

子类必须实现：

```ts
protected abstract createState(): S;
protected abstract initRtcEngine(): void;
protected abstract releaseRtcEngine(): void;
```

子类通常还会覆盖：

```ts
protected joinChannel(): void;
protected leaveChannel(): void;
protected renderConfiguration(): ReactElement | undefined;
protected renderAction(): ReactElement | undefined;
```

### 8.1 组件挂载和卸载

```tsx
componentDidMount() {
  this.initRtcEngine();
  window.agoraRtcEngine = this.engine;
}

componentWillUnmount() {
  this.releaseRtcEngine();
}
```

进入一个示例页面时初始化 Engine，离开页面时释放 Engine。音视频 SDK 持有摄像头、麦克风、线程和原生内存，因此释放步骤不能省略。

### 8.2 用户状态维护

`onJoinChannelSuccess` 将 `joinChannelSuccess` 设置为 `true`。

`onUserJoined` 将远端 UID 添加到 `remoteUsers`：

```ts
this.setState((preState) => ({
  remoteUsers: [...(preState.remoteUsers ?? []), remoteUid],
}));
```

`onUserOffline` 从数组中删除对应 UID。React 随状态变化重新渲染远端用户的视频组件。

### 8.3 页面布局

公共页面分成两部分：

- 左侧内容区：显示本地和远端视频。
- 右侧控制区：显示频道输入、加入/离开按钮、功能配置和操作按钮。

具体示例只需要实现自己的配置和操作区域。

## 9. 精读 JoinChannelVideo

建议把 `src/renderer/examples/basic/JoinChannelVideo/JoinChannelVideo.tsx` 作为第一个完整学习案例。

### 9.1 初始化状态

`createState()` 从 `agora.config.ts` 读取 App ID、频道、Token 和 UID，同时初始化预览状态、远端用户数组以及 RTC 统计数据。

### 9.2 初始化 Engine

核心步骤如下：

```ts
this.engine = createAgoraRtcEngine();

this.engine.initialize({
  appId,
  logConfig: { filePath: Config.logFilePath },
  channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
});

this.engine.registerEventHandler(this);
await askMediaAccess(['microphone', 'camera']);
this.engine.enableVideo();
this.engine.startPreview();
```

顺序可以理解为：

```text
创建实例
  -> 初始化 SDK
  -> 注册事件处理器
  -> 请求系统权限
  -> 启用视频模块
  -> 启动本地预览
```

`registerEventHandler(this)` 能够工作，是因为当前组件实现了 `IRtcEngineEventHandler`，事件方法就定义在组件类本身。

### 9.3 加入频道

```ts
this.engine?.joinChannel(token, channelId, uid, {
  clientRoleType: ClientRoleType.ClientRoleBroadcaster,
});
```

这里把本地用户设置为主播，因此会向频道发布音视频流。

需要注意：`joinChannel()` 的返回值只代表调用是否成功提交，真正的入会成功应以 `onJoinChannelSuccess` 回调为准。

### 9.4 SDK 事件驱动界面

```text
joinChannel
  -> onJoinChannelSuccess
  -> joinChannelSuccess = true
  -> 按钮由 join 变成 leave

远端用户入会
  -> onUserJoined
  -> remoteUsers 增加 UID
  -> React 创建远端 RtcSurfaceView

远端用户离会
  -> onUserOffline
  -> remoteUsers 删除 UID
  -> React 卸载对应 RtcSurfaceView
```

这是一种典型的事件驱动模型：SDK 产生事件，组件把事件转换成状态，React 根据状态更新 UI。

### 9.5 质量统计

示例还监听了以下统计回调：

- `onRtcStats`：端到端延迟、CPU 使用率和上行丢包。
- `onLocalVideoStats`：发送码率、编码分辨率和帧率。
- `onLocalAudioStats`：本地音频发送码率。
- `onRemoteVideoStats`：远端视频接收码率和丢包。
- `onRemoteAudioStats`：远端音频接收码率、丢包和质量等级。

这些统计数据保存在 React state 或 `remoteUserStatsList` 中，并叠加显示在视频区域。

### 9.6 离会与释放

```ts
protected leaveChannel() {
  this.engine?.leaveChannel();
}

protected releaseRtcEngine() {
  this.engine?.unregisterEventHandler(this);
  this.engine?.release();
}
```

`leaveChannel` 只离开当前频道，Engine 仍然存在；`release` 会释放整个 Engine。两者用途不同。

## 10. 视频渲染原理

`src/renderer/components/RtcSurfaceView/index.tsx` 是 React UI 和 Agora 原生视频渲染之间的桥梁。

React 首先渲染一个普通 DOM 节点：

```tsx
<div id={`video-${canvas.uid}-${uniqueId}`} />
```

组件挂载后，把这个 DOM 节点交给 SDK：

```ts
{
  ...canvas,
  setupMode: VideoViewSetupMode.VideoViewSetupAdd,
  view: this.getHTMLElement(),
}
```

组件根据视频类型选择不同 API：

- 本地摄像头：`setupLocalVideo`。
- 普通远端视频：`setupRemoteVideo`。
- 多连接场景中的远端视频：`setupRemoteVideoEx`。

组件卸载时使用 `VideoViewSetupRemove` 解除视频和 DOM 的绑定。

需要建立的关键认识是：React 本身不负责解码和绘制视频。React 只创建、更新和销毁容器，Agora 原生 SDK 负责把视频画面渲染到对应容器中。

## 11. Class 与 Hooks 写法对照

Class 示例使用：

```text
成员变量 engine
componentDidMount
componentWillUnmount
registerEventHandler(this)
this.setState
```

Hooks 示例使用：

```text
useRef 保存 engine
useEffect 初始化和释放
addListener 注册单个事件
removeListener 移除事件
useState 保存页面状态
useCallback 稳定回调引用
```

Hooks 的公共初始化逻辑位于：

```text
src/renderer/examples/hook/hooks/useInitRtcEngine.tsx
```

其中一个重要模式是让同一个 `useEffect` 同时负责注册和清理事件：

```tsx
useEffect(() => {
  engine.current.addListener('onUserJoined', onUserJoined);

  return () => {
    engine.current.removeListener('onUserJoined', onUserJoined);
  };
}, [onUserJoined]);
```

清理时必须传入注册时的同一个函数引用，因此事件回调使用 `useCallback` 包装。

## 12. 打包相关配置

`package.json` 中的 `build` 字段由 electron-builder 使用。

关键配置：

- `asar: true`：应用代码打进 ASAR。
- `asarUnpack`：把 `agora-electron-sdk` 从 ASAR 中解包，因为原生动态库不能按普通 JavaScript 文件处理。
- `extraResources`：把测试音频、图片和 GIF 等资源复制到安装包。
- `entitlements.mac.plist`：配置 macOS 权限和 Hardened Runtime entitlement。
- macOS 同时构建 x64 和 arm64 ZIP。
- Windows 构建 ZIP。
- Linux 构建 AppImage。

## 13. 推荐学习路线

### 第一阶段：理解 Electron 外壳

按顺序阅读：

1. `package.json`
2. `electron-webpack.json`
3. `src/main/index.js`
4. `src/renderer/index.tsx`
5. `src/renderer/App.tsx`

目标：能说明主进程和渲染进程分别做什么，开发环境和生产环境分别加载什么页面。

### 第二阶段：跑通基础视频通话

按顺序阅读：

1. `src/renderer/config/agora.config.ts`
2. `src/renderer/examples/config/AuthInfoScreen/index.tsx`
3. `src/renderer/components/BaseComponent.tsx`
4. `src/renderer/examples/basic/JoinChannelVideo/JoinChannelVideo.tsx`
5. `src/renderer/components/RtcSurfaceView/index.tsx`

目标：能独立解释从 Engine 初始化到远端视频显示的完整调用链。

### 第三阶段：理解音频和设备

阅读：

1. `Basic/JoinChannelAudio`
2. `Advanced/DeviceManager`
3. `Advanced/AudioMixing`
4. `Advanced/PlayEffect`

目标：理解采集设备、播放设备、音量、混音和音效之间的区别。

### 第四阶段：学习多路视频能力

阅读：

1. `Advanced/ScreenShare`
2. `Advanced/JoinMultipleChannel`
3. `Advanced/SendMultiVideoStream`
4. `Advanced/Simulcast`

目标：理解 `RtcConnection`、不同视频源以及带 `Ex` 后缀 API 的使用场景。

### 第五阶段：对照 Hooks

对比以下两组文件：

```text
basic/JoinChannelVideo
hook/JoinChannelVideo

components/BaseComponent.tsx
hook/hooks/useInitRtcEngine.tsx
```

目标：能够把同一个 RTC 生命周期分别映射到 class 生命周期和 Hooks effect。

## 14. 动手练习

### 练习一：记录入会耗时

点击 Join 时记录当前时间，在 `onJoinChannelSuccess` 中计算差值并显示到页面。

可以借此理解：

- API 调用和异步成功回调的区别。
- RTC 事件如何更新 React state。

### 练习二：增加麦克风和摄像头开关

在 `JoinChannelVideo` 右侧操作栏增加两个开关，分别调用静音本地音频和停止/恢复本地视频发布的 API。

可以借此理解：

- 采集、发布和渲染是不同层次的操作。
- UI 状态应如何与 SDK 状态保持一致。

### 练习三：显示远端用户数量

根据 `remoteUsers.length` 显示频道内远端人数，并观察用户上下线时的变化。

可以借此理解：

- `onUserJoined` 和 `onUserOffline`。
- React 数组状态更新。

### 练习四：比较 Class 和 Hooks

分别在 Basic 和 Hooks 的 `JoinChannelVideo` 中加入同一个功能，比较：

- Engine 如何保存。
- 事件如何注册和释放。
- 状态如何更新。
- 页面卸载时如何清理资源。

## 15. 阅读代码时需要留意的问题

### 15.1 示例代码不等于生产架构

工程为了让每个 API 示例容易阅读，做了不少简化：

- Electron 安全选项比较宽松。
- App ID 直接由前端页面输入。
- Token 没有展示服务端生成流程。
- 大部分错误只写入控制台。
- Engine 生命周期和页面路由直接绑定。

生产项目通常还需要：

- preload 和严格的 IPC 白名单。
- 服务端 Token 服务。
- 重连、网络变化和异常状态处理。
- 更完整的设备权限引导。
- 日志上传和质量监控。
- 明确的 RTC 状态管理层。

### 15.2 Token 不应由客户端使用 App Certificate 生成

App Certificate 属于服务端密钥，不应打包进 Electron 应用。正式应用应由可信服务端生成 Token，再通过业务接口发给客户端。

### 15.3 以事件回调为最终状态依据

调用 `joinChannel`、`leaveChannel` 或其他异步 RTC API 后，不应立即假设操作已完成。界面状态应尽量依据对应的 SDK 回调更新。

### 15.4 必须成对清理资源

阅读每个示例时，可以主动寻找以下配对：

```text
initialize              <-> release
registerEventHandler    <-> unregisterEventHandler
addListener             <-> removeListener
startPreview            <-> stopPreview/release
setup video add         <-> setup video remove
joinChannel             <-> leaveChannel
```

如果只看功能调用而忽略清理调用，很容易在真实项目中遇到摄像头占用、重复回调、内存泄漏或应用退出异常。

## 16. 最小知识闭环

完成第一轮学习后，应该能够回答下面的问题：

1. Electron 主进程和 React 渲染进程分别从哪个文件启动？
2. 为什么 `agora-electron-sdk` 没有被直接打进 Webpack bundle？
3. macOS 摄像头权限请求为什么需要 IPC？
4. RTC Engine 在哪里初始化和释放？
5. `joinChannel` 返回和 `onJoinChannelSuccess` 有什么区别？
6. 远端用户加入后，UID 如何变成页面上的一个视频窗口？
7. `RtcSurfaceView` 为什么需要在卸载时移除视频绑定？
8. Class 示例与 Hooks 示例如何分别清理事件监听？
9. `leaveChannel` 和 `release` 有什么区别？
10. 哪些配置只是为了示例方便，不应直接复制到生产环境？

能够沿源码回答这些问题，就已经掌握了这个工程最核心的结构和运行机制。
