/**
 * 数据出处的声明文案。
 *
 * 为什么单独一个模块：导出的 CSV / PNG 里必须带一句出处声明，而**校验它的
 * 是主进程**（`src/main/ipc/export.ts`）、**生成它的是渲染进程**。两边各写
 * 一份字符串，改一处忘一处的结果是所有导出失败，而报错是「缺少出处声明」
 * ——看起来像内容被截断了，不像文案不一致。
 *
 * 声明本身不是装饰。界面上的横幅救不了已经被另存成 CSV、转发出去、脱离了
 * 应用的那张表；声明跟着文件走才有用。
 *
 * 只有一套文案，因为库只有一种来历：`resources/macro.db` 由 `fetcher/`
 * 离线抓取，应用每次启动都拿它覆盖 userData（见 db/bootstrap.ts）。
 */

/** 声明本身。改这句话要同时想到 `src/main/ipc/export.test.ts` 的断言。 */
export const REAL_DECLARATION = '真实统计数据'

/**
 * 导出文件里那一行的完整写法。
 *
 * 要把口径交代清楚：真实统计也有它的边界——少数指标没有免费源，库里是空的
 * （`status='missing'`），说「真实统计数据」而不提这件事，会被读成
 * 「整张表都完整」。
 */
export function provenanceLine(): string {
  return `${REAL_DECLARATION}（来源：国家统计局 / 东方财富 / 国家外汇管理局 / ` +
    '中国债券信息网 / 新浪财经；' +
    '由 fetcher/ 离线抓取，非实时）'
}
