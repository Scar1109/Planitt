const { contextBridge } = require('electron');

// We don't strictly need preload APIs for basic React yet,
// but it's good practice to have this file ready for when we need
// to expose native node.js APIs (like direct USB printers) to the React frontend.
contextBridge.exposeInMainWorld('electronAPI', {
    // example: ping: () => ipcRenderer.invoke('ping')
});
