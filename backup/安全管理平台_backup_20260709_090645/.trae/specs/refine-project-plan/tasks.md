# Tasks

## 已完成

- [x] Task 0: 28 模块功能测试全部通过（Playwright 自动化测试验证）
- [x] Task 0.1: 异步任务 UX 规范验证（扫描进度、批量生成、AI 调用均满足三要素）
- [x] Task 0.2: 功能开关全部开启实测通过（21 个开关全开，仅 4 个未开发模块关闭）

- [x] Task 1: 更新 PROJECT_SPEC.md 中与实际代码不一致的描述
  - [x] 修正 features.ts 功能开关配置：同步为实际代码中的 FeatureFlags 接口和值
  - [x] 更新 MVP 第一期各模块状态：`🔄` → `✅`（已完成测试）
  - [x] 更新第二期模块状态：标记为已完成，注明 Playwright 测试验证通过
  - [x] 更新第三期模块状态：标记为已完成，补充未开发 4 个模块的远期规划说明
  - [x] 安全日志字段标签（施工内容、安全措施落实情况）已在第二期表中体现
  - [x] 隐患排查提交按钮"提交"、作业许可标题"作业票"、收发文标题"收发文"已与代码一致

- [x] Task 2: 更新 features.ts 功能开关默认值
  - [x] 无需操作：features.ts 当前所有开关已为 `true`，与 spec 描述一致
  - [x] `npx tsc --noEmit` 通过（0 错误）

- [x] Task 3: 清理测试残留
  - [x] 删除 `scripts/mvp-test-suite.py`
  - [x] 删除 `test-shots/`（含所有截图）
  - [x] 删除 `test_template.docx`
  - [x] 删除 `test-templates/`（含子目录）

- [x] Task 4: 未开发模块评估
  - [x] ppeManagement：`src/pages/ppe/` 无页面文件
  - [x] equipmentManagement：`src/` 中无相关代码
  - [x] emergencyManagement：`src/pages/emergency/` 无页面文件
  - [x] accidentManagement：`src/pages/accidents/` 无页面文件
  - [x] 结论：四个模块均为远期规划，已标记在 PROJECT_SPEC.md 第三期末尾

# Task Dependencies

所有任务已完成，无剩余依赖。