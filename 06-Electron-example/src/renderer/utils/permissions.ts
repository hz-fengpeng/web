import { ipcRenderer } from 'electron';

// ============================================
// 为什么只有 macOS 才需要申请权限？
// ============================================
//
// 两层原因，缺一不可。
//
// --------------------------------------------
// 一、Electron API 层：askForMediaAccess 是 macOS 独有
// --------------------------------------------
//
// 看 node_modules/electron/electron.d.ts 里的签名：
//
//   /** @platform darwin */
//   askForMediaAccess(mediaType: 'microphone' | 'camera'): Promise<boolean>;
//
//   /** @platform win32,darwin */
//   getMediaAccessStatus(mediaType: 'microphone' | 'camera' | 'screen'): (...);
//
// askForMediaAccess 标了 @platform darwin。Windows 的实现
// (electron_api_system_preferences_win.cc) 里只有 GetMediaAccessStatus，
// 压根没有 AskForMediaAccess —— 拿到的是 undefined，调用会抛
// TypeError: ... is not a function。Linux 上连 getMediaAccessStatus 都没有。
//
// 所以下面 process.platform === 'darwin' 的守卫不是优化，是必需的：
// 它同时也保护了主进程里那个没做平台判断的 handler
// (src/main/index.js 的 IPC_REQUEST_PERMISSION_HANDLER)。
//
// --------------------------------------------
// 二、操作系统层：三个系统的权限模型根本不一样
// --------------------------------------------
//
//   macOS    10.14 Mojave 起有 TCC（Transparency, Consent, and Control）。
//            首次访问弹系统级弹窗，权限记在「系统设置 → 隐私与安全性」，
//            绑定到 app bundle（签名 + bundle id）。
//            还必须在 Info.plist 里声明 NSMicrophoneUsageDescription /
//            NSCameraUsageDescription，否则不是"被拒绝"而是进程直接崩溃。
//
//   Windows  只有「设置 → 隐私」里一个对所有 win32 应用的总开关。
//            Electron 类型定义里的原话：
//              "Windows 10 has a global setting controlling microphone and
//               camera access for all win32 applications."
//            应用端没有 API 能主动弹窗，只能直接试，失败了就是设备打不开。
//
//   Linux    没有系统级的媒体权限模型。
//
// 一句话：macOS 把权限控制权交给「用户 × 单个应用」，所以应用需要"申请"
// 这个动作；Windows 交给「用户全局开关」，应用无从申请；Linux 没这一层。
//
// --------------------------------------------
// 三、本工程特有的原因：它绕过了 Chromium 的权限层
// --------------------------------------------
//
// 普通 Electron 应用用 navigator.mediaDevices.getUserMedia() 拿摄像头，
// 走的是 Chromium 的权限层，Electron 会帮忙处理。
//
// 但本工程用的是 agora-electron-sdk（见 package.json），一个 native addon，
// 摄像头 / 麦克风是主进程里的原生 C++ 代码直接打开的，压根没经过
// getUserMedia。原生代码访问设备时，macOS 的 TCC 照样拦截，但此时没有
// Chromium 替你弹窗，所以只能自己在主进程调
// systemPreferences.askForMediaAccess() 去触发那个系统弹窗。
//
// 而 Windows / Linux 没有这层 OS 拦截，原生代码直接 open device 就成功了
// —— 所以本文件在非 macOS 上返回空数组是设计如此，不是 bug，
// 调用方（如 examples/basic/JoinChannelVideo）拿到空数组也不需要额外处理。
//
// 另外 assets/entitlements.mac.plist 里的 com.apple.security.device.camera /
// com.apple.security.device.audio-input 是另一套东西（App Sandbox 的权限
// 声明），和 TCC 的用户运行时授权是两回事，macOS 上两者都要有。
//
// --------------------------------------------
// 备注：screen 这条路径有个隐患
// --------------------------------------------
//
// askForMediaAccess 只接受 'microphone' | 'camera'，传 'screen' 会被 reject
// 成 "Invalid media type"。而主进程 handler 的判断是
// getMediaAccessStatus(type) === 'not-determined'，Electron 源码里 screen
// 分支是可能返回 'not-determined' 的（本机实测返回 denied）。
// 一旦真出现，askForMediaAccess('screen') 会 reject，而下面的 .catch 会把
// Error 对象本身当成 result 塞进结果里（Error 是 truthy，类型上却标着
// boolean）。
//
// 屏幕录制权限在 macOS 上也不能主动弹窗，只能引导用户去
// 「隐私与安全性 → 屏幕录制」手动勾选后重启应用 —— 这也是下面那段
// 上游 JSDoc 里说"改完要重启 app"的原因。

export type mediaType = 'microphone' | 'camera' | 'screen';
export interface AskMediaAccessReturn {
  result: boolean;
  mediaType: mediaType;
}

/**
 * request media permission MACOS ONLY
 * If an access request was denied and later is changed through the System Preferences pane, a restart of the app will be required for the new permissions to take effect.
 * If access has already been requested and denied, it must be changed through the preference pane;
 * this fun will not call and the promise will resolve with the existing access status.
 * @param mediaTypes
 * @returns AskMediaAccessReturn[]
 */
export const askMediaAccess = async (
  mediaTypes: mediaType[]
): Promise<AskMediaAccessReturn[]> => {
  let results: AskMediaAccessReturn[] = [];
  // 非 macOS 直接跳过：Windows / Linux 没有系统级媒体权限，
  // 原生代码直接开设备即可，调用方拿到空数组也不影响后续。
  if (process.platform === 'darwin') {
    for (const mediaType of mediaTypes) {
      let result: boolean = false;
      await ipcRenderer
        .invoke('IPC_REQUEST_PERMISSION_HANDLER', {
          type: mediaType,
        })
        .then((res: boolean) => {
          result = res;
        })
        .catch((error) => {
          // 注意：这里把 Error 对象赋给了 boolean 类型的 result，
          // screen 走到这条分支时会是个 truthy 的 Error。
          result = error;
        })
        .finally(() => {
          results.push({
            mediaType,
            result,
          });
        });
    }
  }
  return results;
};
