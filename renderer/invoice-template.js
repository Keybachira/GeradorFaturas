/**
 * invoice-template.js
 * -------------------
 * Gera o HTML da factura EXACTAMENTE igual ao ficheiro fatura.html original.
 * Usado na pré-visualização (renderer) e na geração do PDF (enviado ao main.js).
 * Corre no browser (window) e no Node (main.js) — JS universal.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node (main.js)
  } else {
    root.InvoiceTemplate = api; // Browser (renderer)
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Escapa caracteres perigosos para injectar em HTML com segurança. */
  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // CSS idêntico ao fatura.html original (+ regras de impressão para o PDF).
  var CSS = [
    "        body {",
    "            font-family: Arial, Helvetica, sans-serif;",
    "            font-size: 12px;",
    "            color: #000;",
    "            margin: 0;",
    "            padding: 20px;",
    "            background-color: #f0f0f0;",
    "        }",
    "        .invoice-container {",
    "            max-width: 800px;",
    "            margin: 0 auto;",
    "            background: #fff;",
    "            padding: 20px;",
    "            border: 1px solid #ccc;",
    "            box-shadow: 0 0 10px rgba(0,0,0,0.1);",
    "        }",
    "        .header {",
    "            display: flex;",
    "            justify-content: space-between;",
    "            border-bottom: 2px solid #000;",
    "            padding-bottom: 10px;",
    "            margin-bottom: 10px;",
    "        }",
    "        .company-details h2 {",
    "            margin: 0;",
    "            font-size: 16px;",
    "            text-transform: uppercase;",
    "        }",
    "        .company-details p {",
    "            margin: 2px 0;",
    "        }",
    "        .invoice-details {",
    "            text-align: right;",
    "        }",
    "        .invoice-details table {",
    "            width: auto;",
    "            margin-left: auto;",
    "        }",
    "        .invoice-details td {",
    "            padding: 2px;",
    "        }",
    "        .client-details {",
    "            margin-bottom: 15px;",
    "            border: 1px solid #ccc;",
    "            padding: 10px;",
    "            background-color: #f9f9f9;",
    "        }",
    "        .client-details h3 {",
    "            margin: 0 0 5px 0;",
    "            font-size: 12px;",
    "            text-transform: uppercase;",
    "        }",
    "        table.items-table {",
    "            width: 100%;",
    "            border-collapse: collapse;",
    "            margin-bottom: 15px;",
    "            font-size: 11px;",
    "        }",
    "        table.items-table th {",
    "            border: 1px solid #000;",
    "            background-color: #ddd;",
    "            padding: 5px;",
    "            text-align: center;",
    "        }",
    "        table.items-table td {",
    "            border: 1px solid #000;",
    "            padding: 4px;",
    "            text-align: right;",
    "        }",
    "        table.items-table td.desc {",
    "            text-align: left;",
    "        }",
    "        .totals-section {",
    "            display: flex;",
    "            justify-content: space-between;",
    "            margin-bottom: 15px;",
    "        }",
    "        .bank-details {",
    "            width: 60%;",
    "            border: 1px solid #000;",
    "            padding: 10px;",
    "            font-size: 11px;",
    "        }",
    "        .bank-details h4 {",
    "            margin: 0 0 5px 0;",
    "            text-decoration: underline;",
    "        }",
    "        .total-amount {",
    "            width: 35%;",
    "            border: 1px solid #000;",
    "            padding: 10px;",
    "            text-align: right;",
    "        }",
    "        .total-amount h3 {",
    "            margin: 0;",
    "            font-size: 14px;",
    "        }",
    "        .footer {",
    "            margin-top: 20px;",
    "            text-align: center;",
    "            font-size: 10px;",
    "            border-top: 1px solid #ccc;",
    "            padding-top: 10px;",
    "        }",
    "        .legal-text {",
    "            font-size: 9px;",
    "            color: #555;",
    "            margin-top: 5px;",
    "        }",
    "        @media print {",
    "            body { background: #fff; padding: 0; }",
    "            .invoice-container { box-shadow: none; border: none; max-width: 100%; }",
    "        }"
  ].join("\n");

  /** Constrói o HTML completo da factura (igual ao fatura.html original). */
  function buildInvoiceHTML(data) {
    const cfg = data.config || {};
    const doc = data.documento || {};
    const cli = data.cliente || {};
    const itens = Array.isArray(data.itens) ? data.itens : [];
    const emp = cfg.empresa || {};
    const banco = cfg.banco || {};
    const rod = cfg.rodape || {};
    const tipoDoc = doc.tipo || (cfg.documento && cfg.documento.tipo) || "Factura";
    const moeda = doc.moeda || (cfg.documento && cfg.documento.moeda) || "AKZ";

    // Linhas da tabela de produtos/serviços
    var linhasHTML = itens.map(function (item) {
      return (
        "            <tr>\n" +
        "                <td>" + esc(item.ref) + "</td>\n" +
        '                <td class="desc">' + esc(item.descricao) + "</td>\n" +
        "                <td>" + esc(item.quant) + "</td>\n" +
        "                <td>" + esc(item.un) + "</td>\n" +
        "                <td>" + esc(item.precoUnit) + "</td>\n" +
        "                <td>" + esc(item.descPct) + "</td>\n" +
        "                <td>" + esc(item.valorTotal) + "</td>\n" +
        "            </tr>"
      );
    }).join("\n");

    var linhasFinais = linhasHTML.length
      ? linhasHTML
      : '            <tr>\n                <td colspan="7" style="text-align:center;">Sem itens</td>\n            </tr>';

    return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(tipoDoc)} - DOKAMA</title>
    <style>
${CSS}
    </style>
</head>
<body>

<div class="invoice-container">
    <!-- Header -->
    <div class="header">
        <div class="company-details">
            <h2>${esc(emp.nome)}</h2>
            <p><strong>NIF:</strong> ${esc(emp.nif)}</p>
            <p>${esc(emp.localizacao)}</p>
            <p>Tel: ${esc(emp.telefone)} | Email: ${esc(emp.email)}</p>
        </div>
        <div class="invoice-details">
            <h3>${esc(tipoDoc)}</h3>
            <table>
                <tr>
                    <td><strong>Nº Doc:</strong></td>
                    <td>${esc(doc.numDoc)}</td>
                </tr>
                <tr>
                    <td><strong>Data:</strong></td>
                    <td>${esc(doc.data)}</td>
                </tr>
                <tr>
                    <td><strong>Moeda:</strong></td>
                    <td>${esc(moeda)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Client Details -->
    <div class="client-details">
        <h3>Cliente / Destinatário</h3>
        <p><strong>Nome:</strong> ${esc(cli.nome)}</p>
        <p><strong>NIF:</strong> ${esc(cli.nif)}</p>
        <p><strong>Projecto:</strong> ${esc(cli.projecto)}</p>
        <p><strong>Localização:</strong> ${esc(cli.localizacao)}</p>
    </div>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">Ref</th>
                <th style="width: 40%;">Descrição</th>
                <th style="width: 10%;">Quant</th>
                <th style="width: 10%;">Un</th>
                <th style="width: 15%;">Preço Unit.</th>
                <th style="width: 10%;">% Desc</th>
                <th style="width: 10%;">Valor Total</th>
            </tr>
        </thead>
        <tbody>
${linhasFinais}
        </tbody>
    </table>

    <!-- Totals and Bank Info -->
    <div class="totals-section">
        <div class="bank-details">
            <h4>Coordenadas Bancárias / Pagamento</h4>
            <p><strong>Banco:</strong> ${esc(banco.banco)}</p>
            <p><strong>NIB / Conta:</strong> ${esc(banco.nib)}</p>
            <p><strong>IBAN:</strong> ${esc(banco.iban)}</p>
            <p><strong>TITULAR:</strong> ${esc(banco.titular)}</p>
        </div>
        <div class="total-amount">
            <p>Total Líquido</p>
            <h3>${esc(data.totalLiquido)} ${esc(moeda)}</h3>
            <p style="font-size: 10px;">(${esc(data.porExtenso)})</p>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>${esc(rod.processado)}</p>
        <div class="legal-text">
            ${esc(rod.legal)}<br>
            ${esc(rod.legalRodape)}
        </div>
    </div>
</div>

</body>
</html>`;
  }

  return { buildInvoiceHTML: buildInvoiceHTML, esc: esc };
});
