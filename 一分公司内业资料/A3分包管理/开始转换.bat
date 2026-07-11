@echo off
chcp 65001 >nul
echo ========================================
echo   A3分包管理模板批量转换工具
echo ========================================
echo.
echo 正在检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python！
    echo.
    echo 请先安装Python:
    echo 1. 打开 https://www.python.org/downloads/
    echo 2. 下载并安装 Python 3.x
    echo 3. 安装时勾选 "Add Python to PATH"
    echo.
    echo 安装完成后，重新运行此脚本。
    echo.
    pause
    exit /b 1
)
echo [OK] Python已安装
echo.
echo 正在检查依赖库...
python -c "import docx" >nul 2>&1
if errorlevel 1 (
    echo [提示] 需要安装python-docx库
    echo 正在安装...
    pip install python-docx
    if errorlevel 1 (
        echo [错误] 安装失败，请手动运行:
        echo pip install python-docx
        pause
        exit /b 1
    )
)
echo [OK] 依赖库已就绪
echo.
echo ========================================
echo   准备开始转换...
echo ========================================
echo.
echo 将处理以下模板文件:
echo   - A-3-2-1总包对分包交底
echo   - A-3-2-2安全生产协议书
echo   - A-3-2-3消防责任书
echo   - A-3-2-4印章授权书
echo   - A-3-2-5风险告知书
echo   - A-3-2-7法人授权委托书
echo   - A-3-2-8分包单位安全管理体系
echo   - A-3-2-9管理人员名单
echo.
echo 转换后的文件将保存在:
echo   ..\converted_templates\
echo.
pause
python "%~dp0run_convert.py"
pause
