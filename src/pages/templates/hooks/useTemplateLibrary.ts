import { useMemo, useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { templateRepo } from '@/db/repositories/template.repo'
import { categoryRepo, type CategoryNode } from '@/db/repositories/category.repo'

export function useTemplateLibrary() {
  const [keyword, setKeyword] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeCategoryName, setActiveCategoryName] = useState('全部模板')
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])

  const templates = useLiveQuery(
    () => templateRepo.table.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )

  // 初始加载分类树
  useEffect(() => {
    categoryRepo.getTree().then(setCategoryTree)
  }, [])

  // 直接调用 getTree + setCategoryTree，消除 treeVersion → useEffect 两跳异步链路
  const refreshTree = useCallback(() => {
    categoryRepo.getTree().then(setCategoryTree)
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

  const descendantIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const walk = (node: CategoryNode) => {
      const ids = new Set<string>([node.id!])
      for (const child of node.children) {
        walk(child)
        ids.add(child.id!)
        const childIds = map.get(child.id!)
        if (childIds) {
          childIds.forEach((id) => ids.add(id))
        }
      }
      map.set(node.id!, ids)
    }
    for (const root of categoryTree) walk(root)
    return map
  }, [categoryTree])

  const filtered = useMemo(() => {
    const allowedIds = activeCategoryId
      ? (descendantIdMap.get(activeCategoryId) ?? new Set([activeCategoryId]))
      : null
    const kw = keyword.trim()
    return templates.filter((t) => {
      const matchCat =
        activeCategoryId === null ||
        (t.categoryId && allowedIds?.has(t.categoryId))
      const matchKw =
        !kw ||
        t.name.includes(kw) ||
        (t.description ?? '').includes(kw) ||
        (t.variables?.some((v) => v.includes(kw)) ?? false)
      return matchCat && matchKw
    })
  }, [templates, activeCategoryId, keyword, descendantIdMap])

  const handleCategorySelect = (id: string | null, name: string) => {
    setActiveCategoryId(id)
    setActiveCategoryName(name ?? '全部模板')
  }

  return {
    templates,
    categoryTree,
    templateCounts,
    refreshTree,
    filtered,
    keyword,
    setKeyword,
    activeCategoryId,
    activeCategoryName,
    handleCategorySelect,
  }
}
