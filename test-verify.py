"""快速验证：模板库侧边栏 + 编辑器变量面板"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080'


def log(msg):
    print(f"  {msg}")


def seed_data(page):
    log("--- 注入数据 ---")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    r = page.evaluate("""
    (async () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('liuge_safety');
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['categories', 'templates'], 'readwrite');
          const cats = [
            { id: 'c1', name: '安全日报', code: 'daily', parentId: null, sortOrder: 1, isBuiltIn: false, createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'c2', name: '安全周报', code: 'weekly', parentId: null, sortOrder: 2, isBuiltIn: false, createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'c3', name: '隐患整改', code: 'hazard', parentId: 'c1', sortOrder: 1, isBuiltIn: false, createdAt: Date.now(), updatedAt: Date.now() },
          ];
          cats.forEach(c => tx.objectStore('categories').put(c));
          const tmpls = [
            { id: 't1', name: '日报模板_v1', categoryId: 'c1', type: 'document', fileType: 'docx', isBuiltIn: false, category: '安全日报', description: '安全日报模板', variableCount: 5, variableMappings: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 't2', name: '日报模板_v2', categoryId: 'c1', type: 'document', fileType: 'docx', isBuiltIn: false, category: '安全日报', description: '安全日报新版', variableCount: 3, variableMappings: [], createdAt: Date.now()-1000, updatedAt: Date.now() },
            { id: 't3', name: '周报模板', categoryId: 'c2', type: 'document', fileType: 'docx', isBuiltIn: false, category: '安全周报', description: '安全周报', variableCount: 4, variableMappings: [], createdAt: Date.now()-2000, updatedAt: Date.now() },
          ];
          tmpls.forEach(t => tx.objectStore('templates').put(t));
          tx.oncomplete = () => resolve('ok');
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    })()
    """)
    log(f"  注入: {r}")
    page.goto(f"{BASE}/#/templates")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)


def test_template_library(page):
    """验证模板库侧边栏"""
    log("=== 模板库侧边栏 ===")
    page.goto(f"{BASE}/#/templates")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    page.screenshot(path="test-verify-01-library.png", full_page=True)
    log("  ✓ 截图: test-verify-01-library.png")

    # 检查分类树节点
    cats = page.locator('aside').all()
    log(f"  aside 元素: {len(cats)}个")
    for i, c in enumerate(cats):
        text = c.text_content()[:80]
        log(f"    aside[{i}]: {text}")

    # 检查模板卡片
    cards = page.locator('[draggable="true"]')
    log(f"  可拖拽卡片: {cards.count()}个")


def test_editor_variable_panel(page):
    """验证编辑器变量面板"""
    log("=== 编辑器变量面板 ===")
    page.goto(f"{BASE}/#/editor?id=t1")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # 先截图初始状态（无变量面板）
    page.screenshot(path="test-verify-02-editor-no-panel.png", full_page=False)
    log("  ✓ 截图: test-verify-02-editor-no-panel.png")

    # 点击"变量"按钮打开面板
    var_btn = page.locator('button').filter(has_text='变量')
    if var_btn.count() > 0:
        var_btn.first.click()
        page.wait_for_timeout(500)
        page.screenshot(path="test-verify-03-editor-with-panel.png", full_page=False)
        log("  ✓ 截图: test-verify-03-editor-with-panel.png")

        # 检查面板是否显示
        var_config = page.locator('text=变量配置')
        if var_config.count() > 0:
            log("  ✓ 变量配置面板已显示")
        else:
            log("  ⚠ 变量配置面板未显示")
    else:
        log("  ⚠ 未找到'变量'按钮")


def main():
    print("▸ 验证新功能\n")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            seed_data(page)
            print()
            test_template_library(page)
            print()
            test_editor_variable_panel(page)
            print()
            print("=== 完成 ===")
        except Exception as e:
            log(f"❌ {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


if __name__ == "__main__":
    main()