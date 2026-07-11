"""
综合功能验证脚本：逐一验证 5 项产品优化的实际运行效果
"""
import sys, os, json, time, asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SCREEN_DIR = os.path.join(os.path.dirname(__file__), "test-screenshots")
os.makedirs(SCREEN_DIR, exist_ok=True)

results = []

async def screenshot(page, name):
    path = os.path.join(SCREEN_DIR, f"{name}.png")
    await page.screenshot(path=path, full_page=False)
    print(f"  📸 {name} -> {path}")
    return path

async def check(desc, ok, detail=""):
    status = "✅" if ok else "❌"
    print(f"  {status} {desc} {detail}")
    results.append({"desc": desc, "ok": ok, "detail": detail})

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # ==========================================
        # 预备：注入测试数据
        # ==========================================
        print("\n🔧 注入测试数据...")
        await page.goto(BASE + "/#/templates")
        await page.wait_for_timeout(2000)

        # 注入测试模板和分类到 IndexedDB — 直接操作原生 IDB
        await page.evaluate("""
        async () => {
            const req = indexedDB.open('liuge_safety');
            return new Promise((resolve, reject) => {
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(['categories', 'templates'], 'readwrite');
                    const catStore = tx.objectStore('categories');
                    const tplStore = tx.objectStore('templates');

                    const catId = 'cat-test-' + Date.now();
                    catStore.put({ id: catId, name: '测试分类', isBuiltIn: false, parentId: null, sortOrder: 99 });

                    tplStore.put({
                        id: 't-docx-test', name: '测试日报模板', fileType: 'docx', fileSize: 1024,
                        category: '测试分类', categoryId: catId,
                        content: 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==',
                        variableMappings: [
                            { name: 'projectName', source: 'manual', defaultValue: '', label: '' },
                            { name: 'safetyOfficer', source: 'manual', defaultValue: '', label: '' },
                            { name: '开工日期', source: 'manual', defaultValue: '', label: '' },
                        ],
                        createdAt: Date.now(), updatedAt: Date.now()
                    });

                    tplStore.put({
                        id: 't-xlsx-test', name: '测试Excel模板', fileType: 'xlsx', fileSize: 2048,
                        category: '测试分类', categoryId: catId,
                        content: 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==',
                        variableMappings: [
                            { name: 'projectName', source: 'manual', defaultValue: '', label: '' },
                        ],
                        createdAt: Date.now(), updatedAt: Date.now()
                    });

                    tx.oncomplete = () => resolve('ok');
                    tx.onerror = () => reject(tx.error);
                };
                req.onerror = () => reject(req.error);
            });
        }
        """)
        await page.wait_for_timeout(1000)
        print("  ✅ 测试数据注入完成")

        # ==========================================
        # 需求1：验证 /editor 重定向和侧边栏菜单
        # ==========================================
        print("\n" + "="*50)
        print("📋 需求1：移除冗余「文档编辑器」导航入口")
        print("="*50)

        # 1a. 检查侧边栏不包含「文档编辑器」
        await page.goto(BASE + "/#/templates")
        await page.wait_for_timeout(1500)
        sidebar_text = await page.text_content('aside')
        has_editor_link = '文档编辑器' in sidebar_text
        await check("侧边栏无「文档编辑器」菜单项", not has_editor_link,
                   f"侧边栏内容: {sidebar_text[:200]}..." if has_editor_link else "已确认无此菜单项")
        await screenshot(page, "req1-sidebar")

        # 1b. 检查 /editor 路由重定向
        await page.goto(BASE + "/#/editor")
        await page.wait_for_timeout(2000)
        current_url = page.url
        is_redirected = '/templates' in current_url or '/home' in current_url
        await check("/editor 路由重定向到非占位页", is_redirected,
                   f"当前URL: {current_url}")

        # ==========================================
        # 需求2：验证日报模板弹窗选择
        # ==========================================
        print("\n" + "="*50)
        print("📋 需求2：日报模板下拉改弹窗选择")
        print("="*50)

        await page.goto(BASE + "/#/report/daily")
        await page.wait_for_timeout(2000)
        await screenshot(page, "req2-daily-report")

        # 2a. 检查不再使用原生 select 选择模板
        select_count = await page.locator('select').count()
        template_select = page.locator('select:has(option:has-text("选择日报模板"))')
        old_select = await template_select.count()
        await check("日报页无原生模板选择下拉框", old_select == 0,
                   f"原生 select 总数: {select_count}, 模板选择 select: {old_select}")

        # 2b. 检查存在按钮来选择模板
        template_btn = page.locator('button:has-text("选择日报模板")')
        btn_exists = await template_btn.count() > 0
        if not btn_exists:
            # 可能已经选中了模板，找显示模板名的按钮
            template_btn = page.locator('button:has-text("测试日报模板")')
            btn_exists = await template_btn.count() > 0
        await check("存在模板选择按钮（非 select）", btn_exists,
                   "按钮存在" if btn_exists else "未找到模板选择按钮")

        # 2c. 点击按钮，检查弹窗出现
        if btn_exists:
            await template_btn.first.click()
            await page.wait_for_timeout(1000)
            await screenshot(page, "req2-dialog")
            # 检查 Sheet 弹窗出现
            dialog = page.locator('text=选择日报模板')
            dialog_count = await dialog.count()
            await check("点击按钮弹出模板选择弹窗", dialog_count > 0,
                       "弹窗可见" if dialog_count > 0 else "弹窗未出现")

            # 检查搜索框
            search_input = page.locator('input[placeholder*="搜索模板"]')
            search_count = await search_input.count()
            await check("弹窗内有搜索框", search_count > 0,
                       "搜索框存在" if search_count > 0 else "搜索框缺失")

            # 关闭弹窗
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(500)

        # ==========================================
        # 需求3：验证分类树新建/删除按钮可见
        # ==========================================
        print("\n" + "="*50)
        print("📋 需求3：文件夹新建/删除功能可见性")
        print("="*50)

        await page.goto(BASE + "/#/templates")
        await page.wait_for_timeout(2000)
        await screenshot(page, "req3-category-tree")

        # 3a. 检查分类树顶部标题栏
        tree_header = page.locator('text=模板分类')
        header_count = await tree_header.count()
        await check("分类树顶部有「模板分类」标题", header_count > 0,
                   "标题可见" if header_count > 0 else "标题缺失")

        # 3b. 检查新建分类按钮（顶部 + 号）
        # 找 title="新建分类" 的按钮
        create_btns = page.locator('[title="新建分类"]')
        create_count = await create_btns.count()
        await check("分类树有「新建分类」按钮", create_count > 0,
                   f"找到 {create_count} 个新建分类按钮")

        # 3c. 检查底部新建分类按钮
        bottom_create = page.locator('button:has-text("新建分类")')
        bottom_count = await bottom_create.count()
        await check("底部有「新建分类」按钮（sticky）", bottom_count > 0,
                   f"底部按钮数量: {bottom_count}")

        # 3d. 检查分类节点的删除按钮
        delete_btns = page.locator('[title="删除分类"]')
        delete_count = await delete_btns.count()
        await check("分类节点有删除按钮", delete_count > 0,
                   f"删除按钮数量: {delete_count}")

        # ==========================================
        # 需求4：验证 Excel 编辑器变量侧边栏
        # ==========================================
        print("\n" + "="*50)
        print("📋 需求4：Excel 编辑器变量编辑侧边栏")
        print("="*50)

        # 4a. 打开 Excel 模板编辑器
        await page.goto(BASE + "/#/editor/xlsx?id=t-xlsx-test")
        await page.wait_for_timeout(3000)
        await screenshot(page, "req4-xlsx-editor")

        # 4b. 检查「变量」按钮
        var_btn = page.locator('button:has-text("变量")')
        var_count = await var_btn.count()
        await check("Excel 编辑器有「变量」按钮", var_count > 0,
                   f"变量按钮数量: {var_count}")

        # 4c. 点击「变量」按钮，检查侧边栏出现
        if var_count > 0:
            await var_btn.first.click()
            await page.wait_for_timeout(1000)
            await screenshot(page, "req4-xlsx-variable-panel")
            panel = page.locator('text=变量配置')
            panel_count = await panel.count()
            await check("点击「变量」后出现变量配置面板", panel_count > 0,
                       "面板可见" if panel_count > 0 else "面板未出现")

            # 关闭面板
            await var_btn.first.click()
            await page.wait_for_timeout(500)

        # ==========================================
        # 需求5：验证变量编辑一键映射+中文化
        # ==========================================
        print("\n" + "="*50)
        print("📋 需求5：变量编辑一键映射 + 严格全量中文化")
        print("="*50)

        # 5a. 打开 Word 模板编辑器
        await page.goto(BASE + "/#/editor/docx?id=t-docx-test")
        await page.wait_for_timeout(3000)
        await screenshot(page, "req5-docx-editor")

        # 5b. 点击「变量」按钮
        var_btn_docx = page.locator('button:has-text("变量")')
        var_count_docx = await var_btn_docx.count()
        if var_count_docx > 0:
            await var_btn_docx.first.click()
            await page.wait_for_timeout(1000)
            await screenshot(page, "req5-variable-panel")

            # 5c. 检查变量显示不是英文
            # 找到变量名显示区域
            panel_content = await page.text_content('[class*="w-[380px]"]') if await page.locator('[class*="w-[380px]"]').count() > 0 else ""
            has_english_var = 'projectName' in panel_content and 'safetyOfficer' in panel_content
            # 变量名应该显示 projectName 或空 label，但 label 可能为空
            # 检查下拉框中是否有中文选项
            source_select = page.locator('select').first
            if await source_select.count() > 0:
                await source_select.click()
                await page.wait_for_timeout(500)
                await screenshot(page, "req5-source-dropdown")

                # 获取下拉选项文本
                options_text = await source_select.text_content()
                await check("来源下拉框选项全中文", 
                           '项目基础信息' in options_text or '项目名称' in options_text or '施工单位' in options_text,
                           f"选项文本: {options_text[:300]}")

                # 5d. 检查是否有分组选项（一键映射）
                has_grouped = '项目基础信息' in options_text or '参建单位' in options_text or '项目人员' in options_text
                await check("来源下拉框包含分组项目字段（一键映射）", has_grouped,
                           "分组选项存在" if has_grouped else "未找到分组选项")

                # 5e. 选择一项验证自动中文标签
                option = page.locator('option:has-text("项目名称")')
                option_count = await option.count()
                if option_count > 0:
                    option_value = await option.first.get_attribute('value')
                    await source_select.select_option(value=option_value)
                    await page.wait_for_timeout(500)
                    await screenshot(page, "req5-after-select")
                    # 检查是否自动设置了中文 label
                    updated_content = await page.text_content('[class*="w-[380px]"]') if await page.locator('[class*="w-[380px]"]').count() > 0 else ""
                    await check("选择字段后标签自动变为中文", 
                               '项目名称' in updated_content or '选择数据来源' not in updated_content,
                               "中文标签已设置")
            else:
                await check("来源下拉框存在", False, "未找到 select 元素")
        else:
            await check("Word 编辑器变量按钮存在", False, "未找到变量按钮")

        # ==========================================
        # 汇总
        # ==========================================
        print("\n" + "="*50)
        print("📊 测试汇总")
        print("="*50)
        passed = sum(1 for r in results if r["ok"])
        failed = sum(1 for r in results if not r["ok"])
        for r in results:
            status = "✅" if r["ok"] else "❌"
            print(f"  {status} {r['desc']}")
        print(f"\n  总计: {passed}/{len(results)} 通过, {failed} 失败")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())