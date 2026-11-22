import { app, BrowserWindow, ipcMain, protocol } from "electron";
import { join } from "node:path";
import { InMemoryNotes } from "./viewmodel.js";

// The in-memory domain state; a real app forks a core utilityProcess here.
const notes = new InMemoryNotes();

// A same-origin check needs an origin, and file:// has none. The app://
// scheme is standard and secure: the page origin is opaque, not the file
// system, so the sender check in the RPC handler is meaningful.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true } },
]);

const PAGE = `<!doctype html>
<html>
  <body>
    <p id="status">loading…</p>
    <script>
      window.hmd.list().then((result) => {
        document.getElementById("status").textContent =
          result.ok ? "notes: " + result.value.length : "error: " + result.error;
      });
    </script>
  </body>
</html>`;

// One channel, a fixed envelope, the sender checked before the payload is
// parsed (the same shape the electron-best-practices skill names as
// main/ipc-policy.ts). `notes.add` reuses the notes.add contract: the title
// is 1..120 characters, applied in the ViewModel.
const ALLOWED_TYPES = new Set(["notes.list", "notes.add"]);
const EXPECTED_URL = "app://index.html";

function reject(
  error: string,
): { ok: false; error: string } {
  return { ok: false, error };
}

function handleRpc(
  frameUrl: string | null,
  childFrame: boolean,
  envelope: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (frameUrl === null) {
    return reject("no-frame");
  }
  if (childFrame) {
    return reject("child-frame");
  }
  if (frameUrl !== EXPECTED_URL) {
    return reject("bad-origin");
  }
  const type = (envelope as { type?: unknown } | null)?.type;
  if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
    return reject("unknown-type");
  }
  if (type === "notes.list") {
    return { ok: true, value: notes.list() };
  }
  const title = (envelope as { payload?: { title?: unknown } }).payload?.title ?? "";
  if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 120) {
    return reject("validation");
  }
  return { ok: true, value: notes.add(title.trim()) };
}

function createWindow(): void {
  const win = new BrowserWindow({
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });
  void win.loadURL("app://index.html");
  win.once("ready-to-show", () => win.show());
  // The renderer never opens windows; pop-ups are a main-process decision.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

ipcMain.handle("rpc", (event, envelope: unknown) => {
  const frame = event.senderFrame;
  return handleRpc(
    frame === null ? null : frame.url,
    frame !== null && frame.parent !== null,
    envelope,
  );
});

app.whenReady().then(() => {
  protocol.handle("app", () =>
    new Response(PAGE, {
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
  );
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
