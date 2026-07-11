from playwright.sync_api import sync_playwright
import os

BASE_URL = 'http://localhost:8083'
TEMPLATE_PATH = r'F:\安全管理平台\public\test-templates\minimal_foo.docx'
SCREENSHOT_DIR = r'F:\安全管理平台\screenshots'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    console_logs = []
    page.on('console', lambda msg: console_logs.append(f'{msg.type}: {msg.text}'))
    page.on('pageerror', lambda err: console_logs.append(f'PAGEERROR: {err}'))

    page.goto(f'{BASE_URL}/#/templates')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'repro_before_import.png'))

    # Upload single file
    with page.expect_file_chooser() as fc_info:
        page.locator('input[type="file"]').nth(0).evaluate('el => el.click()')
    file_chooser = fc_info.value
    file_chooser.set_files(TEMPLATE_PATH)

    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'repro_after_import.png'))

    # Delete the template
    delete_btn = page.locator('button[title="删除模板"]').first
    if delete_btn.is_visible():
        page.on('dialog', lambda dialog: dialog.accept())
        delete_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, 'repro_after_delete.png'))
    else:
        print('Delete button not found')

    print('Console logs:')
    for log in console_logs:
        print(log)

    browser.close()
