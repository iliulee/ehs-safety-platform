import { dictRepo } from '@/db/repositories'
import { useAppStore } from '@/store'
import type { DictItem, DictCategory } from '@/types'

class DictService {
  async listByCategory(category: DictCategory): Promise<DictItem[]> {
    const items = await dictRepo.find({ category } as Partial<DictItem>)
    return items.filter(i => i.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getAll(): Promise<DictItem[]> {
    return dictRepo.find({ enabled: true } as Partial<DictItem>)
  }

  getLabel(category: DictCategory, code: string): string {
    const items = useAppStore.getState().getDictItems(category)
    return items.find(i => i.code === code)?.label ?? code
  }

  async create(data: Omit<DictItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `dict_${data.category}_${data.code}`
    return dictRepo.addWithId({ ...data, id })
  }

  async update(code: string, category: DictCategory, changes: Partial<DictItem>): Promise<void> {
    const items = await dictRepo.find({ category, code } as Partial<DictItem>)
    if (items.length > 0 && items[0].id) {
      await dictRepo.update(items[0].id, changes)
      await useAppStore.getState().loadDictCache()
    }
  }

  async toggleEnabled(code: string, category: DictCategory): Promise<void> {
    const items = await dictRepo.find({ category, code } as Partial<DictItem>)
    if (items.length > 0 && items[0].id) {
      await dictRepo.update(items[0].id, { enabled: !items[0].enabled })
      await useAppStore.getState().loadDictCache()
    }
  }
}

export const dictService = new DictService()
