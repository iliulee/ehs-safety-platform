import MiniSearch from 'minisearch'
import { tokenize } from './tokenizer.adapter'

export { tokenize, ensureTokenizer } from './tokenizer.adapter'

const DEFAULT_FUZZY = 0.2

/**
 * MiniSearch 适配层，封装 MiniSearch 的索引构建和查询接口。
 * 用结巴分词作为 tokenize 函数，对外暴露与 bm25.service 兼容的接口。
 */
export class MiniSearchIndex {
  private index: MiniSearch
  private docs: Map<string, { id: string; content: string; title: string }> = new Map()

  constructor() {
    this.index = new MiniSearch({
      fields: ['content', 'title'],
      storeFields: ['content', 'title'],
      tokenize: (text: string) => tokenize(text),
      searchOptions: {
        boost: { title: 2 },
        fuzzy: DEFAULT_FUZZY,
        prefix: true,
      },
    })
  }

  /** 添加文档到索引 */
  addDoc(id: string, content: string, title?: string): void {
    const doc = { id, content, title: title || '' }
    this.docs.set(id, doc)
    this.index.add(doc)
  }

  /** 从索引中移除文档 */
  removeDoc(id: string): void {
    this.docs.delete(id)
    this.index.discard(id)
  }

  /** BM25 全文检索，返回 Top-K 结果 */
  search(query: string, topK: number = 10): Array<{ id: string; score: number }> {
    if (!query.trim()) return []
    const results = this.index.search(query, {
      prefix: true,
      fuzzy: DEFAULT_FUZZY,
    })
    return results.slice(0, topK).map((r) => ({ id: r.id, score: r.score }))
  }

  /** 搜索建议（自动补全） */
  suggest(query: string, count: number = 5): string[] {
    if (!query.trim()) return []
    return this.index
      .autoSuggest(query, { fuzzy: DEFAULT_FUZZY })
      .slice(0, count)
      .map((s) => s.suggestion)
  }

  /** 清空全部索引 */
  clear(): void {
    this.docs.clear()
    this.index.removeAll()
  }

  /** 索引中的文档数量 */
  get docCount(): number {
    return this.index.documentCount
  }
}