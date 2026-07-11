@echo off
chcp 65001 >nul
title 一键安装Python环境
color 0A

echo ========================================
echo   一键安装Python + 依赖库
echo ========================================
echo.

:: 检查是否以管理员运行
net session >nul 2>&1
if errorlevel 1 (
    echo [提示] 需要管理员权限，正在重新启动...
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 检查Python
echo [1/3] 检查Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [提示] 未检测到Python，开始安装...
    echo.
    
    :: 下载Python安装包
    echo [下载] Python 3.11.9...
    curl -L -o "python_installer.exe" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    
    if not exist "python_installer.exe" (
        echo [错误] 下载失败，请检查网络连接
        pause
        exit /b 1
    )
    
    :: 安装Python（静默安装，添加到PATH）
    echo [安装] Python 3.11.9...
    python_installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    
    :: 删除安装包
    del python_installer.exe
    
    :: 刷新环境变量
    echo [刷新] 环境变量...
    setx PATH "%PATH%;C:\Program Files\Python311\Scripts;C:\Program Files\Python311" >nul
    
    :: 重新检查
    python --version >nul 2>&1
    if errorlevel 1 (
        echo [错误] Python安装失败，请手动安装
        echo 下载地址: https://www.python.org/downloads/
        pause
        exit /b 1
    )
    
    echo [OK] Python安装成功！
) else (
    echo [OK] Python已安装
)

python --version
echo.

:: 升级pip
echo [2/3] 升级pip...
python -m pip install --upgrade pip >nul 2>&1
echo [OK] pip已升级
echo.

:: 安装依赖库
echo [3/3] 安装python-docx...
pip install python-docx -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 (
    echo [重试] 使用默认源安装...
    pip install python-docx
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 现在可以运行 开始转换.bat 了
echo.
pause
