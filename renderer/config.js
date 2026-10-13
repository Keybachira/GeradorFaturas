/**
 * config.js — DADOS FIXOS DA DOKAMA
 * ---------------------------------
 * Aqui defines UMA única vez os dados que nunca mudam (a dona da fatura).
 * Só precisas de editar este ficheiro se os dados da empresa mudarem.
 * Os dados do cliente, do documento e dos produtos são preenchidos na app.
 */
window.DOKAMA_CONFIG = {
  // Cabeçalho — dados da empresa (dona da fatura)
  empresa: {
    nome: "DOKAMA AGRO-PECUÁRIA E COMÉRCIO (SU) LDA",
    nif: "5001301993",
    localizacao: "Benguela - Angola",
    telefone: "923090804",
    email: "calanilda@gmail.com"
  },

  // Tipo de documento e moeda
  documento: {
    tipo: "FACTURA PRO-FORMA",
    moeda: "AKZ"
  },

  // Coordenadas bancárias (pagamento)
  banco: {
    banco: "Banco Angolano de Investimentos (BAI)",
    nib: "29246638810001",
    iban: "AO00 4000 0092 4663 8810 133",
    titular: "DOKAMA AGRO-PECUÁRIA E COMÉRCIO (SU) LDA"
  },

  // Rodapé e texto legal
  rodape: {
    processado: "Processado por programa validado n.º 61/AGT @ CACIMBO ERP 8.0.2021.60",
    legal: "Este documento é uma FACTURA PRO-FORMA e não confere direito de crédito ao emitente.",
    legalRodape: "NIF: 5001301993 | Benguela, Angola"
  },

  // Sufixo do valor por extenso (ex.: "... kwanzas")
  porExtensoSufixo: "kwanzas",

  // Prefixo do número do documento (ex.: FP-2026/001) — podes mudar aqui
  numDocPrefixo: "FP",
  numDocAno: new Date().getFullYear()
};
