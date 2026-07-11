from playwright.sync_api import sync_playwright
import os

SCREENSHOT_DIR = r'F:\安全管理平台\screenshots'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)
BASE_URL = 'http://localhost:8083'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})

    pages = [
        ('home_phase4.png', f'{BASE_URL}/#/'),
        ('templates_phase4.png', f'{BASE_URL}/#/templates'),
        ('workers_phase4.png', f'{BASE_URL}/#/workers'),
        ('variable_settings_phase4.png', f'{BASE_URL}/#/settings/variables'),
    ]

    for filename, url in pages:
        page.goto(url)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, filename))
        print(f'Saved {filename}')

    browser.close()
    print('Phase 4 screenshots saved to', SCREENSHOT_DIR)
