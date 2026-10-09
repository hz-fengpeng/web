import type { JSX } from 'react'
import { Badge, PageHeading } from '../components/UI'
import { RANGE_LABEL } from '../lib/data'
import type { Preferences } from '../lib/preferences'

export function Settings({ preferences, onChange, storageError }: { preferences: Preferences; onChange: (p: Preferences) => void; storageError: boolean }): JSX.Element {
  return <>
    <PageHeading title="设置" description="自定义界面与浏览偏好，偏好仅存储在本机。" />
    {storageError && <p role="alert" className="note mb-4">无法保存偏好到本机，当前设置仍然生效，重启后可能丢失。</p>}
    <section className="panel settings-panel"><h2>显示偏好</h2><div className="setting-row"><div><strong>外观主题</strong><p>图表与页面同步切换深浅色。</p></div><div className="segmented" role="group" aria-label="外观主题">
      {(['system', 'light', 'dark'] as const).map((theme, index) => <button key={theme} aria-pressed={preferences.theme === theme} onClick={() => onChange({ ...preferences, theme })}>{['跟随系统', '浅色', '深色'][index]}</button>)}
    </div></div><div className="setting-row"><div><strong>默认时间范围</strong><p>进入详情或对比页时使用，锚定库内最新期间。</p></div><select aria-label="默认时间范围" value={preferences.range} onChange={(e) => onChange({ ...preferences, range: e.target.value as Preferences['range'] })}>
      {(['1y', '3y', '5y', 'all'] as const).map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}
    </select></div></section>
    <section className="panel settings-panel mt-5"><h2>关于中国宏观经济指标</h2><div className="actions mt-4"><Badge>v0.1.0</Badge><Badge>本地 SQLite</Badge><Badge>完全离线</Badge></div><p className="mt-4 text-sm text-ink-2">本页不显示数值，因此不重复出处声明——它常驻在窗口顶部。口径说明用于指导展示，引用统计请以官方发布为准。</p>
      <p className="mt-3 text-xs text-ink-muted">关注列表与偏好保存在本机。应用不提供账号、云同步或自动更新。</p></section>
  </>
}
