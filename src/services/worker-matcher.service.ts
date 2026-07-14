import { workerService } from '@/services/workerService'

export interface MatchResult {
  /** 姓名 → workerId 的映射（匹配成功） */
  matched: Map<string, string>
  /** 未匹配的姓名列表 */
  unmatched: string[]
}

/**
 * 工人姓名匹配服务
 * AI 拆解出的姓名需要匹配 workers 表得到 workerId
 *
 * 用法：
 *   const result = await matchWorkers(['张三', '李四'], projectId)
 *   result.matched.get('张三')  // workerId
 *   result.unmatched           // ['李四'] 如果李四不在工人表里
 */
export async function matchWorkers(
  names: string[],
  projectId: string,
): Promise<MatchResult> {
  // 去重 + 去空
  const uniqueNames = Array.from(new Set(names.filter((n) => n && n.trim())))

  if (uniqueNames.length === 0) {
    return { matched: new Map(), unmatched: [] }
  }

  const workers = await workerService.list(projectId)
  const matched = new Map<string, string>()
  const unmatched: string[] = []

  for (const name of uniqueNames) {
    const worker = workers.find((w) => w.name === name)
    if (worker?.id) {
      matched.set(name, worker.id)
    } else {
      unmatched.push(name)
    }
  }

  return { matched, unmatched }
}
