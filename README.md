# Gerador de Facturas Pro-Forma — DOKAMA

Aplicação de desktop (Electron) para gerar **Facturas Pro-Forma** da DOKAMA de forma
dinâmica: preenches os dados do cliente e dos produtos/serviços, vês a pré-visualização
em tempo real (com o **mesmo visual** da factura original) e exportas em **PDF** com 1 clique.

A empresa (DOKAMA) está sempre fixa. Só mudam o **cliente** e os **produtos/serviços**.

---

## 1. Requisitos
- **Node.js** 18+ (https://nodejs.org) — já vêm com npm.
- Windows 10/11.

## 2. Instalação (só na primeira vez)
Abre um terminal na pasta do projecto e corre:

```bash
npm install
```

> O `npm install` descarrega o Electron (~100 MB). Corre apenas uma vez.

## 3. Como usar (dia-a-dia)

### Arrancar a aplicação
Na pasta do projecto:

```bash
npm start
```

Abre-se uma janela com duas zonas:
- **Esquerda:** formulário (dados do cliente + tabela de produtos/serviços).
- **Direita:** pré-visualização da factura, actualizada a cada tecla.

### Preencher
1. **Nº Doc.** e **Data** — a data já vem preenchida com o dia de hoje.
2. **Cliente:** Nome, NIF, Projecto, Localização.
3. **Produtos/Serviços:** para cada linha indica Ref., Descrição, Quant., Un.,
   Preço Unit. e (opcional) % Desc.
   - Clica **+ Adicionar linha** para novas linhas.
   - Clica no **🗑** de uma linha para a remover.
   - O **Valor Total** de cada linha e o **Total Líquido** são calculados automaticamente
     (com o formato angolano `21.850.000,00`).
   - O **valor por extenso** (ex.: *"Vinte e um milhões, oitocentos e cinquenta mil kwanzas"*)
     é gerado automaticamente e podes sobrescrevê-lo à mão se quiseres.

### Exportar em PDF
Clica **📄 Exportar PDF**. Escolhe a pasta e o nome do ficheiro. Pronto — a factura fica
num PDF pronto a imprimir/arquivar/enviar.

---

## 4. Alterar os dados fixos da empresa (raro)
Todos os dados fixos da DOKAMA estão num único ficheiro:

```
renderer/config.js
```

Aí defines: nome da empresa, NIF, morada/contactos, **dados bancários (IBAN/NIB)**,
tipo de documento, moeda, rodapé e texto legal. Basta editar uma vez e fica para todas
as facturas.

---

## 5. Criar um executável Windows (.exe) — opcional
Para gerar um ficheiro `.exe` portátil que corre sem instalar nada:

```bash
npm run dist
```

O executável fica na pasta `dist/`.

---

## 6. Estrutura do projecto
```
GeradorFaturas/
├── package.json            # dependências e scripts (start / dist)
├── main.js                 # processo principal Electron (janela, export PDF, guardar)
├── preload.js              # ponte segura entre a UI e o sistema (save dialog, PDF)
├── renderer/
│   ├── index.html          # UI: formulário (esq.) + pré-visualização (dir.)
│   ├── renderer.js         # lógica: dados, cálculos, preview ao vivo, export
│   ├── invoice-template.js # template da factura (igual ao HTML original)
│   ├── utils.js            # formatação de números e valor por extenso
│   ├── config.js           # DADOS FIXOS da DOKAMA (editar só aqui)
│   └── styles.css          # estilos da UI + estilos de impressão A4 (@media print)
└── test/validate.js        # testes dos cálculos/formatação (node test/validate.js)
```

---

## 7. Resolução de problemas
- **"npm não é reconhecido":** instala o Node.js e reabre o terminal.
- **A app não abre:** corre `npm install` outra vez (garante que o Electron descarregou).
- **Mudar de computador:** copia a pasta inteira **excepto** `node_modules`; no novo
  computador corre `npm install` uma vez.
