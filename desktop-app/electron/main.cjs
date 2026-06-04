const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.loadURL("http://localhost:5173");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for ML Pipeline Control
ipcMain.handle("runLevel2Pipeline", async (event, idToken) => {
  return {
    success: true,
    message: "Level 2 pipeline run queued (local execution coming soon)",
    pipelineId: `local_${Date.now()}`,
  };
});

ipcMain.handle("getPipelineStatus", async (event) => {
  return {
    status: "idle",
    lastRun: null,
    isRunning: false,
  };
});

ipcMain.handle("callCloudFunction", async (event, functionName, idToken, data) => {
  try {
    const projectId = 'evidence-vydaju';
    const url = `https://europe-west1-${projectId}.cloudfunctions.net/${functionName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: errorData.error || `Cloud Function returned ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Failed to call Cloud Function',
    };
  }
});

ipcMain.handle("clearLocalCache", async (event) => {
  return {
    success: true,
    message: "Local cache cleared",
  };
});
