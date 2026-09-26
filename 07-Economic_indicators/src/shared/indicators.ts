import type { Indicator } from './types'

/**
 * ★ 指标元数据的单一事实源。
 * UI 与测试全部从这里读取——不存在第二处定义。
 *
 * ★ 目前这些指标的值来自内置的 `resources/macro.db`（M1d 起），
 *   是合成数据，不是真实统计。`note` 里记录的口径是**真实口径**，
 *   用来指导 UI 该怎么呈现（哪个是累计、哪个是季调），不代表当前库里的
 *   数值就是真的。
 *
 * 其余 P0 指标（M2/社融/进出口/外储/财政）待接入真实数据源后加入。
 */
export const INDICATORS: Indicator[] = [
  {
    id: 'cn.ind_prod.yoy',
    nameZh: '规模以上工业增加值：当月同比',
    nameShort: '工业增加值',
    category: 'growth',
    unit: '%',
    frequency: 'month',
    valueType: 'yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '规模以上工业指年主营业务收入 2000 万元及以上的工业企业。增速为扣除价格因素的实际增长率。1-2 月合并发布。',
  },
  {
    id: 'cn.ind_prod.mom',
    nameZh: '规模以上工业增加值：当月环比',
    nameShort: '工业增加值环比',
    category: 'growth',
    unit: '%',
    frequency: 'month',
    valueType: 'mom',
    seasonalAdj: true,
    decimals: 1,
    isHeadline: false,
    note: '⚠️ 环比为季节调整后口径，与同比不可比、不可混画。',
  },
  {
    id: 'cn.cpi.yoy',
    nameZh: '居民消费价格指数：当月同比',
    nameShort: 'CPI 同比',
    category: 'price',
    unit: '%',
    frequency: 'month',
    valueType: 'yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '反映居民家庭一般所购买的消费品和服务项目价格水平的变动。基期每 5 年轮换。',
  },
  {
    id: 'cn.ppi.yoy',
    nameZh: '工业生产者出厂价格指数：当月同比',
    nameShort: 'PPI 同比',
    category: 'price',
    unit: '%',
    frequency: 'month',
    valueType: 'yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '反映工业企业产品第一次出售时的出厂价格变动趋势和程度。',
  },
  {
    id: 'cn.pmi.mfg',
    nameZh: '制造业采购经理指数',
    nameShort: '制造业 PMI',
    category: 'sentiment',
    unit: '点',
    frequency: 'month',
    valueType: 'index',
    seasonalAdj: true,
    decimals: 1,
    isHeadline: true,
    note: '50 为荣枯分界线，高于 50 表示扩张。已做季节调整。当月最后一天发布。',
  },
  {
    id: 'cn.retail.cum_yoy',
    nameZh: '社会消费品零售总额：累计同比',
    nameShort: '社零累计同比',
    category: 'demand',
    unit: '%',
    frequency: 'month',
    valueType: 'cumulative_yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '⚠️ 年内公布的是累计同比，不是当月同比，每年 1 月重新起算。1-2 月合并发布。',
  },
  {
    id: 'cn.fai.cum_yoy',
    nameZh: '固定资产投资：累计同比',
    nameShort: '固投累计同比',
    category: 'demand',
    unit: '%',
    frequency: 'month',
    valueType: 'cumulative_yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '⚠️ 年内公布的是累计同比，每年 1 月重新起算。统计范围为计划总投资 500 万元及以上项目。1-2 月合并发布。',
  },
  {
    id: 'cn.re.cum_yoy',
    nameZh: '房地产开发投资：累计同比',
    nameShort: '房地产投资',
    category: 'demand',
    unit: '%',
    frequency: 'month',
    valueType: 'cumulative_yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: false,
    note: '⚠️ 年内公布的是累计同比，绝对值口径为房地产开发投资完成额。1-2 月合并发布。',
  },
  {
    id: 'cn.unemp.rate',
    nameZh: '全国城镇调查失业率',
    nameShort: '调查失业率',
    category: 'employment',
    unit: '%',
    frequency: 'month',
    valueType: 'level',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '基于劳动力调查得出的调查失业率，与国际劳工组织标准接轨，非登记失业率。取当月值，非累计平均。',
  },
  {
    id: 'cn.gdp.yoy',
    nameZh: '国内生产总值：当季同比',
    nameShort: 'GDP 同比',
    category: 'growth',
    unit: '%',
    frequency: 'quarter',
    valueType: 'yoy',
    seasonalAdj: false,
    decimals: 1,
    isHeadline: true,
    note: '按不变价格计算。季度 GDP 有初步核算、初步核实、最终核实三次发布，修订值以 revision 字段保留。',
  },
]

export const byId = (id: string): Indicator | undefined => INDICATORS.find((i) => i.id === id)

export const headlines = (): Indicator[] => INDICATORS.filter((i) => i.isHeadline)
