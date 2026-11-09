const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const appNameInput = document.getElementById('appName');
  const appUrlInput = document.getElementById('appUrl');
  const browseIconBtn = document.getElementById('browseIconBtn');
  const iconPathDisplay = document.getElementById('iconPathDisplay');
  const buildBtn = document.getElementById('buildBtn');
  const statusDiv = document.getElementById('status');

  let selectedIconPath = '';

  // Browse icon button click
  if (browseIconBtn) {
    browseIconBtn.addEventListener('click', async () => {
      try {
        const filePath = await ipcRenderer.invoke('select-icon-dialog');
        if (filePath) {
          selectedIconPath = filePath;
          if (iconPathDisplay) {
            iconPathDisplay.textContent = filePath;
            iconPathDisplay.style.color = '#2563eb';
          }
        }
      } catch (err) {
        console.error('File dialog error:', err);
        alert('File dialog error: ' + err.message);
      }
    });
  }

  // Realtime build log listener
  ipcRenderer.on('build-log', (event, message) => {
    if (statusDiv) {
      statusDiv.style.display = 'block';
      const line = document.createElement('div');
      line.textContent = message;
      statusDiv.appendChild(line);
      statusDiv.scrollTop = statusDiv.scrollHeight;
    }
  });

  // Generate button click
  if (buildBtn) {
    buildBtn.addEventListener('click', async () => {
      const appName = appNameInput.value.trim();
      const appUrl = appUrlInput.value.trim();

      if (!appName || !appUrl) {
        alert('App Name နှင့် URL ကို ဖြည့်စွက်ပေးပါ။');
        return;
      }

      buildBtn.disabled = true;
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<div style="color: #60a5fa; font-weight: bold;">🚀 Build လုပ်ငန်းစဉ် စတင်နေပါပြီ...</div>';
      }

      try {
        const result = await ipcRenderer.invoke('build-deb', {
          appName,
          appUrl,
          appIcon: selectedIconPath
        });

        const summary = document.createElement('div');
        summary.style.marginTop = '10px';
        summary.style.fontWeight = 'bold';
        if (result && result.success) {
          summary.style.color = '#4ade80';
          summary.textContent = `✅ ${result.message}`;
        } else {
          summary.style.color = '#f87171';
          summary.textContent = `❌ ${result ? result.message : 'Unknown build error'}`;
        }
        statusDiv.appendChild(summary);
      } catch (err) {
        const summary = document.createElement('div');
        summary.style.marginTop = '10px';
        summary.style.color = '#f87171';
        summary.textContent = `❌ IPC Error: ${err.message}`;
        statusDiv.appendChild(summary);
      } finally {
        buildBtn.disabled = false;
      }
    });
  }
});
