# 任务：开源前清理 + 写 README

## 1. 清理 .gitignore
确保 f:\安全管理平台\.gitignore 包含：
```
node_modules/
dist/
data/
backup/
.vite/
*.log
.DS_Store
.env
.env.local
```

## 2. 验证 data/ backup/ 没在 git
```bash
cd 'f:\安全管理平台'
git ls-files | grep -E '^(data|backup)/'
```
应该没输出。如果有，git rm --cached 移除。

## 3. 写 README.md（中文，简洁）
- 标题 + 一句话定位
- 4 个核心模块（工人/设备/隐患/AI 拆解）
- 技术栈表
- 快速开始（npm install / npm run dev）
- 3 个阶段迭代故事（v4.1.3 → v5.0 → v5.0.2）
- 已知 3 个 bug（标 v5.1 修复）
- MIT 许可证

## 4. 跑门禁
```bash
cd 'f:\安全管理平台'
npx tsc --noEmit
```
零错误。

## 交付
- 给我：README.md 全文 + tsc 输出
- 不要超过 250 行
