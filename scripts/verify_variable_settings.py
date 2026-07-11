from playwright.sync_api import sync_playwright
import os

SCREENSHOT_DIR = r'F:\安全管理平台\screenshots'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    page.goto('http://localhost:8082/#/settings/variables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'variable_settings_after_changes.png'))

    browser.close()
    print('Variable settings screenshot saved')
