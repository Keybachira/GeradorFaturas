/**
 * test/validate.js — Testes rápidos da lógica (corre com `node test/validate.js`).
 * Valida utils.js, invoice-template.js e o cálculo do total da factura.
 */
const assert = require("assert");
const path = require("path");
const U = require(path.join(__dirname, "..", "renderer", "utils.js"));
const T = require(path.join(__dirname, "..", "renderer", "invoice-template.js"));

let passou = 0;
function ok(nome, fn) {
  try { fn(); passou++; console.log("  OK  - " + nome); }
  catch (e) { console.error("  FALHOU - " + nome + "\n        " + e.message); process.exitCode = 1; }
}

console.log("== utils.js ==");

ok("formatarNumero 21850000 -> 21.850.000,00", () => {
  assert.strictEqual(U.formatarNumero(21850000), "21.850.000,00");
});
ok("formatarNumero 0 -> 0,00", () => {
  assert.strictEqual(U.formatarNumero(0), "0,00");
});
ok("formatarNumero 95000 -> 95.000,00", () => {
  assert.strictEqual(U.formatarNumero(95000), "95.000,00");
});
ok("formatarNumero negativo -1234.5 -> -1.234,50", () => {
  assert.strictEqual(U.formatarNumero(-1234.5), "-1.234,50");
});
ok("parseNumero '95.000,00' -> 95000", () => {
  assert.strictEqual(U.parseNumero("95.000,00"), 95000);
});
ok("parseNumero '95000' -> 95000", () => {
  assert.strictEqual(U.parseNumero("95000"), 95000);
});
ok("parseNumero '1.234.567,89' -> 1234567.89", () => {
  assert.strictEqual(U.parseNumero("1.234.567,89"), 1234567.89);
});

console.log("== por extenso ==");

ok("valorPorExtenso(21850000) contém 'milhões' e termina em 'kwanzas'", () => {
  const s = U.valorPorExtenso(21850000, "kwanzas");
  assert.ok(/milhões/.test(s), "deveria conter 'milhões': " + s);
  assert.ok(/kwanzas$/.test(s), "deveria terminar em 'kwanzas': " + s);
});
ok("valorPorExtenso(0) -> 'Zero kwanzas'", () => {
  assert.strictEqual(U.valorPorExtenso(0, "kwanzas"), "Zero kwanzas");
});
ok("valorPorExtenso(1000) -> 'Mil kwanzas'", () => {
  assert.strictEqual(U.valorPorExtenso(1000, "kwanzas"), "Mil kwanzas");
});
ok("valorPorExtenso(100) -> 'Cem kwanzas'", () => {
  assert.strictEqual(U.valorPorExtenso(100, "kwanzas"), "Cem kwanzas");
});
ok("valorPorExtenso(25) -> 'Vinte e cinco kwanzas'", () => {
  assert.strictEqual(U.valorPorExtenso(25, "kwanzas"), "Vinte e cinco kwanzas");
});

console.log("== invoice-template.js ==");

const CFG = {
  empresa: { nome: "DOKAMA AGRO-PECUÁRIA E COMÉRCIO (SU) LDA", nif: "5001301993", localizacao: "Benguela - Angola", telefone: "923090804", email: "calanilda@gmail.com" },
  documento: { tipo: "FACTURA PRO-FORMA", moeda: "AKZ" },
  banco: { banco: "Banco Angolano de Investimentos (BAI)", nib: "29246638810001", iban: "AO00 4000 0092 4663 8810 133", titular: "DOKAMA AGRO-PECUÁRIA E COMÉRCIO (SU) LDA" },
  rodape: { processado: "Processado por programa validado n.º 61/AGT @ CACIMBO ERP 8.0.2021.60", legal: "Este documento é uma FACTURA PRO-FORMA e não confere direito de crédito ao emitente.", legalRodape: "NIF: 5001301993 | Benguela, Angola" },
  porExtensoSufixo: "kwanzas"
};

// Replica o cálculo do renderer para o item de exemplo
function calcLinha(qtd, preco, descPct) {
  return qtd * preco * (1 - descPct / 100);
}
const total = calcLinha(230, 95000, 0);

const html = T.buildInvoiceHTML({
  config: CFG,
  documento: { numDoc: "FP-2026/001", data: "09/04/2026", tipo: "FACTURA PRO-FORMA", moeda: "AKZ" },
  cliente: { nome: "Fazenda Joselândia", nif: "5000734110", projecto: "Produção de Suínos", localizacao: "Talamajamba, Baía Farta, Benguela" },
  itens: [{ ref: "1", descricao: "Aquisição de suínos", quant: "230", un: "un", precoUnit: U.formatarNumero(95000), descPct: "0%", valorTotal: U.formatarNumero(total) }],
  totalLiquido: U.formatarNumero(total),
  porExtenso: U.valorPorExtenso(total, "kwanzas")
});

ok("HTML contém nome da empresa", () => assert.ok(html.includes("DOKAMA AGRO-PECUÁRIA E COMÉRCIO (SU) LDA")));
ok("HTML contém NIF fixo 5001301993", () => assert.ok(html.includes("5001301993")));
ok("HTML contém número do documento FP-2026/001", () => assert.ok(html.includes("FP-2026/001")));
ok("HTML contém nome do cliente", () => assert.ok(html.includes("Fazenda Joselândia")));
ok("HTML contém IBAN", () => assert.ok(html.includes("AO00 4000 0092 4663 8810 133")));
ok("HTML contém descrição do item", () => assert.ok(html.includes("Aquisição de suínos")));
ok("HTML contém total formatado 21.850.000,00", () => assert.ok(html.includes("21.850.000,00")));
ok("HTML contém valor por extenso com 'kwanzas'", () => assert.ok(/kwanzas/.test(html)));
ok("HTML tem a classe items-table", () => assert.ok(html.includes('class="items-table"')));
ok("HTML tem @media print", () => assert.ok(html.includes("@media print")));

ok("escape previne injecção de HTML", () => {
  const perigoso = T.buildInvoiceHTML({
    config: CFG,
    documento: {}, cliente: { nome: "<script>alert(1)</script>" }, itens: [],
    totalLiquido: "0,00", porExtenso: ""
  });
  assert.ok(!perigoso.includes("<script>alert(1)</script>"), "HTML não deve conter script cru");
  assert.ok(perigoso.includes("&lt;script&gt;"), "deve estar escapado");
});

ok("itens vazios gera linha 'Sem itens'", () => {
  const vazio = T.buildInvoiceHTML({ config: CFG, documento: {}, cliente: {}, itens: [], totalLiquido: "0,00", porExtenso: "" });
  assert.ok(vazio.includes("Sem itens"));
});

console.log("\n" + passou + " testes passaram" + (process.exitCode ? " (com falhas!)" : " com sucesso."));
