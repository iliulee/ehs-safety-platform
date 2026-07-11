import { BaseRepository, db } from './base.repo'
import type { Template, VariableMapping } from '@/types'

export class TemplateRepo extends BaseRepository<Template> {
  constructor() {
    super(db.templates)
  }

  async getByCategoryId(categoryId: string): Promise<Template[]> {
    return this.table.where('categoryId').equals(categoryId).sortBy('createdAt')
  }

  async searchByName(keyword: string): Promise<Template[]> {
    const lower = keyword.toLowerCase()
    const all = await this.getAll()
    return all.filter((t) => t.name.toLowerCase().includes(lower))
  }

  async checkDuplicate(
    name: string,
    fileSize: number | undefined,
    categoryId: string,
    excludeId?: string,
  ): Promise<boolean> {
    // 复合索引在字段为 undefined 时会跳过记录，改为内存过滤更可靠
    const all = await this.table.toArray()
    const candidates = all.filter(
      (t) =>
        t.name === name &&
        (t.fileSize ?? 0) === (fileSize ?? 0) &&
        (t.categoryId ?? '') === (categoryId ?? ''),
    )
    if (excludeId) {
      return candidates.some((t) => t.id !== excludeId)
    }
    return candidates.length > 0
  }

  async updateVariableMappings(
    id: string,
    mappings: VariableMapping[],
  ): Promise<void> {
    const variables = mappings.map((m) => m.name)
    return this.update(id, {
      variables,
      variableMappings: mappings,
    } as Partial<Template>)
  }
}

export const templateRepo = new TemplateRepo()
