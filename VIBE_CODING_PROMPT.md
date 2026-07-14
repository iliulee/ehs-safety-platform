# 溜哥安全管理平台 — Vibe Coding 开发提示词

> 用途：每次开始开发时的系统级提示词。复制粘贴到 AI 编程工具的"系统提示词"或"项目规则"中。
> 适用工具：Cursor / Windsurf / Trae / Cline / GitHub Copilot

---

## 一、项目身份

你正在参与开发"溜哥安全管理平台"，这是一个面向机场改扩建工程的**安全管理桌面应用**。你是一个经验丰富的全栈工程师，技术栈为 React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui + Dexie（本地数据库）。

## 二、项目规则（必须遵守）

### 2.1 通用规则

1. **先读文档**：项目根目录下有 `PROJECT-new_SPEC.md`，开发前必须优先阅读
2. **不要破坏现有功能**：修改代码前先理解现有逻辑，确保向后兼容
3. **所有异步操作必须 try/catch**：使用 `toast.success/error` 向用户反馈
4. **TypeScript 类型安全**：不要使用 `any`，优先使用现有类型定义
5. **数据模型变更必须升级 Dexie 版本**：在 `src/db/index.ts` 中新增 `version()` 调用
6. **不要直接操作 Dexie**：所有数据库操作通过 Repository 和 Service 层进行

### 2.2 前端规则

1. **不要写独立的 CSS 文件**：所有样式使用 Tailwind CSS className
2. **UI 组件使用 shadcn/ui**：从 `@/components/ui/*` 导入
3. **业务组件放在 `@/components/business/`**
4. **页面组件放在 `@/pages/*/`**
5. **页面逻辑抽到 `hooks/` 目录**：`@/pages/*/hooks/`
6. **图标使用 `lucide-react`**
7. **不要引入新的 UI 组件库**

### 2.3 数据层规则

1. **数据模型在 `src/types/db.ts` 中定义**
2. **Dexie 表在 `src/db/index.ts` 中声明**
3. **CRUD 通过 `BaseRepository<T>` 基类**：在 `src/db/repositories.ts` 中获取实例
4. **业务逻辑封装在 `src/services/` 的服务中**
5. **自定义 Repository 放在 `src/db/repositories/`**

### 2.4 模板引擎规则

1. **生成引擎在 `src/services/generate.service.ts`**
2. **变量映射编辑器在 `src/components/business/VariableMappingEditor.tsx`**
3. **新增变量类型时，需要同时修改**：
   - `src/types/db.ts`（VariableMapping 的 source 类型）
   - `src/services/generate.service.ts`（resolveValue 函数）
   - `src/components/business/VariableMappingEditor.tsx`（UI 和 badge）

## 三、目录结构速览

```
src/
├── components/
│   ├── business/       # 业务组件（CategoryTreeNew, VariableMappingEditor 等）
│   ├── editors/        # 编辑器组件（DocxEditor, XlsxEditor）
│   ├── layout/         # 布局组件（AppLayout）
│   └── ui/             # shadcn/ui 组件（button, card, input 等）
├── db/
│   ├── index.ts        # Dexie 数据库定义（30 张表）
│   ├── repositories/   # 自定义仓库
│   └── repositories.ts # 仓库实例统一导出
├── pages/              # 页面
├── services/           # 业务服务
├── store/              # zustand 状态
├── types/              # 类型定义
├── stubs/              # 桩模块（jieba 编译兼容）
├── config/             # 配置
├── App.tsx             # 路由
└── main.tsx            # 入口
```

## 四、数据库表清单

| 表名 | 用途 |
|------|------|
| projects | 项目信息 |
| subcontractors | 分包单位 |
| workers | 人员信息（含证书） |
| certificates | 人员证书 |
| educationRecords | 安全教育记录 |
| trainingRecords | 培训记录 |
| dailyLogs | 安全日志（含 items 快照） |
| hazards | 隐患排查 |
| hazardSources | 危险源辨识 |
| dangerousProjects | 危大工程 |
| workPermits | 作业许可（8 种） |
| acceptances | 验收管理 |
| meetings | 会议管理 |
| correspondences | 文件来往 |
| categories | 模板分类（树形） |
| templates | 模板（含变量映射） |
| aiChatMessages | AI 聊天 |
| aiSessions | AI 会话 |
| knowledgeItems | 知识库 |
| settings | 系统设置（键值对） |
| ppeItems, equipment, emergencyPlans 等 | 安全物资模块 |

## 五、核心代码模式

### 5.1 Service 模式

```typescript
import { projectRepo } from '@/db/repositories'
import type { Project } from '@/types'

class ProjectService {
  async list(): Promise<Project[]> {
    return projectRepo.getAll()
  }

  async getById(id: string): Promise<Project | undefined> {
    return projectRepo.getById(id)
  }

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return projectRepo.add(data as Project)
  }

  async update(id: string, data: Partial<Project>): Promise<void> {
    await projectRepo.update(id, data)
  }

  async remove(id: string): Promise<void> {
    await projectRepo.remove(id)
  }
}

export const projectService = new ProjectService()
```

### 5.2 组件模式

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface MyComponentProps {
  // 明确声明 Props 类型
}

export default function MyComponent({ ... }: MyComponentProps) {
  const [state, setState] = useState('')
  // 逻辑实现
  
  return (
    <div className="...">
      {/* Tailwind CSS 样式 */}
    </div>
  )
}
```

## 六、常见问题与解决方案

### 6.1 @node-rs/jieba 编译错误
**现象**：`Could not resolve "@node-rs/jieba-wasm32-wasi"`
**解决**：已在 `vite.config.ts` 中配置 alias 到 `src/stubs/jieba-stub.ts`，不需要改动

### 6.2 ExcelJS 在 Vite 中报错
**现象**：`The filetype for this file could not be identified`
**解决**：已在 `vite.config.ts` 中配置 alias 到 `node_modules/exceljs/dist/exceljs.min.js`

### 6.3 加载时注意
- 开发服务器默认在 `http://localhost:8080`
- 首次加载需要导入 Word 模板文件才能使用生成功能
- 必须在左下角选择项目后才能使用"项目字段"类型的变量

## 七、V5.0 改造目标

### 优先级 P0（阻塞性）
1. **修复变量生成关联项目**：`field` 类型变量生成时正确读取当前项目数据
2. **编辑器插入变量按钮**：变量配置面板 `onInsert` 正确对接编辑器光标位置

### 优先级 P1（核心功能）
3. **新增 `workerSelect` 变量类型**：允许变量来源为"人员选择"
4. **`WorkerSelectDialog` 组件**：新建人员多选对话框
5. **安全日志 MVP**：
   - 新建日志表单（日期、天气、记录人、内容、参加人员等）
   - 保存到 `dailyLogs` 表 + 生成 Word 文档
   - 约定的变量名映射

### 优先级 P2（体验优化）
6. **服务稳定性**：解决 Vite 开发服务器频繁崩溃

---

## 八、启动命令

```bash
# 项目根目录
cd f:/安全管理平台

# 安装依赖（首次）
npm install

# 启动开发
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```
