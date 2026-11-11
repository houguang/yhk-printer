const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 920,
    minHeight: 620,
    title: 'YHK 迷你热敏机 · 电脑直连打印',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const ses = win.webContents.session;
  const ALLOW = ['bluetooth', 'serial', 'usb', 'location', 'notifications', 'media'];

  // 放行 Web Bluetooth 等设备权限
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOW.includes(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => ALLOW.includes(permission));

  // Electron 没有内置蓝牙选择器 UI：必须在此事件里选出设备并回调 deviceId，
  // 不监听 / 不回调会被 Chromium 当作用户取消（requestDevice chooser cancelled）。
  let btCallback = null;
  let btTimer = null;
  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    const match = deviceList.find((d) =>
      (d.deviceName || '').toUpperCase().startsWith('YHK')
    );
    if (match) {
      if (btTimer) { clearTimeout(btTimer); btTimer = null; }
      btCallback = null;
      callback(match.deviceId);
      return;
    }
    // 未扫到目标设备：保留回调等待下一轮扫描，8 秒超时则取消请求
    btCallback = callback;
    if (!btTimer) {
      btTimer = setTimeout(() => {
        if (btCallback) { btCallback(''); btCallback = null; }
        btTimer = null;
      }, 8000);
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
