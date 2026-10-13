/**
 * preload.js — Ponte segura entre a interface (renderer) e o sistema (main).
 * Expõe apenas as funções necessárias, com contextIsolation activado.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("faturaAPI", {
  /** Gera o PDF a partir do HTML da factura e abre o diálogo "Guardar como".
   *  Retorna { ok: true, path } ou { ok: false, error }. */
  exportarPDF: (html, nomeSugerido) =>
    ipcRenderer.invoke("exportar-pdf", { html, nomeSugerido }),

  /** Guarda um rascunho (JSON) num ficheiro escolhido pelo utilizador. */
  guardarRascunho: (conteudoJSON, nomeSugerido) =>
    ipcRenderer.invoke("guardar-rascunho", { conteudo: conteudoJSON, nomeSugerido }),

  /** Abre um ficheiro de rascunho (JSON) e devolve o seu conteúdo. */
  abrirRascunho: () => ipcRenderer.invoke("abrir-rascunho")
});
