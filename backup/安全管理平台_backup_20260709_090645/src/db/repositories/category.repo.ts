import { BaseRepository, db, generateId } from './base.repo'
import type { CategoryRecord } from '@/types'

export interface CategoryNode extends CategoryRecord {
  children: CategoryNode[]
}

export class CategoryRepo extends BaseRepository<CategoryRecord> {
  constructor() {
    super(db.categories)
  }

  async getByCode(code: string): Promise<CategoryRecord | undefined> {
    return this.table.where('code').equals(code).first()
  }

  async getChildren(parentId: string | null): Promise<CategoryRecord[]> {
    // IndexedDB 不支持 null 作为索引 key，改为全量读取后内存过滤
    const all = await this.table.toArray()
    return all
      .filter((c) => (c.parentId ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getBuiltIns(): Promise<CategoryRecord[]> {
    return this.table.where('isBuiltIn').equals(1).sortBy('sortOrder')
  }

  async getTree(): Promise<CategoryNode[]> {
    // IndexedDB 复合索引会跳过 null 值，故先全量读取再内存排序
    const all = await this.table.toArray()
    const sorted = all.sort((a, b) => {
      const pa = a.parentId ?? ''
      const pb = b.parentId ?? ''
      if (pa !== pb) return pa.localeCompare(pb)
      return a.sortOrder - b.sortOrder
    })
    const map = new Map<string | null, CategoryRecord[]>()

    sorted.forEach((item) => {
      const key = item.parentId ?? null
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    })

    const build = (parentId: string | null): CategoryNode[] => {
      const list = map.get(parentId) ?? []
      return list.map((item) => ({
        ...item,
        children: build(item.id!),
      }))
    }

    return build(null)
  }

  async createCustom(
    name: string,
    parentId: string | null,
    options?: Partial<Omit<CategoryRecord, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<string> {
    const siblings = await this.getChildren(parentId)
    const sortOrder = options?.sortOrder ?? siblings.length + 1
    return this.add({
      code: generateId(),
      name,
      parentId: parentId ?? null,
      sortOrder,
      icon: options?.icon,
      isBuiltIn: false,
      description: options?.description,
    })
  }

  async updateName(id: string, name: string): Promise<void> {
    return this.update(id, { name } as Partial<CategoryRecord>)
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    return this.update(id, { sortOrder } as Partial<CategoryRecord>)
  }

  async canDelete(id: string): Promise<{ ok: boolean; reason?: string; count?: number }> {
    const item = await this.getById(id)
    if (!item) return { ok: false, reason: '分类不存在' }
    const templates = await db.templates.where('categoryId').equals(id).count()
    const children = await this.getChildren(id)
    return {
      ok: true,
      reason: children.length > 0 || templates > 0
        ? `该分类包含 ${children.length} 个子分类、${templates} 个模板，删除后将一并清除`
        : undefined,
      count: templates,
    }
  }

  async collectDescendantIds(id: string): Promise<string[]> {
    const result: string[] = [id]
    const children = await this.getChildren(id)
    for (const child of children) {
      if (child.id) {
        result.push(...(await this.collectDescendantIds(child.id)))
      }
    }
    return result
  }

  async removeWithCascade(id: string): Promise<{ categories: number; templates: number }> {
    const ids = await this.collectDescendantIds(id)
    const templates = await db.templates.where('categoryId').anyOf(ids).toArray()
    const templateIds = templates.map((t) => t.id!).filter(Boolean)

    await db.transaction('rw', [db.categories, db.templates], async () => {
      await db.templates.bulkDelete(templateIds)
      await db.categories.bulkDelete(ids)
    })

    return { categories: ids.length, templates: templateIds.length }
  }
}

export const categoryRepo = new CategoryRepo()
