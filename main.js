const { app, BrowserWindow, systemPreferences } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function startSignalingServer() {
  const serverPath = path.join(__dirname, 'server', 'signaling.js');
  serverProcess = fork(serverPath, [], {
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Signaling server error:', err);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    title: 'BeautyCall - Video Call with Beauty Filters',
    icon: iconPath, // 창 좌측 상단 및 작업표시줄 아이콘 설정
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Windows에서 명시적으로 아이콘 재지정 (확실한 렌더링)
  mainWindow.setIcon(iconPath);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 카메라/마이크 권한 요청 (macOS)
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('camera');
    await systemPreferences.askForMediaAccess('microphone');
  }

  // 로컬 시그널링 서버 자동 구동
  startSignalingServer();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
