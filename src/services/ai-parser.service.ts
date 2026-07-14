import { z } from 'zod'
import { aiService } from '@/services/ai.service'
import { AIParseError } from '@/types/errors'

// re-export 工人匹配服务，方便调用方一站式导入
export { matchWorkers, type MatchResult } from '@/services/worker-matcher.service'

/**
 * AI 文字拆解 Schema（覆盖 6 张表）
 * 规格来源：PROJECT-SPEC-v5.md §6.1
 */
export const ParsedDailyDataSchema = z.object({
  dailyLog: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weather: z.enum(['晴', '多云', '阴', '雨', '雪', '雾']).optional(),
    temperature: z.number().min(-30).max(50).optional(),
    workContent: z.string().optional(),
    safetyMeasures: z.string().optional(),
    issues: z.string().optional(),
  }).optional(),

  dangerousProjects: z.array(z.object({
    category: z.string(),
    isOperating: z.boolean(),
    notes: z.string().optional(),
  })).optional(),

  educationRecords: z.array(z.object({
    date: z.string(),
    topic: z.string(),
    attendeeNames: z.array(z.string()),
  })).optional(),

  hazards: z.array(z.object({
    date: z.string(),
    title: z.string(),
    level: z.enum(['general', 'major', 'critical']),
    location: z.string().optional(),
    status: z.enum(['pending', 'rectifying', 'closed']),
  })).optional(),

  acceptances: z.array(z.object({
    date: z.string(),
    type: z.string(),
    equipmentCode: z.string().optional(),
    // v5.0 Day 2 收尾：同步 Equipment 新增字段（验收记录可关联设备铭牌信息）
    equipmentName: z.string().optional(),
    equipmentModel: z.string().optional(),
    equipmentCode2: z.string().optional(),
    equipmentManufacturer: z.string().optional(),
    equipmentManufactureLicense: z.string().optional(),
    equipmentRatedTorque: z.string().optional(),
  })).optional(),

  penalties: z.array(z.object({
    date: z.string(),
    targetName: z.string(),
    reason: z.string(),
    amount: z.number().optional(),
  })).optional(),
})

export type ParsedDailyData = z.infer<typeof ParsedDailyDataSchema>

/** AI 解析超时时间（规格 §6.5：30 秒） */
const AI_TIMEOUT_MS = 30000

/**
 * 构建 DeepSeek prompt（规格 §6.2）
 */
function buildPrompt(userInput: string): string {
  return `你是机场改扩建工程的安全助手。读以下工地安全员口述的文字，提取结构化信息。

【文字】
${userInput}

【要求】
- 严格按照 JSON 格式返回，不要任何解释
- 日期格式：YYYY-MM-DD
- 姓名：仅保留中文姓名
- 隐患等级：general(一般) / major(较大) / critical(重大)
- 隐患状态：pending(待整改) / rectifying(整改中) / closed(已关闭)
- 天气：晴/多云/阴/雨/雪/雾 之一
- 温度：数字，无单位`
}

class AiParserService {
  /**
   * 解析安全员口述文字 → 结构化数据
   * 规格 §6.5：30 秒超时，不自动重试，失败提示用户手动重试
   *
   * @param text 安全员口述文字
   * @param _projectId 项目 ID（预留，后续可注入项目上下文给 AI）
   * @throws AIParseError 超时或返回格式异常
   */
  async parseDailyNarrative(text: string, _projectId: string): Promise<ParsedDailyData> {
    if (!text.trim()) {
      throw new AIParseError('请输入待拆解的文字')
    }

    const configured = await aiService.isConfigured()
    if (!configured) {
      throw new AIParseError('请先在设置中配置 DeepSeek API Key')
    }

    const prompt = buildPrompt(text)
    const messages = [
      { role: 'system' as const, content: prompt },
      { role: 'user' as const, content: text },
    ]

    const parsePromise = (async (): Promise<ParsedDailyData> => {
      const response = await aiService.chat(messages)
      try {
        // 兼容 AI 返回带 markdown 代码块包裹的情况
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : response
        const parsed = JSON.parse(jsonStr)
        return ParsedDailyDataSchema.parse(parsed)
      } catch (err) {
        if (err instanceof z.ZodError) {
          throw new AIParseError(`AI 返回格式异常：${err.message}`)
        }
        throw new AIParseError('AI 返回格式异常，请重试或手动填表')
      }
    })()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new AIParseError('AI 解析超时，请检查网络后重试')),
        AI_TIMEOUT_MS,
      )
    })

    return Promise.race([parsePromise, timeoutPromise])
  }
}

export const aiParser = new AiParserService()
