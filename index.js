const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 650,
    minHeight: 500,
    icon: path.join(__dirname, 'assets/icon-ascii.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // This tells Electron to load your HTML file
  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});