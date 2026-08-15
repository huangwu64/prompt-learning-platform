@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  一键启动后端（连接云端 MySQL + Redis）
echo ============================================

echo [1/3] 重新打包（确保 jar 含最新模块与云端配置）...
call mvnw.cmd -DskipTests package
if errorlevel 1 (
  echo [错误] 打包失败，请检查 Maven 环境
  pause
  exit /b 1
)

echo [2/3] 启动后端（云端配置）...
set SPRING_PROFILES_ACTIVE=cloud
java -jar target\ai-platform.jar

echo [3/3] 后端已退出
pause
