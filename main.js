/**
 * main.js — Processo principal do Electron.
 * Cria a janela da app e trata da geração do PDF e dos rascunhos.
 */
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Template partilhado (função buildInvoiceHTML) — usado para gerar o PDF.
const InvoiceTemplate = require("./renderer/invoice-template.js");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Gerador de Facturas - DOKAMA",
    backgroundColor: "#f5f6f8",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

// ---- Geração de PDF ----
// Usa uma janela oculta para renderizar o HTML da factura e imprimir em PDF.
ipcMain.handle("exportar-pdf", async (event, { html, nomeSugerido }) => {
  try {
    // Janela invisível só para renderizar/imprimir
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });

    // Carrega o HTML directamente (data URI para não precisar de ficheiro temporário)
    await printWin.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );

    // Gera o buffer do PDF (A4, com fundo)
    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      margins: { marginType: "none" }
    });

    printWin.close();

    // Diálogo "Guardar como"
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar Factura em PDF",
      defaultPath: nomeSugerido || "factura.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });

    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }

    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// ---- Rascunhos (JSON) ----
ipcMain.handle("guardar-rascunho", async (event, { conteudo, nomeSugerido }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar rascunho da factura",
      defaultPath: nomeSugerido || "factura-rascunho.json",
      filters: [{ name: "Rascunho JSON", extensions: ["json"] }]
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, conteudo, "utf-8");
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle("abrir-rascunho", async (event) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Abrir rascunho da factura",
      filters: [{ name: "Rascunho JSON", extensions: ["json"] }],
      properties: ["openFile"]
    });
    if (canceled || !filePaths || !filePaths.length) {
      return { ok: false, canceled: true };
    }
    const conteudo = fs.readFileSync(filePaths[0], "utf-8");
    return { ok: true, path: filePaths[0], conteudo };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
