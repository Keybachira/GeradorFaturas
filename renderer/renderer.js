/**
 * renderer.js — Lógica da interface.
 * Liga o formulário (entrada do utilizador) à pré-visualização e à exportação PDF.
 */
(function () {
  "use strict";

  var U = window.FaturaUtils;
  var T = window.InvoiceTemplate;
  var CFG = window.DOKAMA_CONFIG;

  // ---- Estado da factura ----
  var state = {
    documento: { numDoc: "", data: "", tipo: CFG.documento.tipo },
    cliente: { nome: "", nif: "", projecto: "", localizacao: "" },
    itens: [] // { ref, descricao, quant, un, precoUnit, descPct }
  };

  // ---- Atalhos de elementos ----
  var $ = function (id) { return document.getElementById(id); };
  var itemsBody = $("itemsBody");
  var previewFrame = $("previewFrame");
  var toast = $("toast");

  // ---- Data de hoje no formato dd/mm/aaaa ----
  function hojeFormatado() {
    var d = new Date();
    var dia = String(d.getDate()).padStart(2, "0");
    var mes = String(d.getMonth() + 1).padStart(2, "0");
    var ano = d.getFullYear();
    return dia + "/" + mes + "/" + ano;
  }

  // ---- Próximo número de documento sugerido (FP-ANO/001) ----
  function sugerirNumDoc(seq) {
    var s = (typeof seq === "number" ? seq : 1);
    return CFG.numDocPrefixo + "-" + CFG.numDocAno + "/" + String(s).padStart(3, "0");
  }

  // ---- Cálculos ----
  function calcularLinha(item) {
    var qtd = U.parseNumero(item.quant);
    var preco = U.parseNumero(item.precoUnit);
    var descPct = U.parseNumero(item.descPct); // percentagem
    var bruto = qtd * preco;
    var desconto = bruto * (descPct / 100);
    return bruto - desconto;
  }

  function calcularTotal() {
    return state.itens.reduce(function (acc, item) {
      return acc + calcularLinha(item);
    }, 0);
  }

  // ---- Construir objecto de dados para o template ----
  function buildData() {
    var total = calcularTotal();
    var itensFmt = state.itens.map(function (item, idx) {
      var linha = calcularLinha(item);
      return {
        ref: item.ref || String(idx + 1),
        descricao: item.descricao || "",
        quant: item.quant || "",
        un: item.un || "",
        precoUnit: item.precoUnit ? U.formatarNumero(U.parseNumero(item.precoUnit)) : "",
        descPct: item.descPct ? (item.descPct + "%") : "0%",
        valorTotal: U.formatarNumero(linha)
      };
    });

    return {
      config: CFG,
      documento: {
        numDoc: state.documento.numDoc,
        data: state.documento.data,
        tipo: state.documento.tipo,
        moeda: CFG.documento.moeda
      },
      cliente: state.cliente,
      itens: itensFmt,
      totalLiquido: U.formatarNumero(total),
      porExtenso: U.valorPorExtenso(total, CFG.porExtensoSufixo)
    };
  }

  // ---- Pré-visualização ----
  function atualizarResumo() {
    var el = $("previewResumo");
    if (!el) return;
    var n = state.itens.length;
    var partes = ["A4 · actualiza automaticamente"];
    if (n > 0) {
      partes.push(n + (n === 1 ? " linha" : " linhas"));
      partes.push(U.formatarNumero(calcularTotal()) + " " + CFG.documento.moeda);
    }
    el.textContent = partes.join(" · ");
  }

  function atualizarPreview() {
    var html = T.buildInvoiceHTML(buildData());
    previewFrame.srcdoc = html;
    $("totalDisplay").textContent = U.formatarNumero(calcularTotal());
    atualizarResumo();
  }

  // ---- Tabela de itens (editor) ----
  function criarInput(valor, placeholder, onInput, opts) {
    var inp = document.createElement("input");
    inp.type = (opts && opts.type) || "text";
    inp.value = valor || "";
    inp.placeholder = placeholder || "";
    if (opts && opts.inputmode) inp.inputMode = opts.inputmode;
    if (opts && opts.classe) inp.className = opts.classe;
    if (opts && opts.ariaLabel) inp.setAttribute("aria-label", opts.ariaLabel);
    inp.addEventListener("input", function () {
      onInput(inp.value);
      marcarSujo();
      atualizarPreview();
    });
    return inp;
  }

  /** Cria um botão de acção com ícone do sprite SVG. */
  function criarIcoBtn(idIcone, titulo, classe, aoClicar) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ico-btn" + (classe ? " " + classe : "");
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + idIcone);
    svg.appendChild(use);
    b.appendChild(svg);
    b.addEventListener("click", aoClicar);
    return b;
  }

  /** Move um item para outra posição. */
  function moverItem(de, para) {
    if (para < 0 || para >= state.itens.length || de === para) return;
    var item = state.itens.splice(de, 1)[0];
    state.itens.splice(para, 0, item);
    marcarSujo();
    renderItens();
    atualizarPreview();
  }

  /** Remove um item e oferece "Desfazer" no toast. */
  function removerItem(idx) {
    var removido = state.itens[idx];
    if (!removido) return;
    state.itens.splice(idx, 1);
    marcarSujo();
    renderItens();
    atualizarPreview();
    mostrarToast("Linha removida.", null, {
      rotulo: "Desfazer",
      aoClicar: function () {
        state.itens.splice(idx, 0, removido);
        marcarSujo();
        renderItens();
        atualizarPreview();
        mostrarToast("Linha restaurada.", "success");
      }
    });
  }

  function renderItens() {
    itemsBody.innerHTML = "";
    var totalLinhas = state.itens.length;
    state.itens.forEach(function (item, idx) {
      var tr = document.createElement("tr");

      // Célula do valor da linha (calculada) — criada primeiro para poder actualizar
      var tdValor = document.createElement("td");
      tdValor.className = "col-total";
      var spanValor = document.createElement("span");
      spanValor.className = "row-total";
      spanValor.textContent = U.formatarNumero(calcularLinha(item));
      tdValor.appendChild(spanValor);

      // Recalcula o valor desta linha sempre que um campo muda
      function refreshLinha() {
        spanValor.textContent = U.formatarNumero(calcularLinha(item));
      }

      var tdRef = document.createElement("td");
      tdRef.appendChild(criarInput(item.ref, String(idx + 1), function (v) { item.ref = v; refreshLinha(); },
        { classe: "ta-c", ariaLabel: "Referência da linha " + (idx + 1) }));
      tr.appendChild(tdRef);

      var tdDesc = document.createElement("td");
      tdDesc.appendChild(criarInput(item.descricao, "Descrição do produto/serviço", function (v) { item.descricao = v; refreshLinha(); },
        { ariaLabel: "Descrição da linha " + (idx + 1) }));
      tr.appendChild(tdDesc);

      var tdQtd = document.createElement("td");
      tdQtd.appendChild(criarInput(item.quant, "0", function (v) { item.quant = v; refreshLinha(); },
        { inputmode: "decimal", classe: "ta-r", ariaLabel: "Quantidade da linha " + (idx + 1) }));
      tr.appendChild(tdQtd);

      var tdUn = document.createElement("td");
      tdUn.appendChild(criarInput(item.un, "un", function (v) { item.un = v; refreshLinha(); },
        { classe: "ta-c", ariaLabel: "Unidade da linha " + (idx + 1) }));
      tr.appendChild(tdUn);

      var tdPreco = document.createElement("td");
      tdPreco.appendChild(criarInput(item.precoUnit, "0,00", function (v) { item.precoUnit = v; refreshLinha(); },
        { inputmode: "decimal", classe: "ta-r", ariaLabel: "Preço unitário da linha " + (idx + 1) }));
      tr.appendChild(tdPreco);

      var tdDescPct = document.createElement("td");
      tdDescPct.appendChild(criarInput(item.descPct, "0", function (v) { item.descPct = v; refreshLinha(); },
        { inputmode: "decimal", classe: "ta-r", ariaLabel: "Desconto da linha " + (idx + 1) }));
      tr.appendChild(tdDescPct);

      tr.appendChild(tdValor);

      // Acções da linha: duplicar, mover, remover
      var tdAct = document.createElement("td");
      tdAct.className = "col-act";
      var wrap = document.createElement("div");
      wrap.className = "row-acoes";

      wrap.appendChild(criarIcoBtn("i-copy", "Duplicar linha", "", function () {
        var copia = {
          ref: "", descricao: item.descricao, quant: item.quant,
          un: item.un, precoUnit: item.precoUnit, descPct: item.descPct
        };
        state.itens.splice(idx + 1, 0, copia);
        marcarSujo();
        renderItens();
        atualizarPreview();
        mostrarToast("Linha duplicada.");
      }));

      if (idx > 0) {
        wrap.appendChild(criarIcoBtn("i-arrow-up", "Mover para cima", "", function () { moverItem(idx, idx - 1); }));
      }
      if (idx < totalLinhas - 1) {
        wrap.appendChild(criarIcoBtn("i-arrow-down", "Mover para baixo", "", function () { moverItem(idx, idx + 1); }));
      }

      wrap.appendChild(criarIcoBtn("i-trash", "Remover linha", "danger", function () { removerItem(idx); }));

      tdAct.appendChild(wrap);
      tr.appendChild(tdAct);

      // Enter num campo da linha cria uma nova linha e salta para a descrição
      tr.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          addItem();
          var linhas = itemsBody.querySelectorAll("tr");
          var alvo = linhas[linhas.length - 1];
          if (alvo) {
            var foco = alvo.querySelectorAll("input")[1]; // campo Descrição
            if (foco) foco.focus();
          }
        }
      });

      itemsBody.appendChild(tr);
    });

    atualizarEstadoVazio();
  }

  /** Mostra/ esconde o estado vazio da tabela e o contador de linhas. */
  function atualizarEstadoVazio() {
    var vazio = state.itens.length === 0;
    var empty = $("itemsEmpty");
    var scroll = itemsBody.parentElement; // .items-scroll
    if (empty) empty.hidden = !vazio;
    if (scroll) scroll.style.display = vazio ? "none" : "";

    var count = $("itensCount");
    if (count) {
      count.hidden = vazio;
      if (!vazio) {
        count.textContent = state.itens.length + (state.itens.length === 1 ? " linha" : " linhas");
      }
    }
  }

  function addItem(dados) {
    state.itens.push(dados || { ref: "", descricao: "", quant: "", un: "", precoUnit: "", descPct: "" });
    marcarSujo();
    renderItens();
    atualizarPreview();
  }

  // ---- Toast (com botão de acção opcional, ex.: "Desfazer") ----
  var toastTimer = null;
  var toastAcaoBtn = null;
  var toastAcaoFn = null;

  function esconderToast() {
    toast.classList.remove("show");
    clearTimeout(toastTimer);
    setTimeout(function () {
      if (!toast.classList.contains("show")) toast.innerHTML = "";
    }, 260);
    toastAcaoBtn = null;
    toastAcaoFn = null;
  }

  function mostrarToast(msg, tipo, acao) {
    clearTimeout(toastTimer);
    toast.innerHTML = "";

    var span = document.createElement("span");
    span.textContent = msg;
    toast.appendChild(span);

    toastAcaoBtn = null;
    toastAcaoFn = null;

    if (acao && typeof acao.rotulo === "string" && typeof acao.aoClicar === "function") {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "toast-acao";
      b.textContent = acao.rotulo;
      b.addEventListener("click", function () {
        var fn = toastAcaoFn;
        esconderToast();
        if (fn) fn();
      });
      toast.appendChild(b);
      toastAcaoBtn = b;
      toastAcaoFn = acao.aoClicar;
    }

    toast.className = "toast show" + (tipo ? " " + tipo : "");
    toastTimer = setTimeout(esconderToast, acao ? 6000 : 2600);
  }

  // ---- Alterações não guardadas ----
  var dirty = false;
  var dirtyDot = $("dirtyDot");
  function marcarSujo() {
    if (!dirty) {
      dirty = true;
      if (dirtyDot) dirtyDot.classList.add("on");
    }
  }
  function marcarLimpo() {
    dirty = false;
    if (dirtyDot) dirtyDot.classList.remove("on");
  }

  // ---- Modal de confirmação (substitui o confirm() nativo) ----
  var modalBackdrop = $("modalBackdrop");
  var modalTitulo = $("modalTitulo");
  var modalMsg = $("modalMsg");
  var modalConfirmar = $("modalConfirmar");
  var modalCancelar = $("modalCancelar");
  var modalIco = $("modalIco");
  var modalResolver = null;
  var modalFocoAnterior = null;

  function fecharModal(resultado) {
    modalBackdrop.hidden = true;
    var fn = modalResolver;
    modalResolver = null;
    if (modalFocoAnterior && modalFocoAnterior.focus) modalFocoAnterior.focus();
    if (fn) fn(resultado);
  }

  /**
   * Mostra um modal de confirmação. Devolve uma Promise<boolean>.
   * opts: { titulo, msg, rotuloOk, rotuloCancelar, perigoso }
   */
  function confirmar(opts) {
    return new Promise(function (resolve) {
      modalTitulo.textContent = (opts && opts.titulo) || "Confirmar";
      modalMsg.textContent = (opts && opts.msg) || "";
      modalConfirmar.textContent = (opts && opts.rotuloOk) || "Confirmar";
      modalCancelar.textContent = (opts && opts.rotuloCancelar) || "Cancelar";

      var perigoso = opts && opts.perigoso !== false;
      modalIco.hidden = !perigoso;

      modalResolver = resolve;
      modalFocoAnterior = document.activeElement;
      modalBackdrop.hidden = false;
      // Foco no botão seguro por omissão (evita confirmar por acidente)
      (perigoso ? modalCancelar : modalConfirmar).focus();
    });
  }

  if (modalCancelar) modalCancelar.addEventListener("click", function () { fecharModal(false); });
  if (modalConfirmar) modalConfirmar.addEventListener("click", function () { fecharModal(true); });
  if (modalBackdrop) {
    modalBackdrop.addEventListener("mousedown", function (e) {
      if (e.target === modalBackdrop) fecharModal(false);
    });
  }

  // ---- Painel de atalhos ----
  var atalhosBackdrop = $("atalhosBackdrop");
  var btnAtalhos = $("btnAtalhos");
  function abrirAtalhos() { if (atalhosBackdrop) atalhosBackdrop.hidden = false; }
  function fecharAtalhos() { if (atalhosBackdrop) atalhosBackdrop.hidden = true; }
  if (btnAtalhos) btnAtalhos.addEventListener("click", abrirAtalhos);
  var atalhosFechar = $("atalhosFechar");
  if (atalhosFechar) atalhosFechar.addEventListener("click", fecharAtalhos);
  if (atalhosBackdrop) {
    atalhosBackdrop.addEventListener("mousedown", function (e) {
      if (e.target === atalhosBackdrop) fecharAtalhos();
    });
  }
  function algumModalAberto() {
    return (modalBackdrop && !modalBackdrop.hidden) || (atalhosBackdrop && !atalhosBackdrop.hidden);
  }



  // ---- Eventos dos campos do formulário ----
  function bindCampo(id, grupo, chave) {
    $(id).addEventListener("input", function () {
      state[grupo][chave] = $(id).value;
      marcarSujo();
      atualizarPreview();
    });
  }

  bindCampo("numDoc", "documento", "numDoc");
  bindCampo("dataDoc", "documento", "data");
  bindCampo("clienteNome", "cliente", "nome");
  bindCampo("clienteProjecto", "cliente", "projecto");
  bindCampo("clienteLocal", "cliente", "localizacao");

  // ---- Máscara de data dd/mm/aaaa (escreve só números, as barras aparecem sozinhas) ----
  var inData = $("dataDoc");
  function mascararData(valor) {
    var d = String(valor).replace(/\D/g, "").slice(0, 8);
    var out = d;
    if (d.length >= 5) out = d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
    else if (d.length >= 3) out = d.slice(0, 2) + "/" + d.slice(2);
    return out;
  }
  inData.addEventListener("input", function () {
    var formatado = mascararData(inData.value);
    if (formatado !== inData.value) {
      var noFim = inData.selectionStart === inData.value.length;
      inData.value = formatado;
      if (noFim) inData.setSelectionRange(formatado.length, formatado.length);
    }
    state.documento.data = inData.value;
    marcarSujo();
    atualizarPreview();
  });

  // ---- NIF: só dígitos + aviso se o comprimento não for o esperado ----
  var inNif = $("clienteNif");
  var erroNif = $("erroClienteNif");
  var NIF_TAMANHOS = [9, 10, 14]; // NIF nacional / conta / NIF de empresa em Angola
  function validarNif() {
    var v = inNif.value.trim();
    var field = inNif.closest(".field");
    if (!v) { limparErro(field, erroNif); return true; }
    var ok = /^\d+$/.test(v) && NIF_TAMANHOS.indexOf(v.length) !== -1;
    if (ok) {
      limparErro(field, erroNif);
    } else {
      mostrarErro(field, erroNif, "O NIF tem normalmente 9, 10 ou 14 dígitos.");
    }
    return ok;
  }
  inNif.addEventListener("input", function () {
    var limpo = inNif.value.replace(/\D/g, "").slice(0, 14);
    if (limpo !== inNif.value) inNif.value = limpo;
    state.cliente.nif = inNif.value;
    marcarSujo();
    atualizarPreview();
    // Só valida quando já tem dígitos suficientes para não incomodar a meio da escrita
    if (inNif.value.length >= 9) validarNif();
    else limparErro(inNif.closest(".field"), erroNif);
  });
  inNif.addEventListener("blur", validarNif);

  // ---- Helpers de erro inline ----
  function mostrarErro(field, el, msg) {
    if (!field || !el) return;
    field.classList.add("invalid");
    el.innerHTML = "";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-alert");
    svg.appendChild(use);
    el.appendChild(svg);
    el.appendChild(document.createTextNode(msg));
    el.hidden = false;
  }
  function limparErro(field, el) {
    if (field) field.classList.remove("invalid");
    if (el) { el.hidden = true; el.innerHTML = ""; }
  }
  function limparErrosCliente() {
    limparErro($("clienteNome").closest(".field"), $("erroClienteNome"));
    limparErro(inNif.closest(".field"), erroNif);
  }


  // ---- Tipo de documento: select com opção "OUTRO" ----
  var TIPO_OUTRO = "OUTRO";
  var selTipo = $("tipoDoc");
  var inpTipoOutro = $("tipoDocOutro");

  function tipoOutroVisivel(valor) { return valor === TIPO_OUTRO; }

  function aplicarTipoDoc(valor) {
    state.documento.tipo = valor;
    var isOutro = tipoOutroVisivel(valor);
    inpTipoOutro.hidden = !isOutro;
    if (!isOutro) inpTipoOutro.value = "";
    selTipo.value = valor;
    marcarSujo();
    atualizarPreview();
  }

  selTipo.addEventListener("change", function () {
    aplicarTipoDoc(selTipo.value);
  });

  bindCampo("tipoDocOutro", "documento", "tipo");

  // ---- Adicionar linha (botão principal e o do estado vazio) ----
  $("btnAddItem").addEventListener("click", function () {
    addItem();
    var linhas = itemsBody.querySelectorAll("tr");
    if (linhas.length) {
      var foco = linhas[linhas.length - 1].querySelectorAll("input")[1];
      if (foco) foco.focus();
    }
  });
  var btnAddItemEmpty = $("btnAddItemEmpty");
  if (btnAddItemEmpty) btnAddItemEmpty.addEventListener("click", function () { $("btnAddItem").click(); });

  // ---- Clientes recentes (guardados localmente, 1 clique para repetir) ----
  var CLIENTES_KEY = "dokama.clientes";
  var MAX_CLIENTES = 6;
  var recentesWrap = $("recentes");
  var recentesChips = $("recentesChips");

  function lerClientes() {
    try {
      var raw = localStorage.getItem(CLIENTES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function guardarClienteActual() {
    var nome = (state.cliente.nome || "").trim();
    if (!nome) return;
    var lista = lerClientes().filter(function (c) {
      return (c.nome || "").toLowerCase() !== nome.toLowerCase();
    });
    lista.unshift({
      nome: nome,
      nif: state.cliente.nif || "",
      projecto: state.cliente.projecto || "",
      localizacao: state.cliente.localizacao || ""
    });
    try { localStorage.setItem(CLIENTES_KEY, JSON.stringify(lista.slice(0, MAX_CLIENTES))); } catch (e) { /* ignora */ }
    renderRecentes();
  }

  function aplicarCliente(c) {
    state.cliente = {
      nome: c.nome || "",
      nif: c.nif || "",
      projecto: c.projecto || "",
      localizacao: c.localizacao || ""
    };
    preencherFormulario();
    limparErrosCliente();
    marcarSujo();
    atualizarPreview();
    mostrarToast("Cliente \"" + state.cliente.nome + "\" aplicado.", "success");
  }

  function renderRecentes() {
    if (!recentesChips) return;
    var lista = lerClientes().filter(function (c) { return c && c.nome; });
    if (!lista.length) {
      if (recentesWrap) recentesWrap.hidden = true;
      recentesChips.innerHTML = "";
      return;
    }
    if (recentesWrap) recentesWrap.hidden = false;
    recentesChips.innerHTML = "";
    lista.forEach(function (c) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = c.nome;
      chip.title = c.nome + (c.nif ? "  ·  NIF " + c.nif : "");
      chip.addEventListener("click", function () { aplicarCliente(c); });
      recentesChips.appendChild(chip);
    });
  }

  // ---- Botão adicionar linha ----
  $("btnAddItem").addEventListener("click", function () { addItem(); });

  // ---- Validação antes de exportar ----
  function validarAntesDeExportar() {
    var problemas = [];

    if (!(state.cliente.nome || "").trim()) {
      problemas.push({ campo: "clienteNome", msg: "Indica o nome do cliente." });
    }
    if (state.itens.length === 0) {
      problemas.push({ campo: "btnAddItem", msg: "Adiciona pelo menos um produto ou serviço." });
    } else {
      var semValor = state.itens.every(function (it) { return calcularLinha(it) <= 0; });
      if (semValor) {
        problemas.push({ campo: "itemsBody", msg: "Nenhuma linha tem quantidade e preço válidos." });
      }
    }

    if (!problemas.length) return true;

    // Marca o primeiro campo com problema e leva o utilizador até ele
    var primeiro = problemas[0];
    var el = $(primeiro.campo);
    if (primeiro.campo === "clienteNome") {
      mostrarErro($("clienteNome").closest(".field"), $("erroClienteNome"), primeiro.msg);
    }
    if (el && el.focus) {
      el.focus();
      if (el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    mostrarToast(problemas.length === 1 ? primeiro.msg : (problemas.length + " problemas impedem a exportação."), "error");
    return false;
  }

  // ---- Exportar PDF ----
  $("btnExportar").addEventListener("click", async function () {
    if (!validarAntesDeExportar()) return;

    var html = T.buildInvoiceHTML(buildData());
    var numDoc = (state.documento.numDoc || "factura").replace(/[^\w\-\/]/g, "_");
    var nome = numDoc + ".pdf";
    var btn = $("btnExportar");

    // Estado de carregamento no botão (evita duplos cliques)
    var rotuloOriginal = btn.querySelector("span").textContent;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.querySelector("span").textContent = "A gerar…";
    mostrarToast("A gerar o PDF…");

    try {
      var res = await window.faturaAPI.exportarPDF(html, nome);
      if (res && res.ok) {
        guardarClienteActual();
        marcarLimpo();
        mostrarToast("PDF guardado com sucesso!", "success");
      } else if (res && res.canceled) {
        mostrarToast("Exportação cancelada.");
      } else {
        mostrarToast("Erro ao exportar: " + (res && res.error ? res.error : "desconhecido"), "error");
      }
    } catch (e) {
      mostrarToast("Erro ao exportar: " + String(e && e.message ? e.message : e), "error");
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      btn.querySelector("span").textContent = rotuloOriginal;
    }
  });

  // ---- Guardar rascunho ----
  $("btnGuardar").addEventListener("click", async function () {
    var numDoc = (state.documento.numDoc || "factura").replace(/[^\w\-\/]/g, "_");
    var json = JSON.stringify(state, null, 2);
    var res = await window.faturaAPI.guardarRascunho(json, numDoc + "-rascunho.json");
    if (res && res.ok) {
      guardarClienteActual();
      marcarLimpo();
      mostrarToast("Rascunho guardado!", "success");
    }
    else if (res && !res.canceled) mostrarToast("Erro ao guardar rascunho.", "error");
  });

  $("btnAbrir").addEventListener("click", async function () {
    var res = await window.faturaAPI.abrirRascunho();
    if (res && res.ok) {
      try {
        var dados = JSON.parse(res.conteudo);
        state.documento = Object.assign({ numDoc: "", data: "", tipo: CFG.documento.tipo }, dados.documento || {});
        state.cliente = Object.assign({ nome: "", nif: "", projecto: "", localizacao: "" }, dados.cliente || {});
        state.itens = Array.isArray(dados.itens) ? dados.itens : [];
        preencherFormulario();
        limparErrosCliente();
        renderItens();
        atualizarPreview();
        marcarLimpo();
        mostrarToast("Rascunho carregado!", "success");
      } catch (e) {
        mostrarToast("Ficheiro de rascunho inválido.", "error");
      }
    }
  });

  // ---- Nova factura (limpar) ----
  function iniciarNova() {
    state.documento = { numDoc: sugerirNumDoc(1), data: hojeFormatado(), tipo: CFG.documento.tipo };
    state.cliente = { nome: "", nif: "", projecto: "", localizacao: "" };
    state.itens = [];
    preencherFormulario();
    limparErrosCliente();
    addItem();
    marcarLimpo();
    var foco = $("clienteNome");
    if (foco) foco.focus();
    mostrarToast("Nova factura iniciada.");
  }

  $("btnNovo").addEventListener("click", async function () {
    if (dirty) {
      var ok = await confirmar({
        titulo: "Começar nova factura?",
        msg: "Tens alterações que ainda não foram guardadas. Se continuares, esses dados serão perdidos.",
        rotuloOk: "Descartar e começar",
        rotuloCancelar: "Cancelar"
      });
      if (!ok) return;
    }
    iniciarNova();
  });

  // ---- Tabs de alternância (mobile/tablet): Editar <-> Pré-visualizar ----
  var workspace = document.getElementById("workspace");
  var tabForm = document.getElementById("tabForm");
  var tabPreview = document.getElementById("tabPreview");
  function mostrarTab(qual) {
    if (!workspace) return;
    if (qual === "preview") {
      workspace.classList.add("view-preview");
      if (tabForm) tabForm.classList.remove("active");
      if (tabPreview) tabPreview.classList.add("active");
    } else {
      workspace.classList.remove("view-preview");
      if (tabForm) tabForm.classList.add("active");
      if (tabPreview) tabPreview.classList.remove("active");
    }
  }
  if (tabForm) tabForm.addEventListener("click", function () { mostrarTab("form"); });
  if (tabPreview) tabPreview.addEventListener("click", function () { mostrarTab("preview"); });

  // ---- Preencher campos do formulário a partir do estado ----
  function preencherFormulario() {
    $("numDoc").value = state.documento.numDoc;
    $("dataDoc").value = state.documento.data;
    $("clienteNome").value = state.cliente.nome;
    $("clienteNif").value = state.cliente.nif;
    $("clienteProjecto").value = state.cliente.projecto;
    $("clienteLocal").value = state.cliente.localizacao;

    // Tipo de documento: se o valor guardado não existir nas opções, cai em "OUTRO"
    var tipo = state.documento.tipo || "";
    var existe = false;
    for (var i = 0; i < selTipo.options.length; i++) {
      if (selTipo.options[i].value === tipo) { existe = true; break; }
    }
    if (existe) {
      selTipo.value = tipo;
      inpTipoOutro.hidden = true;
      inpTipoOutro.value = "";
    } else {
      selTipo.value = TIPO_OUTRO;
      inpTipoOutro.hidden = false;
      inpTipoOutro.value = tipo;
    }
  }

  // ---- Zoom da pré-visualização ----
  var ZOOM_MIN = 0.5, ZOOM_MAX = 1.5, ZOOM_PASSO = 0.1;
  var ZOOM_KEY = "dokama.zoom";
  var zoom = 1;
  var scaler = $("previewScaler");
  var zoomValue = $("zoomValue");

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
  }

  function aplicarZoom() {
    zoom = clampZoom(zoom);
    // Altura real da folha (medida no DOM; fallback se ainda não houver layout)
    var baseH = previewFrame.offsetHeight || Math.max(620, window.innerHeight - 220);
    scaler.style.height = Math.round(baseH * zoom) + "px";
    scaler.style.transform = "scale(" + zoom + ")";
    if (zoomValue) zoomValue.textContent = Math.round(zoom * 100) + "%";
    var btnIn = $("btnZoomIn"), btnOut = $("btnZoomOut");
    if (btnIn) btnIn.disabled = zoom >= ZOOM_MAX - 0.001;
    if (btnOut) btnOut.disabled = zoom <= ZOOM_MIN + 0.001;
    try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch (e) { /* ignora */ }
  }

  function setZoom(z) { zoom = clampZoom(z); aplicarZoom(); }

  var btnZoomIn = $("btnZoomIn");
  var btnZoomOut = $("btnZoomOut");
  if (btnZoomIn) btnZoomIn.addEventListener("click", function () { setZoom(zoom + ZOOM_PASSO); });
  if (btnZoomOut) btnZoomOut.addEventListener("click", function () { setZoom(zoom - ZOOM_PASSO); });

  // ---- Modo expandir (esconder formulário) ----
  var btnZoomFit = $("btnZoomFit");
  function toggleFocus() {
    var on = !workspace.classList.contains("focus-preview");
    workspace.classList.toggle("focus-preview", on);
    if (btnZoomFit) btnZoomFit.classList.toggle("active", on);
    if (on) {
      // Ajusta à largura disponível
      var largura = scaler.parentElement.clientWidth;
      setZoom(clampZoom(largura / 840));
    } else {
      setZoom(1);
    }
  }
  if (btnZoomFit) btnZoomFit.addEventListener("click", toggleFocus);

  // Ctrl + scroll sobre a pré-visualização = zoom
  var previewPanel = document.querySelector(".preview-panel");
  if (previewPanel) {
    previewPanel.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(zoom + (e.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO));
      }
    }, { passive: false });
  }

  // Atalhos de teclado
  document.addEventListener("keydown", function (e) {
    // Esc fecha modais primeiro
    if (e.key === "Escape") {
      if (modalBackdrop && !modalBackdrop.hidden) { fecharModal(false); return; }
      if (atalhosBackdrop && !atalhosBackdrop.hidden) { fecharAtalhos(); return; }
      if (workspace.classList.contains("focus-preview")) {
        workspace.classList.remove("focus-preview");
        if (btnZoomFit) btnZoomFit.classList.remove("active");
        setZoom(1);
      }
      return;
    }

    // "?" abre os atalhos
    if (e.key === "?" && !algumModalAberto()) {
      var alvo = e.target;
      var emCampo = alvo && (alvo.tagName === "INPUT" || alvo.tagName === "SELECT" || alvo.tagName === "TEXTAREA");
      if (!emCampo) { e.preventDefault(); abrirAtalhos(); return; }
    }

    if (!(e.ctrlKey || e.metaKey)) return;

    var k = (e.key || "").toLowerCase();
    if (k === "n") { e.preventDefault(); $("btnNovo").click(); }
    else if (k === "s") { e.preventDefault(); $("btnGuardar").click(); }
    else if (k === "o") { e.preventDefault(); $("btnAbrir").click(); }
    else if (k === "e") { e.preventDefault(); $("btnExportar").click(); }
    else if (e.key === "=" || e.key === "+") { e.preventDefault(); setZoom(zoom + ZOOM_PASSO); }
    else if (e.key === "-") { e.preventDefault(); setZoom(zoom - ZOOM_PASSO); }
    else if (e.key === "0") { e.preventDefault(); setZoom(1); }
  });

  // Reaplica o zoom quando a janela muda de tamanho
  window.addEventListener("resize", function () {
    if (workspace.classList.contains("focus-preview")) {
      var largura = scaler.parentElement.clientWidth;
      setZoom(clampZoom(largura / 840));
    } else {
      aplicarZoom();
    }
  });

  // ---- Inicialização ----
  function init() {
    try {
      var salvo = parseFloat(localStorage.getItem(ZOOM_KEY));
      if (!isNaN(salvo)) zoom = clampZoom(salvo);
    } catch (e) { /* ignora */ }
    state.documento.numDoc = sugerirNumDoc(1);
    state.documento.data = hojeFormatado();
    preencherFormulario();
    renderRecentes();
    addItem(); // começa com uma linha vazia
    atualizarPreview();
    aplicarZoom();
    marcarLimpo(); // factura nova em branco = nada para guardar ainda
    $("clienteNome").focus(); // começa directamente no campo mais usado
  }

  init();
})();

