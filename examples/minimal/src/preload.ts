import { contextBridge, ipcRenderer } from "electron";

// The whole bridge. One typed call per channel, no channel-string
// passthrough, no ipcRenderer, no Node in the renderer. The main process
// authenticates the sender and parses the payload before anything happens.
contextBridge.exposeInMainWorld("hmd", {
  list: () =>
    ipcRenderer.invoke("rpc", {
      type: "notes.list",
      payload: {},
    }),
  add: (title: string) =>
    ipcRenderer.invoke("rpc", {
      type: "notes.add",
      payload: { title },
    }),
});
