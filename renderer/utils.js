/**
 * utils.js — Formatação de números (padrão PT/AO) e número por extenso (kwanzas).
 * Corre no browser (window) e no Node (main.js).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node
  } else {
    root.FaturaUtils = api; // Browser
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Converte string digitada (com separadores PT ou não) para número.
   * Aceita "95.000,00", "95000", "95000.5", etc.
   */
  function parseNumero(str) {
    if (typeof str === "number") return str;
    if (str === null || str === undefined) return 0;
    // Remove espaços. Se houver vírgula E ponto, assume ponto=milhar, vírgula=decimal.
    var s = String(str).trim();
    if (s.indexOf(",") !== -1 && s.indexOf(".") !== -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.indexOf(",") !== -1) {
      s = s.replace(",", ".");
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /** Formata número para o padrão português: 21850000 -> "21.850.000,00" */
  function formatarNumero(num, decimais) {
    var d = (typeof decimais === "number") ? decimais : 2;
    var n = isNaN(num) ? 0 : num;
    var fixo = Math.abs(n).toFixed(d);
    var partes = fixo.split(".");
    var inteiro = partes[0];
    var decimal = partes[1];
    // separador de milhar com ponto
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var resultado = inteiro + (decimal ? "," + decimal : (d > 0 ? "," + new Array(d + 1).join("0") : ""));
    return (n < 0 ? "-" : "") + resultado;
  }

  // ---- Conversor número -> palavras (por extenso) em português ----
  var UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
  var DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  var CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function ate999(n) {
    if (n === 0) return "";
    if (n === 100) return "cem";
    var partes = [];
    var c = Math.floor(n / 100);
    var resto = n % 100;
    if (c > 0) partes.push(CENTENAS[c]);
    if (resto > 0) {
      if (resto < 20) {
        partes.push(UNIDADES[resto]);
      } else {
        var d = Math.floor(resto / 10);
        var u = resto % 10;
        partes.push(DEZENAS[d] + (u > 0 ? " e " + UNIDADES[u] : ""));
      }
    }
    // junta com " e " entre centena e o resto (ex.: "cento e vinte")
    return partes.join(" e ");
  }

  /** Converte um inteiro (0..999.999.999) em palavras. */
  function inteiroExtenso(n) {
    if (n === 0) return "zero";
    var milhoes = Math.floor(n / 1000000);
    var restoMilhoes = n % 1000000;
    var milhares = Math.floor(restoMilhoes / 1000);
    var unidades = restoMilhoes % 1000;

    var resultado = [];
    if (milhoes > 0) {
      resultado.push(ate999(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
    }
    if (milhares > 0) {
      if (milhares === 1) {
        resultado.push("mil");
      } else {
        resultado.push(ate999(milhares) + " mil");
      }
    }
    if (unidades > 0 || (milhoes === 0 && milhares === 0)) {
      resultado.push(ate999(unidades));
    }
    // Junta blocos com ", " e liga o último bloco com " e " quando apropriado
    var texto = resultado.join(", ");
    // Substitui a última ", " por " e " se o último grupo for pequeno (< 100 ou múltiplo de 100)
    return texto;
  }

  /** Capitaliza a primeira letra. */
  function capitalizar(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converte um valor monetário em kwanzas por extenso.
   * Ex.: 21850000 -> "Vinte e um milhões, oitocentos e cinquenta mil kwanzas"
   * Considera apenas a parte inteira (kwanzas); cêntimos são ignorados (comum em facturas).
   */
  function valorPorExtenso(valor, sufixo) {
    var n = isNaN(valor) ? 0 : Math.floor(valor);
    var suf = (typeof sufixo === "string" && sufixo) ? sufixo : "kwanzas";
    var texto = inteiroExtenso(n);
    return capitalizar(texto) + " " + suf;
  }

  return {
    parseNumero: parseNumero,
    formatarNumero: formatarNumero,
    valorPorExtenso: valorPorExtenso,
    inteiroExtenso: inteiroExtenso,
    capitalizar: capitalizar
  };
});
