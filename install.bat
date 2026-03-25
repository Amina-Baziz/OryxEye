@echo off
echo Installing OryxEye dependencies...
echo.

echo [1/3] Installing server packages...
pushd "%~dp0server"
call npm install
popd

echo.
echo [2/3] Installing frontend packages...
pushd "%~dp0frontend"
call npm install
popd

echo.
echo [3/3] Installing Python packages...
pip install flask tensorflow pillow numpy flask-cors scikit-learn

echo.
echo All done! See README.md for how to start the servers.