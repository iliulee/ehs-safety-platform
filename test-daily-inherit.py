import json
import sys
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173'
TEST_LOG_ID = 'test-yesterday-log'


def make_yesterday_log(yesterday: str):
    return {
        'id': TEST_LOG_ID,
        'date': yesterday,
        'weather': '晴',
        'content': '测试昨日施工内容\n隐患1处；教育1次；处罚0次。',
        'workContent': '测试昨日施工内容：土方开挖、边坡支护',
        'items': [
            {
                'id': 'wc-test',
                'type': 'workContent',
                'title': '测试昨日施工内容：土方开挖、边坡支护',
                'data': {'content': '测试昨日施工内容：土方开挖、边坡支护'},
                'inherited': False,
                'modified': False,
                'sourceDate': yesterday,
            },
            {
                'id': 'hz-test',
                'type': 'hazard',
                'title': '边坡未设置排水沟',
                'data': {
                    'title': '边坡未设置排水沟',
                    'level': '一般',
                    'measure': '增设临时排水沟',
                    'status': 'pending',
                },
                'inherited': False,
                'modified': False,
                'sourceDate': yesterday,
            },
            {
                'id': 'edu-test',
                'type': 'education',
                'title': '班前安全教育',
                'data': {'topic': '班前安全教育', 'attendees': '张三、李四'},
                'inherited': False,
                'modified': False,
                'sourceDate': yesterday,
            },
        ],
        'createdAt': int((datetime.now() - timedelta(days=1)).timestamp() * 1000),
        'updatedAt': int((datetime.now() - timedelta(days=1)).timestamp() * 1000),
    }


def seed_yesterday_log(page, yesterday: str):
    log = make_yesterday_log(yesterday)
    return page.evaluate(
        '''(log) => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('liuge_safety');
                req.onerror = () => reject(req.error);
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('dailyLogs', 'readwrite');
                    const store = tx.objectStore('dailyLogs');
                    const putReq = store.put(log);
                    putReq.onsuccess = () => resolve('ok');
                    putReq.onerror = () => reject(putReq.error);
                };
            });
        }''',
        log,
    )


def cleanup_test_log(page):
    return page.evaluate(
        '''() => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('liuge_safety');
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('dailyLogs', 'readwrite');
                    const store = tx.objectStore('dailyLogs');
                    const delReq = store.delete('test-yesterday-log');
                    delReq.onsuccess = () => resolve('ok');
                    delReq.onerror = () => reject(delReq.error);
                };
            });
        }'''
    )


def main():
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 900})

        page.on('console', lambda msg: print(f'  [console] {msg.type}: {msg.text}'))
        page.on('pageerror', lambda err: print(f'  [pageerror] {err}'))

        print(f'[1/6] 访问日报页面并等待应用初始化...')
        page.goto(f'{BASE_URL}/#/report/daily')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)

        print(f'[2/6] 注入昨日日报测试数据（{yesterday}）...')
        seed_yesterday_log(page, yesterday)

        # 验证数据是否写入
        all_logs = page.evaluate(
            '''() => {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('liuge_safety');
                    req.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction('dailyLogs', 'readonly');
                        const store = tx.objectStore('dailyLogs');
                        const getReq = store.getAll();
                        getReq.onsuccess = () => resolve(getReq.result);
                        getReq.onerror = () => reject(getReq.error);
                    };
                });
            }'''
        )
        print(f'  dailyLogs 当前记录数：{len(all_logs)}')
        for log in all_logs:
            print(f'    - id={log.get("id")}, date={log.get("date")}, items={len(log.get("items", []))}')

        print('[3/6] 刷新页面，触发继承选择器...')
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)

        print('[4/6] 截图：继承选择器')
        page.screenshot(path='test-inherit-selector.png', full_page=True)

        selector = page.locator('text=检测到').first
        if selector.count() > 0:
            print('  ✓ 继承选择器已显示')
        else:
            print('  ✗ 未找到继承选择器')

        print('[5/6] 点击「复制全部」→「确认继承」...')
        page.locator('text=复制全部').first.click()
        page.wait_for_timeout(300)
        page.locator('text=确认继承').first.click()
        page.wait_for_timeout(800)

        page.screenshot(path='test-inherit-form.png', full_page=True)

        badges = page.locator('text=继承自昨天').all()
        print(f'  ✓ 发现 {len(badges)} 个继承标记')

        work_content = page.locator('textarea#workContent').input_value()
        assert '土方开挖' in work_content, f'施工内容未正确继承: {work_content}'
        print('  ✓ 施工内容已继承')

        edu_topic = page.locator('input[placeholder="教育主题"]').input_value()
        assert edu_topic == '班前安全教育', f'教育主题未正确继承: {edu_topic}'
        print('  ✓ 教育主题已继承')

        print('[6/6] 清理测试数据...')
        cleanup_test_log(page)

        browser.close()
        print('测试完成，截图已保存到 test-inherit-selector.png 和 test-inherit-form.png')


if __name__ == '__main__':
    main()
