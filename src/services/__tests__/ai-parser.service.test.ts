import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIParseError } from '@/types/errors'
import type { Worker } from '@/types'

/**
 * ai-parser.service 测试套件
 *
 * 4 个用例覆盖：
 *   a) 正常返回 JSON → 解析后字段完整
 *   b) 返回超时（>30s）→ 抛 AIParseError
 *   c) 返回格式错误（缺字段/类型错）→ zod 校验失败抛错
 *   d) 教育记录里含 4 个姓名 → matchWorkers 返回对应 id 或 null
 */

// ============ mock ai.service ============
// 控制 aiService.chat 的返回内容与延迟
let mockChatResponse = ''
let mockChatDelayMs = 0
let mockIsConfigured = true

vi.mock('@/services/ai.service', () => ({
  aiService: {
    isConfigured: vi.fn(async () => mockIsConfigured),
    chat: vi.fn(async () => {
      if (mockChatDelayMs > 0) {
        await new Promise<void>((resolve) => {
          // 用真实 setTimeout（fake timer 也能拦截到）
          setTimeout(resolve, mockChatDelayMs)
        })
      }
      return mockChatResponse
    }),
  },
}))

// ============ mock workerService（用于 matchWorkers 测试） ============
// 预置工人表数据
let mockWorkers: Worker[] = []

vi.mock('@/services/workerService', () => ({
  workerService: {
    list: vi.fn(async () => mockWorkers),
  },
}))

const { aiParser, ParsedDailyDataSchema } = await import('@/services/ai-parser.service')
const { matchWorkers } = await import('@/services/worker-matcher.service')

// 完整的合法 AI 返回 JSON（覆盖 6 张表）
const VALID_RESPONSE = JSON.stringify({
  dailyLog: {
    date: '2026-07-13',
    weather: '晴',
    temperature: 28,
    workContent: '今天进行塔吊安装作业',
    safetyMeasures: '设置警戒区，配备专职安全员',
    issues: '部分工人未戴安全帽',
  },
  dangerousProjects: [
    { category: '塔吊安装', isOperating: true, notes: '今日完成主卷扬机安装' },
  ],
  educationRecords: [
    {
      date: '2026-07-13',
      topic: '塔吊作业安全教育',
      attendeeNames: ['张三', '李四', '王五', '赵六'],
    },
  ],
  hazards: [
    {
      date: '2026-07-13',
      title: '1号塔吊基础积水',
      level: 'general',
      location: '1号塔吊基坑',
      status: 'pending',
    },
  ],
  acceptances: [
    { date: '2026-07-13', type: '塔吊基础验收', equipmentCode: 'TC001' },
  ],
  penalties: [
    { date: '2026-07-13', targetName: '陈七', reason: '未戴安全帽', amount: 200 },
  ],
})

describe('ai-parser.service', () => {
  beforeEach(() => {
    mockChatResponse = ''
    mockChatDelayMs = 0
    mockIsConfigured = true
    mockWorkers = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a) 正常返回 JSON → 解析后字段完整', async () => {
    mockChatResponse = VALID_RESPONSE

    const result = await aiParser.parseDailyNarrative('今天塔吊安装', 'proj-1')

    expect(result.dailyLog).toBeDefined()
    expect(result.dailyLog?.date).toBe('2026-07-13')
    expect(result.dailyLog?.weather).toBe('晴')
    expect(result.dailyLog?.temperature).toBe(28)
    expect(result.dailyLog?.workContent).toBe('今天进行塔吊安装作业')
    expect(result.dailyLog?.safetyMeasures).toBe('设置警戒区，配备专职安全员')
    expect(result.dailyLog?.issues).toBe('部分工人未戴安全帽')

    expect(result.educationRecords).toHaveLength(1)
    expect(result.educationRecords?.[0].attendeeNames).toEqual(['张三', '李四', '王五', '赵六'])

    expect(result.hazards).toHaveLength(1)
    expect(result.hazards?.[0].level).toBe('general')

    expect(result.penalties).toHaveLength(1)
    expect(result.penalties?.[0].amount).toBe(200)
  })

  it('b) 返回超时（>30s）→ 抛 AIParseError，降级路径', async () => {
    // 让 chat 永远不 resolve（延迟 60s）
    mockChatDelayMs = 60000
    vi.useFakeTimers()

    const promise = aiParser.parseDailyNarrative('测试超时', 'proj-1')
    // 提前挂上 catch，避免 advanceTimersByTime 触发 reject 时成为 unhandled rejection
    const assertion = promise.then(
      () => { throw new Error('应该抛 AIParseError 但未抛') },
      (err) => err,
    )

    // 推进 31 秒，触发 30s 超时
    await vi.advanceTimersByTimeAsync(31000)

    const err = await assertion
    expect(err).toBeInstanceOf(AIParseError)
    expect(String((err as Error).message)).toMatch(/超时/)
  })

  it('c) 返回格式错误（缺字段/类型错）→ zod 校验失败抛错', async () => {
    // 故意返回温度为字符串（schema 要求 number），且日期格式错误
    mockChatResponse = JSON.stringify({
      dailyLog: {
        date: '2026/07/13', // 格式错：应为 YYYY-MM-DD
        weather: '晴',
        temperature: '二十八度', // 类型错：应为 number
      },
    })

    await expect(
      aiParser.parseDailyNarrative('格式错误的输入', 'proj-1'),
    ).rejects.toThrow(AIParseError)
  })

  it('c2) AI 返回非 JSON 文本 → 抛 AIParseError', async () => {
    mockChatResponse = '抱歉，我无法解析这段文字。'

    await expect(
      aiParser.parseDailyNarrative('乱七八糟的输入', 'proj-1'),
    ).rejects.toThrow(AIParseError)
  })
})

describe('worker-matcher.service', () => {
  beforeEach(() => {
    mockWorkers = []
  })

  it('d) 教育记录里含 4 个姓名 → 工人匹配服务返回对应 id 或 null', async () => {
    // 预置工人表：3 个匹配，1 个未匹配（赵六不在表里）
    mockWorkers = [
      { id: 'w-001', name: '张三', status: 'active' },
      { id: 'w-002', name: '李四', status: 'active' },
      { id: 'w-003', name: '王五', status: 'active' },
      // 赵六故意不在表里 → 应返回 unmatched
    ] as Worker[]

    const names = ['张三', '李四', '王五', '赵六']
    const result = await matchWorkers(names, 'proj-1')

    expect(result.matched.size).toBe(3)
    expect(result.matched.get('张三')).toBe('w-001')
    expect(result.matched.get('李四')).toBe('w-002')
    expect(result.matched.get('王五')).toBe('w-003')
    expect(result.unmatched).toEqual(['赵六'])
  })

  it('d2) 重复姓名 + 空字符串 → 自动去重去空', async () => {
    mockWorkers = [
      { id: 'w-001', name: '张三', status: 'active' },
    ] as Worker[]

    const names = ['张三', '张三', '', '  ', '李四']
    const result = await matchWorkers(names, 'proj-1')

    // 去重后只剩 ['张三', '李四']
    expect(result.matched.size).toBe(1)
    expect(result.matched.get('张三')).toBe('w-001')
    expect(result.unmatched).toEqual(['李四'])
  })

  it('d3) 空数组 → 返回空结果', async () => {
    const result = await matchWorkers([], 'proj-1')
    expect(result.matched.size).toBe(0)
    expect(result.unmatched).toEqual([])
  })
})

describe('ParsedDailyDataSchema（zod 直接校验）', () => {
  it('完整数据 → 校验通过', () => {
    const data = JSON.parse(VALID_RESPONSE)
    const parsed = ParsedDailyDataSchema.parse(data)
    expect(parsed.dailyLog?.date).toBe('2026-07-13')
  })

  it('仅 dailyLog → 校验通过（其他表可选）', () => {
    const parsed = ParsedDailyDataSchema.parse({
      dailyLog: { date: '2026-07-13' },
    })
    expect(parsed.educationRecords).toBeUndefined()
    expect(parsed.hazards).toBeUndefined()
  })

  it('hazards.level 为非法值 → 校验失败', () => {
    expect(() =>
      ParsedDailyDataSchema.parse({
        hazards: [
          { date: '2026-07-13', title: 'test', level: 'invalid', status: 'pending' },
        ],
      }),
    ).toThrow()
  })
})
