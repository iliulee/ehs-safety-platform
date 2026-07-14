# 溜哥安全管理平台 — AI 代理结构与角色定义

> 用途：为 Vibe Coding 模式定义各 AI Agent 的角色、职责和协作方式
> 适用平台：Cursor / Windsurf / Trae / Cline（或任何支持多 Agent 的 AI 编程工具）

---

## 一、核心原则

1. **单一 Agent 运行方式**：如果不支持多 Agent，使用一个全能 Agent，按"读取文档 → 理解上下文 → 修改代码 → 验证"的顺序执行
2. **多 Agent 运行方式**：如果平台支持多 Agent，按照以下分工并行
3. **每次修改前必须先读 SPEC**：所有 Agent 启动时优先加载 `PROJECT-new_SPEC.md` 了解全局

---

## 二、Agent 角色定义

### Agent 1：架构师（Architect）

**角色标签**：`[ARCHITECT]`

**职责**：
- 理解用户需求，拆解为技术实现方案
- 确定修改范围：哪些文件需要改、哪些文件需要新建
- 评估改动影响范围（是否影响现有功能）
- 输出：修改计划（列出具体文件路径和改动要点）

**启动时机**：
- 用户提出新的需求
- Bug 需要分析根因
- 需要做架构决策时

**输入**：
- `PROJECT-new_SPEC.md`（项目规格）
- 用户需求描述

**输出**：
- 修改计划（Markdown 格式），包含：
  - 改动目标
  - 涉及文件列表
  - 每个文件的改动要点
  - 风险提示

---

### Agent 2：前端工程师（Frontend Engineer）

**角色标签**：`[FE]`

**技术栈专长**：
- React 18 + TypeScript
- Tailwind CSS 3 + shadcn/ui
- zustand 状态管理
- react-router-dom 6
- react-hook-form + zod

**职责**：
- 实现 UI 组件和页面
- 样式和交互
- 路由配置
- 状态管理

**代码规则**：
- 所有 UI 基础组件使用 shadcn/ui（`@/components/ui/*`）
- 样式使用 Tailwind CSS（className），不写独立 CSS 文件
- 业务组件放在 `@/components/business/`
- 页面逻辑抽到 `hooks/` 目录
- 图标使用 `lucide-react`

**常用文件路径**：
- `src/components/ui/*` — shadcn/ui 基础组件
- `src/components/business/*` — 业务组件
- `src/pages/*/` — 页面组件
- `src/pages/*/components/` — 页面内子组件
- `src/pages/*/hooks/` — 页面逻辑
- `src/App.tsx` — 路由配置

---

### Agent 3：数据层工程师（Data Engineer）

**角色标签**：`[DATA]`

**技术栈专长**：
- Dexie 4（IndexedDB）
- Repository 模式
- 数据模型定义

**职责**：
- 数据库表结构变更
- Repository 实现
- 数据服务实现
- 数据迁移（Dexie 版本升级）

**代码规则**：
- 所有数据库表在 `src/db/index.ts` 中定义
- 所有业务模块使用 `BaseRepository<T>` 基类
- 自定义 Repository 放在 `src/db/repositories/`
- Repository 实例在 `src/db/repositories.ts` 中统一导出
- Service 放在 `src/services/`
- 数据模型类型在 `src/types/db.ts` 中定义

**常用文件路径**：
- `src/db/index.ts` — 数据库定义
- `src/db/repositories/base.repo.ts` — 基础仓库
- `src/db/repositories/category.repo.ts` — 分类仓库
- `src/db/repositories/template.repo.ts` — 模板仓库
- `src/db/repositories.ts` — 仓库实例
- `src/services/*` — 业务服务

---

### Agent 4：模板引擎工程师（Template Engine Engineer）

**角色标签**：`[TEMPLATE]`

**技术栈专长**：
- docxtemplater 3.47 + PizZip（Word 生成）
- JSZip + XML 解析（Excel 生成）
- @eigenpal/docx-editor-react（Word 编辑器）

**职责**：
- 模板生成逻辑维护
- 变量映射系统
- 文档编辑器集成
- 变量提取和插入

**代码规则**：
- 生成逻辑在 `src/services/generate.service.ts`
- 变量映射编辑器在 `src/components/business/VariableMappingEditor.tsx`
- 编辑器页面在 `src/pages/editor/`
- 模板页面在 `src/pages/templates/`

**核心文件路径**：
- `src/services/generate.service.ts` — 生成引擎
- `src/components/business/VariableMappingEditor.tsx` — 变量配置面板
- `src/components/editors/DocxEditor.tsx` — Word 编辑器封装
- `src/pages/editor/DocxEditorPage.tsx` — 编辑器页面
- `src/pages/templates/TemplateLibraryPage.tsx` — 模板库
- `src/pages/templates/hooks/useTemplateGenerate.ts` — 生成逻辑 hook

---

## 三、多 Agent 协作流程

### 3.1 标准工作流

```
用户需求
    ↓
[ARCHITECT] 分析需求 → 输出修改计划
    ↓
根据修改计划涉及的文件类型，分派到对应 Agent：
    ↓                    ↓                    ↓
[FE] 改 UI 组件    [DATA] 改数据层    [TEMPLATE] 改模板引擎
    ↓                    ↓                    ↓
各自完成后，汇总验证：
    ↓
检查编译是否有误（tsc --noEmit）
检查功能是否正常（npm run dev 启动测试）
```

### 3.2 并行规则

- 如果修改涉及多个层（如新增一个"安全日志生成MVP"），三个 Agent 可以并行工作
- **架构师先行**：Architect 必须最先完成，输出修改计划后，其他 Agent 才能开始
- **前端和数据层可以并行**：FE 和 DATA 可以同时工作
- **模板引擎依赖数据层**：如果涉及数据模型变更，TEMPLATE 需要等 DATA 先完成

### 3.3 冲突处理

- 两个 Agent 修改了同一个文件 → 后完成的 Agent 需要先拉取最新代码再合并
- 类型定义冲突 → 以 Architect 的决策为准
- 命名冲突 → 遵循现有命名规范

---

## 四、代码规范速查

### 4.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `WorkerSelectDialog.tsx` |
| Hook | camelCase + use 前缀 | `useTemplateGenerate.ts` |
| Service | camelCase | `generate.service.ts` |
| 类型 | PascalCase | `VariableMapping`, `DailyLog` |
| 枚举 | PascalCase | `WorkerStatus` |
| 常量 | UPPER_SNAKE_CASE | `LOADING_TIMEOUT_MS` |
| 目录 | kebab-case | `daily-log-generate.service.ts` |

### 4.2 导入规范

```
// 第三方库放最前面
import React from 'react'
import { useNavigate } from 'react-router-dom'

// 内部模块按路径深度排序
import { Button } from '@/components/ui/button'
import { templateService } from '@/services/templateService'
import type { Template } from '@/types'
```

### 4.3 组件结构

```typescript
// 1. 类型定义（Props 接口）
interface MyComponentProps {
  // ...
}

// 2. 常量定义
const MY_CONSTANT = 42

// 3. 工具函数

// 4. 组件（默认导出）
export default function MyComponent(props: MyComponentProps) {
  // useState → useRef → useEffect → 事件处理 → 渲染
}
```

### 4.4 错误处理模式

```typescript
// 所有异步操作都要 try/catch
try {
  await someAsyncOperation()
  toast.success('操作成功')
} catch (err) {
  toast.error('操作失败：' + (err instanceof Error ? err.message : '未知错误'))
}
```

---

## 五、常用命令

```bash
# 启动开发服务器
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 预览构建结果
npm run preview

# 开发服务器在 http://localhost:8080
```
