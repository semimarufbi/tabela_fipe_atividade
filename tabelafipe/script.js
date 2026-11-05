const BASE = "https://brasilapi.com.br/api/fipe";
const $ = id => document.getElementById(id);

// Pega o primeiro campo que existir no objeto (a API pode usar nomes diferentes)
const pegar = (o, campos) => { for (const c of campos) if (o[c] !== undefined) return o[c]; return ""; };
const codigoDe = o => pegar(o, ["valor", "codigo", "code"]);
const nomeDe = o => pegar(o, ["nome", "modelo", "name", "label"]);

// Faz a requisição mostrando "processando" na tela
async function buscar(url) {
    $("status").textContent = "⏳ Processando requisição...";
    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Não encontrado (erro " + resp.status + ")");
        const dados = await resp.json();
        $("status").textContent = "";
        return dados;
    } catch (e) {
        $("status").textContent = "❌ Erro: " + e.message;
        throw e;
    }
}

function preencher(select, lista, textoPadrao) {
    select.innerHTML = "<option value=''>" + textoPadrao + "</option>";
    lista.forEach(item => {
        const op = document.createElement("option");
        op.value = codigoDe(item);
        op.textContent = nomeDe(item);
        select.appendChild(op);
    });
    select.disabled = false;
}

function limpar(...selects) {
    selects.forEach(s => { s.innerHTML = ""; s.disabled = true; });
    $("btnDetalhes").disabled = true;
}

// Parâmetro opcional da tabela de referência
const ref = () => $("tabela").value ? "?tabela_referencia=" + $("tabela").value : "";

// 1) Tabelas de referência: /fipe/tabelas/v1
async function carregarTabelas() {
    try {
        const tabelas = await buscar(BASE + "/tabelas/v1");
        tabelas.forEach(t => {
            const op = document.createElement("option");
            op.value = t.codigo;
            op.textContent = t.mes;
            $("tabela").appendChild(op);
        });
    } catch (e) {
        // se falhar, continua com "Mais recente"
    }
}

// 2) Marcas: /fipe/marcas/v1/{tipo}
async function carregarMarcas() {
    limpar($("marca"), $("modelo"), $("ano"));
    const marcas = await buscar(BASE + "/marcas/v1/" + $("tipo").value + ref());
    preencher($("marca"), marcas, "Selecione a marca");
}

// 3) Modelos: /fipe/veiculos/v1/{tipo}/{marca}
async function carregarModelos() {
    limpar($("modelo"), $("ano"));
    if (!$("marca").value) return;
    const modelos = await buscar(BASE + "/veiculos/v1/" + $("tipo").value + "/" + $("marca").value + ref());
    preencher($("modelo"), modelos, "Selecione o modelo");
}

// 4) Anos: /fipe/anos/v1/{tipo}/{marca}/{modelo}
async function carregarAnos() {
    limpar($("ano"));
    if (!$("modelo").value) return;
    const anos = await buscar(BASE + "/anos/v1/" + $("tipo").value + "/" + $("marca").value + "/" + $("modelo").value + ref());
    preencher($("ano"), anos, "Selecione o ano");
}

// 5) Detalhes: /fipe/detalhes/v1/{tipo}/{marca}/{modelo}/{ano}
async function consultarDetalhes() {
    const url = BASE + "/detalhes/v1/" + $("tipo").value + "/" + $("marca").value + "/" +
        $("modelo").value + "/" + $("ano").value + ref();
    mostrar(await buscar(url));
}

// 6) Preço por código FIPE: /fipe/preco/v1/{codigoFipe}
async function consultarCodigo() {
    const fipe = $("codigo").value.trim();
    if (!fipe) { $("status").textContent = "Informe um código FIPE."; return; }
    mostrar(await buscar(BASE + "/preco/v1/" + encodeURIComponent(fipe) + ref()));
}

// Mostra o resultado (aceita um objeto ou uma lista)
function mostrar(dados) {
    const lista = Array.isArray(dados) ? dados : [dados];
    let html = "<table><tr><th>Marca</th><th>Modelo</th><th>Ano</th><th>Combustível</th><th>Código FIPE</th><th>Referência</th><th>Preço</th></tr>";
    lista.forEach(d => {
        html += "<tr><td>" + (d.marca || "") + "</td><td>" + (d.modelo || "") + "</td><td>" + (d.anoModelo || "") +
            "</td><td>" + (d.combustivel || "") + "</td><td>" + (d.codigoFipe || "") +
            "</td><td>" + (d.mesReferencia || "") + "</td><td><b>" + (d.valor || "") + "</b></td></tr>";
    });
    $("resultado").innerHTML = html + "</table>";
}

$("tipo").addEventListener("change", carregarMarcas);
$("tabela").addEventListener("change", carregarMarcas);
$("marca").addEventListener("change", carregarModelos);
$("modelo").addEventListener("change", carregarAnos);
$("ano").addEventListener("change", () => { $("btnDetalhes").disabled = !$("ano").value; });
$("btnDetalhes").addEventListener("click", consultarDetalhes);
$("btnCodigo").addEventListener("click", consultarCodigo);
$("codigo").addEventListener("keydown", e => { if (e.key === "Enter") consultarCodigo(); });

carregarTabelas().finally(carregarMarcas);