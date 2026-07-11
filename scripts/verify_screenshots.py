from playwright.sync_api import sync_playwright
import os

SCREENSHOT_DIR = r'F:\安全管理平台\screenshots'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    # 首页
    page.goto('http://localhost:8082/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'home_after_changes.png'))

    # 模板库
    page.goto('http://localhost:8082/#/templates')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'templates_after_changes.png'))

    # 人员管理
    page.goto('http://localhost:8082/#/workers')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'workers_after_changes.png'))

    browser.close()
    print('Screenshots saved to', SCREENSHOT_DIR)
