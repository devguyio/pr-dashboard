const { contextBridge } = require('electron');

// Expose Electron APIs to the renderer process
// For now this is minimal - will be extended for notifications later
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
