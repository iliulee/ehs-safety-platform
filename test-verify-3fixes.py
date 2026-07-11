"""
验证 v4.1.3 三个问题修复：
1. Word 首次加载无限 loading
2. 插入变量不可用
3. 默认值框显示不全+作用不明确
"""
import os, time, asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SCREEN_DIR = os.path.join(os.path.dirname(__file__), "test-screenshots")
os.makedirs(SCREEN_DIR, exist_ok=True)

results = []

async def screenshot(page, name):
    path = os.path.join(SCREEN_DIR, f"fix3_{name}.png")
    await page.screenshot(path=path, full_page=False)
    print(f"  📸 {name}")
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

        # 导航到 Word 编辑器，检查首次加载是否完成
        print("\n🔍 测试 1：Word 首次加载不再无限加载")
        await page.goto(BASE + "/#/editor/docx?id=t-docx-v2")
        await page.wait_for_timeout(3000)
        # 检查 loading 是否还存在
        loading_elements = page.locator('text=正在加载 Word 编辑器')
        loading_count = await loading_elements.count()
        await check("Word 首次加载完成（无无限 loading）", loading_count == 0,
                   f"loading元素数量: {loading_count}" if loading_count > 0 else "已完成加载")
        await screenshot(page, "word-loaded")

        # 检查变量面板布局
        print("\n🔍 测试 2：默认值框显示完整+作用清晰")
        var_btn = page.locator('button:has-text("变量")')
        if await var_btn.count() > 0:
            await var_btn.first.click()
            await page.wait_for_timeout(1000)
            await screenshot(page, "variable-layout")
            # 检查是否有 label 说明
            has_label = await page.locator('text=默认值（生成时自动填入）').count() > 0
            await check("默认值输入框有清晰标签说明", has_label,
                       "标签已添加" if has_label else "缺失标签说明")
            # 检查布局宽度
            has_larger_default = "col-span-4" in await page.locator('.grid > div').first.locator('..').inner_html()
            await check("默认值框宽度扩大（col-span-4）", has_larger_default,
                       "宽度已扩大" if has_larger_default else "宽度仍较小")
        else:
            await check("变量按钮存在", False, "未找到变量按钮")

        # 测试插入变量
        print("\n🔍 测试 3：插入变量到文档")
        # 在编辑器获得焦点后点击插入
        insert_btn = page.locator('[title="插入到文档光标位置"]')
        insert_count = await insert_btn.count()
        await check("变量行有插入按钮", insert_count > 0,
                   f"插入按钮数量: {insert_count}" if insert_count > 0 else "无插入按钮")
        if insert_count > 0:
            # 点击插入第一个变量
            await insert_btn.first.click()
            # 检查编辑器内容是否有 {{xxx}}
            await page.wait_for_timeout(500)
            doc_html = await page.innerHtml('.docx-editor-container')
            has_var = '{{' in doc_html
            await check("点击插入后文档中有 {{变量}}", has_var,
                       "插入成功" if has_var else "文档中未见变量")

        # 测试添加变量
        print("\n🔍 测试 4：添加新变量")
        add_btn = page.locator('button:has-text("添加变量")')
        add_count = await add_btn.count()
        await check("面板顶部有「添加变量」按钮", add_count > 0,
                   f"添加按钮数量: {add_count}" if add_count > 0 else "无添加按钮")
        if add_count > 0:
            before_count = await page.locator('[data-variable-row]').count() if await page.locator('[data-variable-row]').count() else 0
            await add_btn.first.click()
            await page.wait_for_timeout(500)
            after_count = await page.locator('input[placeholder="变量名"]').count()
            await check("点击添加后新增一行变量", after_count > (before_count or 0),
                       f"新增了 {after_count - (before_count or 0)} 行" if after_count > (before_count or 0) else "未新增行")
            await screenshot(page, "added-variable")

        # 删除测试
        print("\n🔍 测试 5：删除变量")
        delete_btn = page.locator('[title="删除此变量"]')
        delete_before = await delete_btn.count()
        if delete_before > 0:
            await delete_btn.first.click()
            await page.wait_for_timeout(200)
            delete_after = await delete_btn.count()
            await check("点击删除后变量行被移除", delete_after < delete_before,
                       f"删除后行数从 {delete_before} → {delete_after}" if delete_after < delete_before else "行数未减少")

        # 汇总
        print("\n" + "="*50)
        print("📊 验证结果")
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
