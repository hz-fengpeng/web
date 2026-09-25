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

### 3.7 Electron 本体就是一个二进制可执行文件

前面 3.5 里说"Electron 启动主进程"，这里的 Electron 指的是 `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`：

```text
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
```

这是一个原生可执行文件，不是脚本，也不是 JavaScript 库。3.0 里说"Electron 是 Chromium 和 Node.js 的组合"，这句话的物理形态就在这里：Chromium 和 Node.js 已经被编译进这个二进制里了。

先看 `node_modules/electron/` 目录下有什么：

```text
node_modules/electron/
├── index.js        # 只有十几行，作用是把可执行文件路径导出去
├── cli.js          # 用 child_process.spawn 启动那个可执行文件
├── install.js      # 安装时下载并解压 Electron
├── path.txt        # 可执行文件相对 dist/ 的路径
└── dist/           # 200M，真正的运行时
```

`index.js` 里没有一行业务逻辑，它读 `path.txt` 再把路径拼出来：

```js
// node_modules/electron/index.js
const pathFile = path.join(__dirname, 'path.txt');

function getElectronPath () {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8');
  }
  // ...
  return path.join(__dirname, 'dist', executablePath);
}

module.exports = getElectronPath();
```

`path.txt` 的内容就是一行路径：

```text
Electron.app/Contents/MacOS/Electron
```

这里有个容易误解的地方：在**普通 Node.js** 里 `require('electron')` 拿到的是一个**字符串**，不是模块对象，`require('electron').toString()` 得到的就是上面那条路径。只有在 Electron 运行时内部，`require('electron')` 才返回 `app`、`BrowserWindow`、`ipcRenderer` 这些 API，因为那是 Electron 自己实现的模块。

用 `file` 看它的真实类型：

```bash
file node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
# Mach-O 64-bit executable arm64
```

但这个文件只有 49K，真正的运行时不在它里面。用 `otool -L` 看它链接了什么：

```bash
otool -L node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
# @rpath/Electron Framework.framework/Electron Framework
# /usr/lib/libSystem.B.dylib
```

它自己只是一个薄壳，Chromium 和 Node.js 都在 `Frameworks/Electron Framework.framework` 里：

```text
Electron.app                                200M
└── Contents
    ├── MacOS/Electron                       49K    入口可执行文件
    ├── Frameworks
    │   ├── Electron Framework.framework    198M    Chromium + Node.js
    │   └── Electron Helper*.app            128K    渲染进程 / GPU 进程的子进程
    └── Resources
        ├── default_app.asar                106K    不带参数启动时的默认 main
        └── electron.icns
```

和写 C/C++ 程序对照一下，两者的结构其实是一样的：

```text
C / C++ 程序                          Electron
------------------------------------  --------------------------------------
main.c 编译出来的 a.out               Contents/MacOS/Electron
a.out 链接的 libxxx.so / .dylib       Electron Framework.framework（动态库）
ldd / otool -L 查看依赖                otool -L 查看依赖
libxxx.so 里是真正的实现              Electron Framework 里是 Chromium 和 Node.js
```

区别在于"谁写代码"：写 C 的时候，`main()` 是你编译的，逻辑是你链接进二进制的；Electron 已经把"可执行文件 + 动态库"这个组合编译好了，你只需要提供被它加载的 JavaScript。你的代码在 Electron 眼里更像**被读取的输入**，而不是被编译进去的目标文件。

macOS 上 `.app` 其实只是一个目录，`Contents/MacOS/` 下的那个文件才是 Finder 双击时真正执行的东西。名字记录在 `Info.plist` 里：

```bash
plutil -p node_modules/electron/dist/Electron.app/Contents/Info.plist | grep CFBundleExecutable
# "CFBundleExecutable" => "Electron"
```

这也解释了为什么 `node_modules/electron` 装起来这么大：`install.js` 会用 `@electron/get` 从 GitHub Releases 下载对应版本、平台和架构的压缩包，解压到 `dist/`，然后写入 `path.txt`。npm 上的 `electron` 包本身很小，200M 是安装时另外下载的。国内安装慢、需要配置镜像，根源就在这一步。

开发时，谁来启动这个二进制？`electron-webpack dev` 最后做的是：

```js
// node_modules/electron-webpack/out/dev/dev-runner.js
spawn(require("electron").toString(), electronArgs, { ... })
```

`require("electron")` 拿到的正是上面那条路径字符串，然后用 `child_process.spawn` 启动它，并把它指向 Webpack 编译出来的产物目录。`node_modules/electron/cli.js` 是另一条入口，手动执行 `electron .` 时走的就是它，做的事一样：

```js
// node_modules/electron/cli.js
const electron = require('./');
const child = proc.spawn(electron, process.argv.slice(2), { stdio: 'inherit' });
```

打包时，这个可执行文件会被改名。electron-builder 先复制整个 `Electron.app`，再按 `productName` 重命名二进制和各个 Helper：

```js
// node_modules/app-builder-lib/out/electron/electronMac.js
doRename(path.join(contentsPath, "MacOS"), electronBranding.productName, appPlist.CFBundleExecutable)
```

当前工程的 `productName` 是 `Agora-Electron-API-Example`，所以打包后的路径会变成：

```text
Agora-Electron-API-Example.app/Contents/MacOS/Agora-Electron-API-Example
```

同时业务代码被放进 `Resources/app.asar`，启动时由这个可执行文件读取。所以开发阶段和打包阶段的差别只有一处：

```text
开发阶段：可执行文件 + 源码产物目录
打包之后：可执行文件 + Resources/app.asar
```

"Electron 是什么"因此可以这样回答：

```text
Electron = 一个原生可执行文件（内含 Chromium 和 Node.js）
         + 你的 JavaScript
         + 一份告诉它去哪里加载你的 JavaScript 的配置
```

本节要点：

- `node_modules/electron` 不是纯 JavaScript 包，它的产物是一个原生可执行文件。
- 在普通 Node.js 里 `require('electron')` 返回路径字符串，在 Electron 运行时里才返回 API 模块。
- 真正的 Chromium 和 Node.js 在 `Frameworks/Electron Framework.framework`，入口可执行文件只是一个薄壳。
- 打包不会把你的代码编译成二进制，只是把 Electron 二进制改名，再配上一份 asar。

### 3.8 宿主与载荷：Electron 如何跑起你的代码

既然 Electron 本体是一个可执行文件，那它和业务代码是什么关系？常见的一种说法是"Electron 二进制调用我写的 JS"，方向大致没错，但"调用"这个词容易让人误以为这是两个独立程序之间的请求-响应。更准确的关系是**宿主和载荷**，可以类比解释器：

```text
python app.py          -> python 二进制加载你的脚本
java -jar app.jar      -> JVM 加载你的字节码
node server.js         -> node 二进制加载你的 JS
electron .             -> Electron 二进制加载你的 JS
```

不过和解释器类比有一处关键差别：**方向是双向的**。启动时 Electron 读取你的入口文件并执行（这一步是它调用你）；进入运行期之后，是你的代码调用它提供的 API：

```js
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {          // 它通知你：环境准备好了
  const window = new BrowserWindow(); // 你调用它：创建一个窗口
});
```

用 C/C++ 的说法，这更像插件宿主：宿主进程 `dlopen` 一个动态库，然后调用它导出的符号；你的代码是插件，Electron 是宿主。你不是在写一个独立程序，而是在写一份被宿主加载的载荷。

第二个差别是**进程数量**。`main.js` 跑在主进程里，但一旦创建 `BrowserWindow`，Electron 会再拉起 Helper 进程去执行页面里的 JavaScript。也就是说"你的 JS"同时活在多个操作系统进程里：

```text
Electron 主进程（可执行文件本体）
  |
  +-- 执行 src/main/index.js
  |
  +-- new BrowserWindow()
        |
        v
      Electron Helper (Renderer).app
        |
        +-- 执行页面里的 JavaScript
        +-- 运行 React
        +-- 本工程里还直接加载 agora_node_ext.node
```

本工程因为设置了 `nodeIntegration: true`，渲染进程里也能直接 `require()` 原生模块，所以 RTC Engine 是跑在 Renderer 进程里的（见 10.8）。这一点取决于 `webPreferences` 配置，不是固定行为。

第三点：你交给 Electron 的**不只是 JavaScript**：

```text
main.js / index.js      主进程入口，由 package.json 的 main 字段指定
preload.js              预加载脚本，在页面脚本之前执行
HTML / CSS              渲染进程要加载的页面
*.node                  原生扩展，例如 agora_node_ext.node
图片、音频、图标        资源文件
```

入口的指定方式有两种，本工程开发时走的是第二种：

```bash
# 方式一：给一个目录，Electron 读该目录 package.json 的 main 字段
electron .

# 方式二：直接给一个 JS 文件
electron dist/main/main.js
```

`electron-webpack dev` 用的是方式二，它把入口文件的绝对路径直接拼进参数里：

```js
// node_modules/electron-webpack/out/dev/dev-runner.js
args.push(path.join(projectDir, "dist/main/main.js"));
startElectron(args, env);
```

### 3.9 对照一个真实应用：VS Code

VS Code 就是一个打包好的 Electron 应用，可以直接在安装目录里看到 3.7、3.8 说的结构：

```bash
ls "/Applications/Visual Studio Code.app/Contents/MacOS/"
# Code
```

```text
Visual Studio Code.app/Contents/
├── MacOS/Code                    130K    从 Electron 改名而来的入口可执行文件
├── Resources/app/
│   ├── package.json                      "main": "./out/main.js"
│   ├── out/                              业务 JavaScript
│   ├── node_modules/                     依赖
│   └── extensions/                       内置扩展
└── Frameworks/
    ├── Electron Framework.framework      Chromium + Node.js
    ├── Code Helper (Renderer).app        渲染进程
    ├── Code Helper (GPU).app             GPU 进程
    └── Code Helper (Plugin).app          插件进程
```

`Info.plist` 里记录的名字也印证了 3.7 的改名过程：

```bash
plutil -p "/Applications/Visual Studio Code.app/Contents/Info.plist" | grep CFBundleExecutable
# "CFBundleExecutable" => "Code"
```

Electron 二进制叫 `Electron`，Helper 叫 `Electron Helper`，打包后统一被换成 `Code` 和 `Code Helper`。

还有一个细节：VS Code 把业务代码放在 `Resources/app/` 目录里，而不是打成 `app.asar`。说明 asar 是可选项，本工程是在 `package.json` 里写了 `"asar": true` 才使用 asar 的。

### 3.10 同一个二进制的另一种用法

Electron 二进制除了当桌面应用宿主，还能退化成纯 Node.js 运行：

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron \
  -e 'console.log(process.versions.node, process.versions.electron, process.type)'
# 16.17.1 22.0.0 undefined
```

`process.type` 为 `undefined`，说明 Chromium 那一套完全没有启动，这次执行的只是二进制里内置的 Node.js。这也是为什么 Electron 二进制能同时被当成"桌面应用运行时"和"Node 运行时"使用。

顺带可以验证 3.7 里说的"API 不是 npm 包提供的"：

```bash
# 在 /tmp 下执行，node_modules 里找不到这个包
require('electron')  # Error: MODULE_NOT_FOUND

# 在本工程目录下执行，拿到的是 npm 包导出的路径字符串
require('electron')  # string  .../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
```

在 Node 模式下 `require('electron')` 只会走普通的 `node_modules` 解析，拿到的是那个路径字符串；只有在 Electron 运行时里，它才被替换成内置的 API 模块。这从反面说明：`app`、`BrowserWindow` 这些 API 是二进制内置的，跟 `npm install electron` 装下来的那个包没有关系。

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
    "start": "electron-webpack dev",
    "compile": "electron-webpack",
    "dist": "npm run compile && electron-builder"
  }
}
```

上游 example 里原本还有 `"postinstall": "npm run rebuild"` 和 `"rebuild": "electron-rebuild -f -o ref-napi"`，作用是把 `ref-napi` 针对 Electron 的 Node ABI 重新编译一遍。这里把它们去掉了，原因有两条：

- 项目里没有任何代码引用 `ref-napi`。v4.x 起 Agora 的 FFI 调用已经换成 `koffi`（见 `ProcessVideoRawData`），`ref-napi` 是上游没清干净的残留，`agora-electron-sdk` 自身也不依赖它。
- `ref-napi@3.0.3` 的 `prebuilds/` 里没有 `darwin-arm64`，Apple Silicon 上只能现场编译。它的编译链会回退到旧版 node-gyp，而旧版 gyp 依赖 Python 的 `distutils`——该模块从 Python 3.12 起已移出标准库，安装会直接失败。

`koffi` 自带 `darwin_arm64` 预编译二进制，不需要重建，所以删掉这一步不影响运行。devDependencies 里的 `@electron/rebuild` 也一并删掉了——它唯一的消费者就是上面那条 `rebuild` 脚本。

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
- 将 `agora-electron-sdk` 和 `koffi` 设置为 external，避免把原生模块打进普通 Webpack bundle。

## 6. Electron 主进程

主进程入口是 `src/main/index.js`。

### 6.1 加载 Agora IPC

```js
import 'agora-electron-sdk/js/Private/ipc/main.js';
```

这行代码注册 Agora SDK 在 Electron 主进程一侧的 IPC handler。当前版本只用它查询 Chromium 的 GPU 信息，RTC API 本身不会通过这里转发。由于窗口打开了 `nodeIntegration`，渲染进程会直接加载 `agora_node_ext.node` 并调用原生 RTC SDK。

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

### 8.1 render 从哪里来

`BaseComponent.render()` 不是 Electron 框架生成的，也不是 React 自动生成的，而是这个示例工程的开发者编写的公共页面实现：

```tsx
export abstract class BaseComponent<
  P = {},
  S extends BaseComponentState = BaseComponentState
> extends Component<P, S> {
  render() {
    const users = this.renderUsers();
    const configuration = this.renderConfiguration();

    return (
      <AgoraView className={AgoraStyle.screen}>
        <AgoraView className={AgoraStyle.content}>
          {users ? this.renderUsers() : undefined}
        </AgoraView>
        <AgoraView className={AgoraStyle.rightBar}>
          {this.renderChannel()}
          {configuration}
          {this.renderAction()}
        </AgoraView>
      </AgoraView>
    );
  }
}
```

这里涉及四种不同的职责：

```text
React
  -> 规定 class 组件通过 render() 描述 UI
  -> 在需要显示或更新组件时调用 render()

工程代码
  -> 在 BaseComponent 中实现 render() 的具体页面结构

JavaScript / TypeScript 继承
  -> JoinChannelVideo 没有定义 render() 时，使用父类的 render()

方法重写和动态派发
  -> 父类 render() 中的 this.renderVideo() 等调用
     会执行 JoinChannelVideo 覆盖后的方法
```

`JoinChannelVideo` 的继承关系如下：

```tsx
export default class JoinChannelVideo
  extends BaseComponent<{}, State>
  implements IRtcEngineEventHandler {
  // 没有定义完整的 render()
}
```

因此 React 渲染 `JoinChannelVideo` 时，会沿继承关系找到 `BaseComponent.render()`：

```text
React 准备渲染 <JoinChannelVideo />
  -> 查找 JoinChannelVideo.render()
  -> 子类没有定义 render()
  -> 沿继承关系找到 BaseComponent.render()
  -> 执行并取得页面 JSX
  -> React 将 JSX 对应的 React Element 更新到真实 DOM
```

父类负责页面骨架，子类负责填充不同示例的内容。例如父类会调用：

```tsx
this.renderUsers();
this.renderChannel();
this.renderConfiguration();
this.renderAction();
```

其中 `JoinChannelVideo` 覆盖了 `renderVideo()` 和 `renderConfiguration()`。所以，虽然完整的 `render()` 位于父类，最终页面仍然包含 `JoinChannelVideo` 自己提供的视频区域和配置区域。

需要注意，`render()` 返回的不是 HTML 字符串，而是 JSX。JSX 编译后会形成 React Element 对象，最后由 React DOM 根据这些对象创建或更新浏览器中的真实 DOM。

Electron 在这里不参与 React 组件的继承和 `render()` 调用。Electron 的职责是创建 `BrowserWindow` 并提供运行网页的渲染进程；窗口中的 React 框架负责组件渲染。

### 8.2 组件挂载和卸载

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

### 8.3 用户状态维护

`onJoinChannelSuccess` 将 `joinChannelSuccess` 设置为 `true`。

`onUserJoined` 将远端 UID 添加到 `remoteUsers`：

```ts
this.setState((preState) => ({
  remoteUsers: [...(preState.remoteUsers ?? []), remoteUid],
}));
```

`onUserOffline` 从数组中删除对应 UID。React 随状态变化重新渲染远端用户的视频组件。

### 8.4 页面布局

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

## 10. agora-electron-sdk 如何连接 Native SDK

`agora-electron-sdk` 不是纯 JavaScript SDK。它在 TypeScript API 和 Agora Native RTC SDK 之间加入了 Node 原生扩展与 Iris 通用桥接层，完整结构如下：

```text
Electron Renderer / TypeScript API
  -> 自动生成的 TS/JS 方法包装
  -> JSON + Buffer
  -> agora_node_ext.node（Node N-API 原生扩展）
  -> AgoraRtcWrapper / Iris 通用调用层
  -> AgoraRtcKit.framework（Native RTC SDK）
```

在 Windows 上最后几层表现为 `.node` 和一组 DLL；当前 macOS 安装包中则是 `.node` 和 framework。这里并不存在一个名为 `agora_sdk` 的单独文件，真正提供 RTC 能力的是 `AgoraRtcKit.framework`。

### 10.1 JavaScript 入口和单例 Engine

包入口由 `package.json` 的 `main: "js/AgoraSdk"` 指向 `js/AgoraSdk.js`，其 TypeScript 源码位于：

```text
node_modules/agora-electron-sdk/ts/AgoraSdk.ts
```

核心实现是：

```ts
const instance = new RtcEngineExInternal();

export function createAgoraRtcEngine(
  options?: AgoraEnvOptions
): IRtcEngineEx {
  Object.assign(AgoraEnv, options);
  return instance;
}
```

因此，`createAgoraRtcEngine()` 并不会在每次调用时创建新的 Native Engine，而是返回模块加载时创建的同一个 `RtcEngineExInternal`。这也符合 RTC SDK 4.x 一个应用只使用一个 Engine 实例的设计。

`RtcEngineExInternal` 在自动生成的 API 实现之上补充了 Electron 特有逻辑，包括：

- 管理音频设备、Media Engine、Media Player 和空间音频等子对象。
- 管理事件监听器。
- 初始化浏览器侧 RendererManager。
- 将 `setupLocalVideo` 和 `setupRemoteVideo` 接入 Canvas 渲染系统。
- 在 `release()` 时清理 Renderer、Observer 和事件。

### 10.2 API 如何变成底层调用

以 `joinChannel()` 为例，其 JavaScript 实现位于：

```text
node_modules/agora-electron-sdk/js/Private/impl/IAgoraRtcEngineImpl.js
```

简化后的代码如下：

```js
joinChannel(token, channelId, uid, options) {
  const apiType = 'RtcEngine_joinChannel_cdbb747';
  const jsonParams = {
    token,
    channelId,
    uid,
    options,
  };
  const jsonResults = callIrisApi.call(this, apiType, jsonParams);
  return jsonResults.result;
}
```

SDK 没有为几百个 RTC API 分别编写一套 Node C++ 绑定，而是把调用统一转换为：

1. 一个 API 标识，例如 `RtcEngine_joinChannel_cdbb747`。
2. 一段 JSON 参数。
3. 可选的二进制 Buffer 数组。

这些参数最终进入 `Private/internal/IrisApiEngine.ts`：

```ts
AgoraElectronBridge.CallApi(
  funcName,
  JSON.stringify(params),
  buffers,
  buffers.length
);
```

普通参数走 JSON。音视频帧、Metadata、Stream Message 等二进制数据通过独立的 `Buffer[]` 传递，避免把大块二进制数据编码进 JSON。

因此，一次入会调用的完整路径是：

```text
engine.joinChannel(...)
  -> "RtcEngine_joinChannel_cdbb747"
  -> JSON.stringify({ token, channelId, uid, options })
  -> AgoraElectronBridge.CallApi(...)
  -> Iris CallIrisApi(...)
  -> Agora C++ IRtcEngine::joinChannel(...)
```

API 名末尾的哈希用于区分同名重载。例如，有无 `options` 的 `joinChannel` 会选取不同的 API 标识。

### 10.3 Node 原生扩展

连接 JavaScript 和 C++ 的关键代码是：

```ts
const AgoraNode = require('../../../build/Release/agora_node_ext');

export const AgoraElectronBridge =
  new AgoraNode.AgoraElectronBridge();
```

Node 会把这个路径解析为：

```text
node_modules/agora-electron-sdk/build/Release/agora_node_ext.node
```

当前 macOS 文件是同时包含 `x86_64` 和 `arm64` 的 Universal Mach-O。其动态依赖关系为：

```text
agora_node_ext.node
  -> AgoraRtcWrapper.framework
  -> AgoraRtcKit.framework
```

`agora_node_ext.node` 的运行时搜索路径使用 `@loader_path`，所以会在同级 `build/Release` 目录查找这些 framework。加载 `agora_node_ext.node` 时，macOS 的动态加载器也会一起加载其依赖。

`AgoraElectronBridge` 暴露的主要原生方法包括：

- `InitializeEnv()`：准备 Iris 与 Native Engine 环境。
- `CallApi()`：统一执行 RTC API。
- `OnEvent()` / `UnEvent()`：注册和移除原生事件回调。
- `ReleaseEnv()`：释放 Iris 与 Native Engine 环境。
- `EnableVideoFrameCache()`：启用视频帧缓存。
- `GetVideoFrame()`：把缓存中的原始视频帧取到 Node Buffer。

### 10.4 Iris 通用调用层

Iris 是 Agora Native SDK 上方的通用接口分发层。它使用统一的 `ApiParam` 表示 API 调用，也使用相同结构表示异步事件。相关头文件位于：

```text
build/Release/AgoraRtcWrapper.framework/Versions/A/Headers/
```

核心结构可以简化为：

```cpp
struct EventParam {
  const char *event;
  const char *data;
  unsigned int data_size;
  char *result;
  void **buffer;
  unsigned int *length;
  unsigned int buffer_count;
};

typedef EventParam ApiParam;
```

其 C API 包括：

```cpp
CallIrisApi(...);
CreateIrisApiEngine(...);
DestroyIrisApiEngine(...);
CreateIrisEventHandler(...);
DestroyIrisEventHandler(...);
```

`AgoraRtcWrapper` 再链接 `AgoraRtcKit.framework`。从动态依赖和二进制符号可以确认，它最终会调用 Native SDK 的 `createAgoraRtcEngine()` 和 `IRtcEngine::release(bool)` 等接口。

所以这里的“连接”不是跨进程通信，也不是通过网络访问另一个服务，而是在同一 Renderer 进程中通过 Node addon、动态库和 C/C++ 函数调用逐层进入 Native RTC SDK。

### 10.5 初始化和释放过程

示例首先取得单例，然后调用：

```ts
engine.initialize({
  appId,
  logConfig: { filePath: Config.logFilePath },
  channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
});
```

初始化调用链为：

```text
engine.initialize(context)
  -> RtcEngine_initialize_0320339
  -> AgoraElectronBridge.InitializeEnv()
  -> 创建或准备 Iris ApiEngine 和 Native IRtcEngine
  -> AgoraElectronBridge.CallApi("RtcEngine_initialize_0320339", ...)
  -> Native SDK initialize(context)
```

`RtcEngineExInternal.initialize()` 随后还会把 App Type 设置为 `3`，即 Iris 中定义的 Electron 类型，并在渲染进程创建 `RendererManager` 和 `CapabilityManager`。

释放时顺序相反：

```text
engine.release()
  -> 清理 Renderer、Observer 和事件监听器
  -> CallApi("RtcEngine_release")
  -> ReleaseEnv()
```

### 10.6 原生事件如何回到 JavaScript

Node addon 在加载时注册统一回调：

```ts
AgoraElectronBridge.OnEvent(
  'call_back_with_buffer',
  (...params) => handleEvent(...params)
);
```

反向事件链为：

```text
Agora Native SDK event
  -> Iris EventParam
  -> NodeIrisEventHandler
  -> AgoraElectronBridge.OnEvent("call_back_with_buffer")
  -> handleEvent()
  -> JSON.parse(data) 并恢复 Buffer
  -> EVENT_PROCESSORS 选择事件处理器
  -> IRtcEngineEventHandler / EventEmitter
  -> onJoinChannelSuccess、onUserJoined 等业务回调
```

`EVENT_PROCESSORS` 会根据事件名前缀区分不同来源，例如：

- `RtcEngineEventHandler_`：RTC Engine 事件。
- `AudioFrameObserver_`：音频帧 Observer。
- `VideoFrameObserver_`：视频帧 Observer。
- `MediaPlayerSourceObserver_`：Media Player 事件。
- `MediaRecorderObserver_`：录制事件。

对于 `onStreamMessage`、音视频裸帧等事件，它还会把单独传来的 Buffer 重新挂回解析后的 JavaScript 对象。

### 10.7 为什么不能把 DOM 直接交给 Native VideoCanvas

这里首先要区分两个名称相同、实际含义不同的 `view`。

Agora Native SDK 的 `VideoCanvas.view` 定义为 `view_t`，而 `view_t` 本质上是一个 `void*`：

```cpp
typedef void* view_t;

struct VideoCanvas {
  view_t view;
};
```

这个指针在不同桌面平台通常表示操作系统原生视图句柄：

- Windows 上通常是 `HWND`。
- macOS 上通常是 `NSView*`。

React 传入的 `<div>` 则是 Chromium Blink 引擎管理的 DOM 节点。它在 JavaScript 中表现为 `HTMLElement`，但一个 `<div>` 并不对应一个独立的 `NSView` 或 `HWND`。Chromium 会统一处理网页布局和图层合成，再把整个页面输出到少量原生窗口或图形表面。

因此，即使 Node addon 能收到这个 JavaScript 对象，也不能把它直接强制转换为 Native SDK 所需的 `view_t`：

```text
HTMLElement
  != NSView*
  != HWND
  != Native VideoCanvas.view_t
```

Electron 可以通过 `BrowserWindow.getNativeWindowHandle()` 取得整个窗口的原生句柄，但不能为任意 DOM `<div>` 取得一个稳定的原生窗口句柄。把视频直接渲染到整个 BrowserWindow 也无法自然服从具体 DOM 节点的布局规则，例如：

- 滚动和元素大小变化。
- CSS transform 和页面缩放。
- 裁剪、圆角和 `overflow`。
- `z-index` 和其他 DOM 元素的遮挡关系。
- HiDPI 和不同平台的坐标换算。
- React 组件的挂载和卸载。

所以，更准确的说法不是“Electron 完全不能使用 Native View”，而是“浏览器中的任意 `HTMLElement` 不能直接作为 Native RTC SDK 的原生视图句柄”。理论上可以编写平台相关的原生扩展，在 Electron 窗口上创建子 `NSView` 或 `HWND`，再持续同步 DOM 的位置、尺寸、裁剪和可见性；但这需要处理 Chromium 合成、原生子窗口层级和跨平台差异，复杂度很高。

Agora Electron SDK 选择了另一种方案：在 TypeScript API 中把 `VideoCanvas.view` 声明为 `any`，实际接收 `HTMLElement`；但 `RtcEngineExInternal.setupLocalVideo()`、`setupRemoteVideo()` 和 `setupRemoteVideoEx()` 不会把这个 HTMLElement 送进 Iris 或 Native `setupVideo`，而是把它交给 `AgoraRendererManager`。

```text
React HTMLElement
  -> AgoraRendererManager
  -> 在 HTMLElement 内创建 HTMLCanvasElement
  -> 从原生帧缓存取得 I420 视频帧
  -> WebGLRenderer / YUVCanvasRenderer
  -> Canvas 显示
```

视频帧数据量大，因此它也没有走普通的 JSON 事件链，而是使用 Iris Rendering 帧缓存：

```text
Agora Native SDK 产生或解码 I420 视频帧
  -> IrisRtcRendering 缓存视频帧
  -> AgoraElectronBridge.GetVideoFrame()
  -> RendererCache
  -> WebGLRenderer / YUVCanvasRenderer
  -> HTML Canvas
```

Renderer 加入后先调用一次 `EnableVideoFrameCache()`，随后渲染循环反复调用 `GetVideoFrame()`；只有取得新帧时才交给 WebGL 或 Canvas Renderer 绘制。这样视频最终成为 Chromium 自己管理的 Canvas 内容，能够正常参与 DOM 布局、裁剪、缩放和组件生命周期。

这一部分的 DOM 绑定、帧缓存和 YUV 绘制细节在下一章继续展开。

### 10.8 Electron 进程边界

当前示例设置了：

```js
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
  webSecurity: false,
}
```

因此，React 所在的 Renderer 进程可以直接 `require()` `agora_node_ext.node`。RTC Engine、Iris 和 Native SDK 都加载在 Renderer 进程内，并不是每次 API 调用都通过 `ipcRenderer` 转发给主进程。

主进程导入的：

```js
import 'agora-electron-sdk/js/Private/ipc/main.js';
```

当前只注册 `AGORA_IPC_GET_GPU_INFO`，用于让 Renderer 查询 Chromium GPU 能力。麦克风和摄像头权限请求使用的是示例工程自己注册的另一个 IPC handler。

Webpack 配置把 `agora-electron-sdk` 标记为 external，避免把原生模块塞进普通的 Web bundle；运行时仍由 Node 按真实文件路径加载 SDK。

### 10.9 安装与打包

安装 SDK 时，其脚本会下载两部分内容：

```text
Electron-mac-4.5.2-napi.zip
  -> Node N-API addon 和 AgoraRtcWrapper

Agora_Native_SDK_for_Mac_v4.5.1_FULL.zip
  -> AgoraRtcKit 及音视频扩展 framework
```

因此，npm 包版本是 `4.5.2`，但这一版本配置的 Iris Wrapper 和 Native SDK 基线是 `4.5.1`。这些版本由包自身配置配套，不应该只替换其中某一个二进制文件。

打包配置使用：

```json
"asarUnpack": [
  "node_modules/agora-electron-sdk"
]
```

原因是 `.node` 和 framework 必须作为磁盘上的真实文件交给操作系统动态加载，不能像普通 JavaScript 一样直接从 ASAR 内读取执行。

当前安装后的 npm 包没有附带 `AgoraElectronBridge` 的 C++ 源码，只有预编译的 `.node`、framework 和部分 Iris 头文件。因此可以完整阅读 TypeScript API、参数序列化、事件分发和渲染代码，但 Node addon 到 Iris 的具体 C++ 实现需要到上游 `AgoraIO-Extensions/Electron-SDK` 源码仓库继续追踪。

## 11. 视频渲染原理

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

这里的 `view` 是 Electron 封装重新解释后的 `HTMLElement`，不是 Native SDK 的 `view_t`，也不是 `BrowserWindow` 或通过 IPC 传到主进程的对象。`RtcSurfaceView` 通过 `getHTMLElement()` 找到内层 `div`，再把它放进 TypeScript `VideoCanvas.view`；SDK 随后把这个 DOM 节点交给自己的 Canvas Renderer，而不是交给 Native `setupVideo`。

### 11.1 SDK 如何绑定 DOM

`setupLocalVideo`、`setupRemoteVideo` 和 `setupRemoteVideoEx` 在 SDK 的 JavaScript 封装层中会进入 `AgoraRendererManager`：

```text
RtcSurfaceView.componentDidMount
  -> setupLocalVideo / setupRemoteVideo
  -> AgoraRendererManager.addOrRemoveRenderer
  -> 创建 WebGLRenderer 或 YUVCanvasRenderer
  -> renderer.bind(view)
```

`renderer.bind(view)` 并不会把原来的 `div` 变成 `<video>` 标签。SDK 会在传入的 `view` 内部动态创建一个 container 和一个 `canvas`：

```html
<div id="video-123-456">
  <div class="sdk-renderer-container">
    <canvas></canvas>
  </div>
</div>
```

因此，React 源码只写出了最外层的 `div`，真正用于绘制画面的 `canvas` 是 Agora Electron SDK 在运行时创建的。

### 11.2 视频帧从原生层到渲染层

Agora 原生 SDK 负责摄像头采集、编码、网络传输和远端视频解码。这些工作通常在原生 SDK 自己的线程中完成。原生视频帧通过 `AgoraElectronBridge` 暴露给渲染进程中的 SDK JavaScript 层：

```text
Agora 原生 SDK 内部线程
  -> 产生或解码视频帧
  -> AgoraElectronBridge
  -> RendererCache 获取视频帧
  -> WebGL/Canvas Renderer 绘制
```

当前包中的桥接对象来自原生 Node 扩展：

```ts
const AgoraNode = require('../../../build/Release/agora_node_ext');
const AgoraElectronBridge = new AgoraNode.AgoraElectronBridge();
```

当某个 Renderer 被加入缓存后，SDK 会启用视频帧缓存，并在渲染循环中读取新帧：

```ts
AgoraElectronBridge.EnableVideoFrameCache(this.cacheContext);
AgoraElectronBridge.GetVideoFrame(
  this.cacheContext,
  this.videoFrame,
  { encodeAlpha: AgoraEnv.encodeAlpha }
);
```

视频帧通常包含 Y、U、V 三个分量、宽高、stride 和旋转角度。这里的 `GetVideoFrame` 是从原生层取得数据，不是从 DOM 中读取视频。

这里说的「渲染循环」需要具体一点：它既不是 `setInterval`，也不是 `requestAnimationFrame`，而是 SDK 自己用 `setTimeout` 自调度出来的循环。

循环由 `RendererManager` 在添加 Renderer 时启动：

```ts
rendererCache.addRenderer(this.createRenderer(checkedContext));
if (!context.useWebCodecsDecoder) {
  this.startRendering();
}
```

`startRendering()` 内部定义了一个 `renderingLooper` 闭包，每跑一轮做四件事：维护这一秒的时间基准、检查是否还有 Renderer、逐个读帧并绘制、决定下一次什么时候再进来：

```ts
const renderingLooper = () => {
  // 每秒的第一帧到达时，重置这一秒的时间基准和帧计数
  if (this._previousFirstFrameTime === 0) {
    this._previousFirstFrameTime = performance.now();
    this._currentFrameCount = 0;
  }
  ++this._currentFrameCount;
  const deltaTime = performance.now() - this._previousFirstFrameTime;
  const expectedTime = (this._currentFrameCount * 1000) / this.renderingFps;

  // 没有 Renderer 了，循环自己退出
  if (this._rendererCaches.length === 0) {
    this.stopRendering();
    return;
  }

  // 逐个 Renderer 读帧并绘制，内部就是 rendererCache.draw()
  for (const rendererCache of this._rendererCaches.filter(
    (cache) => cache instanceof RendererCache
  )) {
    this.doRendering(rendererCache);
  }

  // 还没到这一帧该出现的时间就等差值，已经落后就直接再跑一轮
  if (deltaTime < expectedTime) {
    this._renderingTimer = window.setTimeout(renderingLooper, expectedTime - deltaTime);
  } else {
    renderingLooper();
  }
};
```

有几点需要留意：

1. 帧率由 `renderingFps` 决定，默认是 15。`setRenderingFps()` 可以修改，修改后会先停止再重启循环。所以这个循环是「尽量按目标帧率把帧均匀铺在这一秒里」，而不是每帧固定间隔。
2. 落后于计划时不会补等待，而是直接同步递归跑下一轮，因此卡顿时会连续补几帧。
3. 循环会自己停下来。`_rendererCaches` 为空时调用 `stopRendering()`，把 `setTimeout` 的定时器清掉。
4. `startRendering()` 开头有 `if (this._renderingTimer) return;`，所以重复调用不会起出两个循环，多次添加 Renderer 是安全的。

另外要区分清楚：`EnableVideoFrameCache` 和 `GetVideoFrame` 并不在同一个方法里。前者在 Renderer 加入缓存时只调用一次，后者在循环的每一轮里调用。两者是「先打开帧缓存，再逐帧取」的关系：

```text
addRendererToCache
  -> rendererCache.addRenderer
  -> EnableVideoFrameCache     只调用一次

renderingLooper 每一轮
  -> rendererCache.draw
  -> GetVideoFrame             每轮调用一次
  -> isNewFrame 为真才绘制
```

顺带说明一个容易混淆的点：`requestAnimationFrame` 在这个包里确实存在，但用在解码器的 WebCodecs 路径上。上面 `filter` 那一行特意只挑出 `RendererCache` 实例，就是把 WebCodecs 那条路径排除在这个 `setTimeout` 循环之外。

因此，视频画面并不是浏览器每次重绘时顺带画出来的，而是 SDK 用一个 15fps 的定时循环主动去原生层取帧、再画到 `canvas` 上。这也是为什么即使页面没有发生 DOM 变化，视频依然会持续刷新。

### 11.3 WebGL 绘制路径

如果 Electron/Chromium 支持 WebGL，`RendererManager` 默认创建 `WebGLRenderer`。这条路径不会先在 CPU 上把 YUV 转成 RGBA，而是把 I420 帧的 Y、U、V 平面分别上传到 GPU，在 fragment shader 中逐像素完成颜色转换。

完整调用链可以概括为：

```text
Agora Native SDK
  -> VideoFrameCache（I420）
  -> RendererManager 的 15fps 定时循环
  -> RendererCache.GetVideoFrame()
  -> WebGLRenderer.drawFrame()
  -> 上传 Y/U/V/Alpha 纹理
  -> Fragment Shader 将 YUV 转为 RGB
  -> gl.drawArrays()
  -> canvas
```

#### 11.3.1 初始化 WebGL

`WebGLRenderer.bind(view)` 会先调用父类的 `bind()`，在传入的 `view` 中创建 container 和 `canvas`，然后按下面的顺序尝试获取 WebGL 上下文：

```ts
['webgl2', 'webgl', 'experimental-webgl']
```

创建成功后，它会设置透明清屏色，开启深度测试和 Alpha 混合，并使用下面的混合方式：

```ts
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
```

随后编译 vertex shader 和 fragment shader，创建两个顶点缓冲区，以及四张单通道纹理：

```text
TEXTURE0 -> Ytex
TEXTURE1 -> Utex
TEXTURE2 -> Vtex
TEXTURE3 -> Atex，可选 Alpha 平面
```

纹理使用 `CLAMP_TO_EDGE`，缩放过滤方式为 `NEAREST`。如果无法创建 WebGL context，fallback 回调会让 `RendererManager` 把当前 renderer 替换成软件版 `YUVCanvasRenderer`。

#### 11.3.2 每帧上传 YUV 数据

`RendererCache` 从原生帧缓存取到新帧后，将同一个 `VideoFrame` 分发给对应的 renderer。`WebGLRenderer.drawFrame()` 使用的数据主要包括：

```ts
width, height
yStride, uStride, vStride
yBuffer, uBuffer, vBuffer
rotation
alphaBuffer
```

这些平面按下面的尺寸上传：

```text
Y:     yStride x height
U:     uStride x height / 2
V:     vStride x height / 2
Alpha: width   x height
```

Y 平面是完整分辨率，U/V 平面的高度只有一半，符合 I420/YUV420P 的内存布局。上传前还会调用：

```ts
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
```

这样每行数据不必按 4 字节对齐。各平面通过 `gl.texImage2D()` 以 `LUMINANCE + UNSIGNED_BYTE` 的形式上传，因此每个纹理像素只保存一个 8 bit 分量。

这里每收到一帧都会重新调用 `texImage2D()` 上传整张纹理，没有使用 `texSubImage2D()` 做增量更新。

#### 11.3.3 处理 stride 和有效画面区域

视频帧的有效宽度是 `width`，但 Y 平面每行实际占用的字节数是 `yStride`。当 `yStride > width` 时，每行末尾存在用于内存对齐的 padding。例如：

```text
width   = 1280
yStride = 1344
```

此时 Y 纹理实际宽度为 1344，但只有前 1280 个像素是有效图像。代码把纹理坐标的右边界设置为：

```ts
1 - (yStride - width) / yStride
```

也就是 `width / yStride`，从而避免 shader 采样右侧 padding。U/V 平面复用相同的归一化纹理坐标，因此这里隐含了 Y、U、V 各平面的有效宽度与 stride 比例一致这一前提。

#### 11.3.4 Shader 将 YUV 转成 RGB

Vertex shader 接收像素坐标 `a_position` 和纹理坐标 `a_texCoord`。它通过 `u_resolution` 把 Canvas 像素坐标转换成 WebGL 的 `[-1, 1]` 裁剪空间：

```glsl
vec2 zeroToOne = a_position / u_resolution;
vec2 zeroToTwo = zeroToOne * 2.0;
vec2 clipSpace = zeroToTwo - 1.0;
gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
```

其中 Y 坐标乘以 `-1`，是为了处理 DOM/Canvas 与 WebGL 裁剪空间的 Y 轴方向差异。

Fragment shader 使用同一组纹理坐标分别采样 Y、U、V：

```glsl
y = texture2D(Ytex, vec2(nx, ny)).r;
u = texture2D(Utex, vec2(nx, ny)).r;
v = texture2D(Vtex, vec2(nx, ny)).r;
```

然后使用一组固定系数完成 YUV 到 RGB 的转换：

```glsl
y = 1.1643 * (y - 0.0625);
u = u - 0.5;
v = v - 0.5;
r = y + 1.5958 * v;
g = y - 0.39173 * u - 0.81290 * v;
b = y + 2.017 * u;
```

这组系数接近 limited-range BT.601。转换完成后，shader 输出：

```glsl
gl_FragColor = vec4(r, g, b, a);
```

如果帧中带有 `alphaBuffer`，`a` 来自 Alpha 纹理；否则使用 `a = 1.0`，画面完全不透明。

#### 11.3.5 绘制、旋转和显示模式

整个视频画面由两个三角形组成，共 6 个顶点：

```text
p1 ----- p2
 |      / |
 |    /   |
 |  /     |
p4 ----- p3
```

`rotateCanvas()` 根据帧中的 `rotation` 调整这 6 个顶点的排列顺序，从而在 GPU 绘制阶段支持 0、90、180、270 度旋转。90 度或 270 度时，父类还会交换 Canvas 的宽高。

纹理和顶点准备完成后，真正触发绘制的是：

```ts
gl.drawArrays(gl.TRIANGLES, 0, 6);
```

WebGL 只负责将当前帧画满 Canvas，Canvas 如何适配外层 view 则由父类使用 CSS 完成：

- `RenderModeHidden`：按较大的比例缩放，填满容器，多余部分由 `overflow: hidden` 裁剪。
- `RenderModeFit`：按较小的比例缩放，完整显示视频，容器中可能留有空白区域。
- 镜像模式：在外层元素上使用 `rotateY(180deg)`。

第一次成功绘制后，父类的 `drawFrame()` 会把此前隐藏的 Canvas 显示出来。

#### 11.3.6 实现上的注意点

这份实现还有几个值得留意的地方：

- 它优先创建 WebGL2 context，但纹理上传使用的是 WebGL1 风格的 `LUMINANCE`。严格的 WebGL2 环境通常应改用 `R8/RED`，因此这里存在兼容性风险。
- YUV 转换矩阵固定为近似 BT.601 limited range，没有根据 `VideoFrame.colorSpace` 切换 BT.601/BT.709 或 full/limited range，某些输入可能出现颜色偏差。
- U/V 纹理使用 `NEAREST` 放大，色度平面的低分辨率可能表现为较明显的色块；`LINEAR` 会更平滑。
- `releaseTextures()` 删除了 Y/U/V 纹理和两个 buffer，但没有删除 `aTexture`，存在 GPU 资源清理遗漏。
- WebGL context lost 时会立即 fallback 到软件 renderer，并解绑原 renderer；因此原对象中的 context restored 恢复逻辑通常没有机会继续完成恢复。
- 90/270 度旋转时 Canvas 已交换宽高，但 viewport 仍使用原始的 `width x height`，竖屏画面需要重点验证是否存在裁剪或绘制区域不完整。

### 11.4 无 WebGL 时的绘制路径

如果 WebGL 不可用，SDK 会切换到 `YUVCanvasRenderer`，使用 `yuv-canvas` 进行软件绘制：

```ts
this.frameSink = YUVCanvas.attach(this.canvas, {
  webGL: false,
});

this.frameSink.drawFrame(frame);
```

这条路径仍然是在渲染进程中操作 `canvas`，只是没有使用 WebGL。

### 11.5 进程和线程的分工

不能把整个过程简单理解成“都在渲染线程中”：

```text
Electron 主进程
  -> 创建 BrowserWindow、加载页面、处理系统权限

Electron 渲染进程的 JavaScript/UI 线程
  -> React 创建 div
  -> RendererManager 管理 Renderer
  -> 获取视频帧
  -> 调用 Canvas/WebGL API

Agora 原生 SDK 内部线程
  -> 采集、编码、网络、解码和帧缓存

Chromium 图形管线 / GPU 进程
  -> 执行底层 GPU 绘制
```

所以，主进程不负责操作这个视频 `div`，也不负责执行 `canvas` 的绘制。DOM、Canvas 和 WebGL 调用发生在渲染进程；Agora 的编解码和网络处理主要发生在原生 SDK 线程；WebGL 的底层 GPU 工作则由 Chromium 图形管线完成。

### 11.6 镜像和资源释放

点击 `RtcSurfaceView` 后，组件切换 `isMirror` 并调用 `updateRenderer()`。SDK 更新 Renderer 上下文，在父元素上应用类似下面的变换：

```css
transform: rotateY(180deg);
```

组件卸载时使用 `VideoViewSetupRemove`。SDK 会从 Renderer 缓存移除 Renderer、停止视频帧缓存，并移除动态创建的 `canvas` 和内部 container：

```text
React 卸载 RtcSurfaceView
  -> VideoViewSetupRemove
  -> 移除 Renderer
  -> 关闭视频帧缓存
  -> 移除 canvas 和内部 container
```

需要建立的关键认识是：React 负责创建、更新和销毁视频容器；Agora 原生 SDK 负责产生或解码视频帧；Agora Electron SDK 的渲染层负责把这些帧绘制到渲染进程中的 `canvas` 上。

## 12. Class 与 Hooks 写法对照

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

## 13. 打包相关配置

`package.json` 中的 `build` 字段由 electron-builder 使用。

关键配置：

- `asar: true`：应用代码打进 ASAR。
- `asarUnpack`：把 `agora-electron-sdk` 从 ASAR 中解包，因为原生动态库不能按普通 JavaScript 文件处理。
- `extraResources`：把测试音频、图片和 GIF 等资源复制到安装包。
- `entitlements.mac.plist`：配置 macOS 权限和 Hardened Runtime entitlement。
- macOS 同时构建 x64 和 arm64 ZIP。
- Windows 构建 ZIP。
- Linux 构建 AppImage。

## 14. 推荐学习路线

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

## 15. 动手练习

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

## 16. 阅读代码时需要留意的问题

### 16.1 示例代码不等于生产架构

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

### 16.2 Token 不应由客户端使用 App Certificate 生成

App Certificate 属于服务端密钥，不应打包进 Electron 应用。正式应用应由可信服务端生成 Token，再通过业务接口发给客户端。

### 16.3 以事件回调为最终状态依据

调用 `joinChannel`、`leaveChannel` 或其他异步 RTC API 后，不应立即假设操作已完成。界面状态应尽量依据对应的 SDK 回调更新。

### 16.4 必须成对清理资源

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

## 17. 最小知识闭环

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
