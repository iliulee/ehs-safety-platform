export { tokenize } from './tokenizer.adapter'

export interface BM25Doc {
  id: string
  tokens: string[]
  length: number
}

const K1 = 1.5
const B = 0.75

export class BM25Searcher {
  private docs: Map<string, BM25Doc> = new Map()
  private df: Map<string, number> = new Map()
  private totalDocs = 0
  private dirty = true
  private cachedAvgdl = 0

  addDoc(id: string, tokens: string[]): void {
    const doc: BM25Doc = {
      id,
      tokens: [...tokens],
      length: tokens.length,
    }
    this.docs.set(id, doc)
    this.dirty = true
  }

  removeDoc(id: string): void {
    const doc = this.docs.get(id)
    if (!doc) return
    const uniqueTokens = new Set(doc.tokens)
    for (const t of uniqueTokens) {
      const count = this.df.get(t)
      if (count !== undefined) {
        if (count <= 1) this.df.delete(t)
        else this.df.set(t, count - 1)
      }
    }
    this.docs.delete(id)
    this.dirty = true
  }

  private recomputeStats(): void {
    if (!this.dirty) return
    this.df.clear()
    let totalLen = 0
    this.totalDocs = this.docs.size

    for (const doc of this.docs.values()) {
      totalLen += doc.length
      const uniqueTokens = new Set(doc.tokens)
      for (const t of uniqueTokens) {
        this.df.set(t, (this.df.get(t) ?? 0) + 1)
      }
    }
    this.cachedAvgdl = this.totalDocs > 0 ? totalLen / this.totalDocs : 1
    this.dirty = false
  }

  search(queryTokens: string[], topK: number = 10): Array<{ id: string; score: number }> {
    this.recomputeStats()
    if (this.totalDocs === 0 || queryTokens.length === 0) return []

    const results: Array<{ id: string; score: number }> = []
    const avgdl = this.cachedAvgdl

    const candidateDocIds = new Set<string>()
    for (const qt of queryTokens) {
      for (const doc of this.docs.values()) {
        if (doc.tokens.includes(qt)) {
          candidateDocIds.add(doc.id)
        }
      }
    }

    for (const docId of candidateDocIds) {
      const doc = this.docs.get(docId)!
      let score = 0
      const tf = new Map<string, number>()
      for (const t of doc.tokens) {
        tf.set(t, (tf.get(t) ?? 0) + 1)
      }

      for (const qt of queryTokens) {
        const f = tf.get(qt) ?? 0
        if (f === 0) continue
        const n = this.df.get(qt) ?? 0
        const idf = Math.log((this.totalDocs - n + 0.5) / (n + 0.5) + 1)
        const tfScore = (f * (K1 + 1)) / (f + K1 * (1 - B + B * doc.length / avgdl))
        score += idf * tfScore
      }

      if (score > 0) {
        results.push({ id: docId, score })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  clear(): void {
    this.docs.clear()
    this.df.clear()
    this.totalDocs = 0
    this.cachedAvgdl = 0
    this.dirty = true
  }

  get docCount(): number {
    return this.docs.size
  }
}
