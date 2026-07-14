/**
 * OCR 识别错误
 * 触发条件：置信度 < 60%、语言包未就绪、识别结果解析失败
 * 降级路径：切换到手动填表
 */
export class OCRError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OCRError'
    Object.setPrototypeOf(this, OCRError.prototype)
  }
}

/**
 * AI 解析错误
 * 触发条件：超时、返回格式异常、zod schema 校验失败
 * 降级路径：toast 提示 + 切换到手动填表模式
 */
export class AIParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIParseError'
    Object.setPrototypeOf(this, AIParseError.prototype)
  }
}

/**
 * 工人姓名匹配错误
 * 触发条件：AI 拆解出的姓名在 workers 表找不到对应记录
 * 降级路径：返回 null，UI 提示"工人 XXX 未找到，请确认"
 */
export class MatchError extends Error {
  public readonly unmatchedNames: string[]
  constructor(message: string, unmatchedNames: string[] = []) {
    super(message)
    this.name = 'MatchError'
    this.unmatchedNames = unmatchedNames
    Object.setPrototypeOf(this, MatchError.prototype)
  }
}

