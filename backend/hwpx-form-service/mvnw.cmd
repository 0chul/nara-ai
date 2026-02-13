@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script, version 3.2.0
@REM ----------------------------------------------------------------------------
@IF "%MAVEN_WRAPPER_DEBUG%"=="" @ECHO OFF
@SETLOCAL

set ERROR_CODE=0

if not "%JAVA_HOME%"=="" goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%"=="0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.
echo.
set ERROR_CODE=1
goto end

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%\bin\java.exe

if exist "%JAVA_EXE%" goto init

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.
echo.
set ERROR_CODE=1
goto end

:init

set MAVEN_PROJECTBASEDIR=%~dp0
if "%MAVEN_PROJECTBASEDIR:~-1%"=="\" set MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%

set WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
set WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties

if exist "%WRAPPER_JAR%" goto execute

echo.
echo ERROR: Maven Wrapper jar not found: %WRAPPER_JAR%
echo.
set ERROR_CODE=1
goto end

:execute

set MAVEN_OPTS=%MAVEN_OPTS%

"%JAVA_EXE%" %MAVEN_OPTS% ^
  -classpath "%WRAPPER_JAR%" ^
  -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %*

set ERROR_CODE=%ERRORLEVEL%
goto end

:end
@ENDLOCAL & exit /B %ERROR_CODE%

