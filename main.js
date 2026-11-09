const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Web to DEB Builder',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-icon-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select App Icon',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('build-deb', async (event, config) => {
  const { appName, appUrl, appIcon } = config;
  const safeName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '') || 'my-web-app';
  const buildDir = path.join(__dirname, 'build-temp', safeName);
  const buildScriptsDir = path.join(buildDir, 'build');
  const iconsDir = path.join(buildScriptsDir, 'icons');

  function sendLog(msg) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('build-log', msg);
    }
  }

  try {
    sendLog(`📁 Preparing build directory: ${buildDir}`);
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(iconsDir, { recursive: true });

    // 1. Process icon to 512x512 square
    if (appIcon && fs.existsSync(appIcon)) {
      sendLog('🎨 Processing app icon (resizing to 512x512 square)...');
      await new Promise((resolve) => {
        exec(`convert "${appIcon}" -resize 512x512! "${path.join(iconsDir, '512x512.png')}"`, (err) => {
          if (err) {
            fs.copyFileSync(appIcon, path.join(iconsDir, '512x512.png'));
          }
          fs.copyFileSync(path.join(iconsDir, '512x512.png'), path.join(buildDir, 'icon.png'));
          resolve();
        });
      });
    }

    // 2. Create post-install script (deb install ပြီးတာနဲ့ icon ကို pixmaps ထဲ တိုက်ရိုက်ကူးပြီး cache refresh လုပ်ပေးမည်)
    const afterInstallScript = `#!/bin/sh
set -e
if [ -f "/opt/${appName}/resources/app.asar" ]; then
  # Extract or copy if available, or link system icon
  mkdir -p /usr/share/pixmaps
fi
if [ -f "/usr/share/icons/hicolor/512x512/apps/${safeName}.png" ]; then
  cp -f "/usr/share/icons/hicolor/512x512/apps/${safeName}.png" "/usr/share/pixmaps/${safeName}.png" || true
fi
which gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
which update-desktop-database >/dev/null 2>&1 && update-desktop-database || true
exit 0
`;
    fs.writeFileSync(path.join(buildScriptsDir, 'after-install.sh'), afterInstallScript);

    // 3. package.json configuration
    sendLog('📝 Generating package.json & wrapper...');
    const packageJsonContent = {
      name: safeName,
      version: "1.0.0",
      description: `${appName} Desktop Application`,
      main: "main.js",
      author: "WebToDeb <builder@local.test>",
      homepage: appUrl,
      scripts: { start: "electron ." },
      build: {
        appId: `com.webtodeb.${safeName.replace(/-/g, '')}`,
        productName: appName,
        electronVersion: "45.2.3",
        linux: {
          target: ["deb"],
          category: "Network"
        },
        deb: {
          maintainer: "WebToDeb <builder@local.test>",
          afterInstall: "build/after-install.sh"
        }
      }
    };

    fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(packageJsonContent, null, 2));

    // 4. Target wrapper script
    const targetMainScript = `const { app, BrowserWindow } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: ${JSON.stringify(appName)},
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadURL(${JSON.stringify(appUrl)});
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`;
    fs.writeFileSync(path.join(buildDir, 'main.js'), targetMainScript);

    sendLog('⚡ Running electron-builder (packaging .deb)...');

    // 5. Build packaging
    return await new Promise((resolve) => {
      const child = spawn('npx', ['electron-builder', '--linux', 'deb'], { cwd: buildDir });

      child.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) sendLog(`  • ${text}`);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text) sendLog(`  ! ${text}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          const debPath = path.join(buildDir, 'dist', `${safeName}_1.0.0_amd64.deb`);
          sendLog('🎉 Build finished successfully!');
          resolve({ success: true, debPath, message: `Created: ${debPath}` });
        } else {
          sendLog(`❌ electron-builder exited with code ${code}`);
          resolve({ success: false, message: `Build failed with exit code ${code}` });
        }
      });

      child.on('error', (err) => {
        sendLog(`❌ Process error: ${err.message}`);
        resolve({ success: false, message: err.message });
      });
    });

  } catch (err) {
    sendLog(`❌ Error: ${err.message}`);
    return { success: false, message: err.message };
  }
});
