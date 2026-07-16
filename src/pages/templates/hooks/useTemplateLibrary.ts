import { useMemo, useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { templateRepo } from '@/db/repositories/template.repo'
import { categoryRepo } from '@/db/repositories/category.repo'
import type { CategoryRecord } from '@/types'

/** 虚拟"未分类"筛选项的 ID，不对应数据库中的真实分类 */
export const UNCATEGORIZED_ID = '__uncategorized__'

export function useTemplateLibrary() {
  const [keyword, setKeyword] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeCategoryName, setActiveCategoryName] = useState('全部模板')
  const [categories, setCategories] = useState<CategoryRecord[]>([])

  const templates = useLiveQuery(
    () => templateRepo.table.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )

  // 初始加载分类列表（扁平，无子分类），过滤掉数据库中名为"未分类"的真实分类
  useEffect(() => {
    categoryRepo.getChildren(null).then((all) => {
      setCategories(all.filter((c) => c.name !== '未分类'))
    })
  }, [])

  const refreshTree = useCallback(() => {
    categoryRepo.getChildren(null).then((all) => {
      setCategories(all.filter((c) => c.name !== '未分类'))
    })
  }, [])

  // 从 liveQuery 的 templates 数据计算每个分类的模板数量
  const templateCounts = useMemo(() => {
    const counts = new Map<string, number>()
    templates.forEach((t) => {
      if (t.categoryId) {
        counts.set(t.categoryId, (counts.get(t.categoryId) || 0) + 1)
      }
    })
    return counts
  }, [templates])

  // 未分类模板数量（categoryId 为空）
  const uncategorizedCount = useMemo(
    () => templates.filter((t) => !t.categoryId).length,
    [templates],
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim()
    return templates.filter((t) => {
      let matchCat: boolean
      if (activeCategoryId === null) {
        // "全部模板"：显示所有
        matchCat = true
      } else if (activeCategoryId === UNCATEGORIZED_ID) {
        // "未分类"：只显示 categoryId 为空的模板
        matchCat = !t.categoryId
      } else {
        matchCat = t.categoryId === activeCategoryId
      }
      const matchKw =
        !kw ||
        t.name.includes(kw) ||
        (t.description ?? '').includes(kw) ||
        (t.variables?.some((v) => v.includes(kw)) ?? false)
      return matchCat && matchKw
    })
  }, [templates, activeCategoryId, keyword])

  const handleCategorySelect = (id: string | null, name: string) => {
    setActiveCategoryId(id)
    setActiveCategoryName(name ?? '全部模板')
  }

  return {
    templates,
    categories,
    templateCounts,
    uncategorizedCount,
    refreshTree,
    filtered,
    keyword,
    setKeyword,
    activeCategoryId,
    activeCategoryName,
    handleCategorySelect,
  }
}