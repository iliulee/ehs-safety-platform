"""
快速验证 v4.1.3 修复
"""
import os, time, asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SCREEN_DIR = os.path.join(os.path.dirname(__file__), "test-screenshots")
os.makedirs(SCREEN_DIR, exist_ok=True)
results = []

async def screenshot(page, name):
    path = os.path.join(SCREEN_DIR, f"v413_{name}.png")
    await page.screenshot(path=path, full_page=False)
    print(f"  📸 {name}")
    return path

async def check(desc, ok, detail=""):
    s = "✅" if ok else "❌"
    print(f"  {s} {desc} {detail}")
    results.append({"desc": desc, "ok": ok, "detail": detail})

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # 注入测试数据
        await page.goto(BASE + "/#/templates")
        await page.wait_for_timeout(1500)
        await page.evaluate("""
        async () => {
            const req = indexedDB.open('liuge_safety');
            return new Promise((resolve) => {
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(['categories', 'templates'], 'readwrite');
                    const catStore = tx.objectStore('categories');
                    const tplStore = tx.objectStore('templates');
                    const catId = 'cat-fix-' + Date.now();
                    catStore.put({ id: catId, name: '修复测试分类', isBuiltIn: false, parentId: null, sortOrder: 99 });
                    tplStore.put({
                        id: 't-fix-test', name: '修复测试模板', fileType: 'docx', fileSize: 1024,
                        category: '修复测试分类', categoryId: catId,
                        content: 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==',
                        variableMappings: [
                            { name: 'projectName', source: 'manual', defaultValue: '', label: '' },
                            { name: 'safetyOfficer', source: 'manual', defaultValue: '', label: '' },
                        ],
                        createdAt: Date.now(), updatedAt: Date.now()
                    });
                    tx.oncomplete = () => resolve('ok');
                };
            });
        }
        """)
        await page.wait_for_timeout(1000)

        # 测试 1：加载
        print("\n🔍 1. Word 加载")
        await page.goto(BASE + "/#/templates")
        await page.wait_for_timeout(1000)
        await page.goto(BASE + "/#/editor/docx?id=t-fix-test")
        await page.wait_for_timeout(3000)
        await screenshot(page, "loading")
        loading = await page.locator('text=正在加载 Word 编辑器').count()
        await check("首次加载完成（无无限 loading）", loading == 0)

        # 测试 2：变量面板
        print("\n🔍 2. 变量面板")
        # 打印所有按钮文本以调试
        buttons = await page.locator('button').all_text_contents()
        print(f"  页面按钮: {[b for b in buttons if b][:10]}")
        var_btn = page.locator('button:has-text("变量")')
        cnt = await var_btn.count()
        if cnt > 0:
            await var_btn.first.click()
            await page.wait_for_timeout(1000)
            await screenshot(page, "panel")
            # 检查标签
            has_lbl = await page.locator('text=默认值（生成时自动填入）').count() > 0
            await check("默认值标签清晰", has_lbl)
            # 检查插入按钮
            ins = await page.locator('[title="插入到文档光标位置"]').count()
            await check("插入按钮存在", ins > 0)
            # 检查添加按钮
            add = await page.locator('button:has-text("添加变量")').count()
            await check("添加变量按钮存在", add > 0)
        else:
            # 按钮可能被其他元素遮挡，尝试用更宽松的选择器
            all_btns = page.locator('button')
            for i in range(min(await all_btns.count(), 20)):
                t = await all_btns.nth(i).text_content()
                if t and '变量' in t:
                    cnt = 1
                    await all_btns.nth(i).click()
                    await page.wait_for_timeout(1000)
                    break
            if cnt == 0:
                await check("变量按钮存在", False, "未找到任何变量按钮")
                # 截完整页面
                await screenshot(page, "full-page")

        # 测试 3：插入
        print("\n🔍 3. 插入变量")
        ins = page.locator('[title="插入到文档光标位置"]')
        if await ins.count() > 0:
            await ins.first.click()
            await page.wait_for_timeout(500)
            html = await page.inner_html('.docx-editor-container')
            has_var = '{{' in html
            await check("插入后文档含 {{变量}}", has_var)
        else:
            await check("插入按钮不可用", False, "跳过验证")

        # 汇总
        print("\n" + "="*50)
        for r in results:
            print(f"  {'✅' if r['ok'] else '❌'} {r['desc']}")
        print(f"  通过: {sum(1 for r in results if r['ok'])}/{len(results)}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())