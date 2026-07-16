# 任务：AI 拆解后自动写表（Demo 应急，1 小时必须交付）

## 背景
今晚 23 点前要交 demo。当前 AI 拆解能跑通，但拆解后数据只进表单，
不点"生成日报"就写不进业务表。Demo 时演示"AI 拆解 → 数据可见"缺最后一公里。

## 范围（只动 1 个文件）
`src/pages/report/components/AiParseDialog.tsx`

## 需求（砍掉 D-2 / D-3，只做 D-1）
在弹窗底部 footer 加一个新按钮：**「直接保存到业务表」**
- 位置：在"应用到表单"按钮**旁边**
- 文案："直接保存"
- 颜色：amber 警告色
- 行为：点击后立即把 result.hazards / result.educationRecords / result.penalties
  写到对应业务表，弹 toast 提示，关闭弹窗

## 实现要点

### 1. import 新增 service
```typescript
import { hazardService } from '@/services/hazardService'
import { educationService } from '@/services/educationService'
import { penaltyService } from '@/services/penaltyService'
import { getCurrentProjectId } from '@/store'
```

### 2. handleSaveDirect 函数
```typescript
const handleSaveDirect = async () => {
  if (!result) return
  const projectId = getCurrentProjectId()
  let hazardCount = 0
  let eduCount = 0
  let penaltyCount = 0

  // 隐患
  if (result.hazards) {
    for (const h of result.hazards) {
      await hazardService.create({
        title: h.title,
        description: h.location ?? '',
        level: h.level as any,
        status: (h.status ?? 'pending') as any,
        projectId,
        source: 'ai',
      } as any)
      hazardCount++
    }
  }

  // 教育
  if (result.educationRecords) {
    for (const e of result.educationRecords) {
      await educationService.create({
        projectId,
        title: e.topic,
        type: '三级教育',
        date: e.date || new Date().toISOString().split('T')[0],
        attendeeIds: [],
        content: e.topic,
      } as any)
      eduCount++
    }
  }

  // 处罚
  if (result.penalties) {
    for (const p of result.penalties) {
      await penaltyService.create({
        projectId,
        date: p.date || new Date().toISOString().split('T')[0],
        unit: p.targetName,
        amount: p.amount || 0,
        reason: p.reason,
        status: 'pending',
      })
      penaltyCount++
    }
  }

  toast.success(`已保存：${hazardCount} 条隐患 / ${eduCount} 场教育 / ${penaltyCount} 条处罚`)

  // 重置 + 关闭
  setText('')
  setResult(null)
  setError(null)
  onClose()
}
```

### 3. footer 改：3 个按钮
```tsx
footer={
  <>
    <Button variant="outline" onClick={handleClose}>取消</Button>
    {!result ? (
      <Button onClick={handleParse} disabled={loading || !text.trim()}>
        {loading ? '拆解中...' : '开始拆解'}
      </Button>
    ) : (
      <>
        <Button variant="outline" onClick={handleApply}>
          <Wand2 className="w-4 h-4 mr-1" />
          应用到表单
        </Button>
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={handleSaveDirect}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          直接保存
        </Button>
      </>
    )}
  </>
}
```

## 严禁
- ❌ 不要改 schema
- ❌ 不要改 ai-parser.service.ts
- ❌ 不要改 ai.service.ts
- ❌ 不要改 DailyReportPage.tsx
- ❌ 不要碰 D-2（弹窗显示完善）/ D-3（拆解历史）—— demo 后再说

## 门禁
1. `npx tsc --noEmit` 零错误
2. `npx vite build` 通过（必要时 `NODE_OPTIONS='--max-old-space-size=4096' npx vite build`）
3. diff 只在 AiParseDialog.tsx

## 验证（人工，5 分钟）
- 启动 dev server
- 进日报页 → 点"AI 拆解" → 输入文字：
  "今天发现 2 号塔吊周边护栏缺失，张三李四王五参加安全教育，对木工班罚款 200 元未戴安全帽"
- 点"开始拆解" → 看到弹窗显示拆解结果
- 点"直接保存" → toast 提示已保存数量 → 弹窗关闭
- 进隐患排查/安全教育/违章处罚 三个页查数据是否入库

## 交付
- 单独 commit：`feat: AI 拆解直接保存到业务表（demo 应急）`
- 给我 commit hash + diff + 门禁结果
- 必须 30 分钟内完成（demo 时间紧）
