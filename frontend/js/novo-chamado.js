const formulario = document.querySelector('#novo-chamado');
const categoria = document.querySelector('#categoria');
const localizacao = document.querySelector('#localizacao');
const voltar = document.querySelector('#voltar');
const nomeEtapa = document.querySelector('#nome-etapa');
const detalhes = document.querySelector('#detalhes');
const etapas = [
  { painel: categoria, nome: 'Categoria' },
  { painel: localizacao, nome: 'Localização' },
  { painel: detalhes, nome: 'Descrição' },
];
let indiceEtapa = 0;
const confirmacao = document.querySelector('#confirmacao');
const seletorFoto = document.querySelector('#seletor-foto');
const previaFoto = document.querySelector('#previa-foto');
const imagemFoto = document.querySelector('#imagem-foto');
const removerFoto = document.querySelector('#remover-foto');
const { titulo, descricao, foto } = formulario.elements;
const nomeFoto = document.querySelector('#nome-foto');
const erroArquivo = document.querySelector('#erro-arquivo');
const recuperarFoto = document.querySelector('#recuperar-foto');
const enviarChamado = document.querySelector('#enviar-chamado');
const enviarSemFoto = document.querySelector('#enviar-sem-foto');
let simularFalhaFoto = new URLSearchParams(window.location.search).get('falha-foto') === '1';
let urlFoto;

function exibirFalhaFoto(exibir) {
  recuperarFoto.hidden = !exibir;
  enviarChamado.hidden = exibir;
  if (exibir) recuperarFoto.querySelector('h2').focus();
}

const bloco = formulario.elements.bloco;
const ambiente = formulario.elements.ambiente;

const catalogo = lerCatalogo();
const categoriasAtivas = catalogo.categoria.filter(item => item.ativo);
const opcoesOriginais = [...categoria.querySelectorAll('.category-option')];
opcoesOriginais.forEach(opcao => opcao.remove());
for (const item of categoriasAtivas) {
  const opcao = opcoesOriginais[Number(item.id)] ?? document.createElement('label');
  opcao.className = 'category-option';
  const campo = opcao.querySelector('input') ?? document.createElement('input');
  const simbolo = document.createElement('span');
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = item.icone || '◆';
  campo.type = 'radio';
  campo.name = 'categoria';
  campo.value = item.nome;
  campo.required = true;
  opcao.replaceChildren(campo, opcao.querySelector('svg') ?? simbolo, item.nome);
  categoria.querySelector('fieldset').append(opcao);
}
const locaisAtivos = catalogo.local.filter(item => item.ativo);
const blocos = [...new Set(locaisAtivos.map(item => item.bloco))].sort();
bloco.replaceChildren(new Option('Selecione um bloco', ''));
for (const nome of blocos) bloco.add(new Option(nome, nome));

if (!categoriasAtivas.length || !locaisAtivos.length) {
  categoria.querySelector('button').disabled = true;
  document.querySelector('#ajuda-categoria').textContent = 'Não há categorias ou locais disponíveis para registrar um chamado.';
}

function atualizarAmbientes() {
  const ambientes = locaisAtivos.filter(item => item.bloco === bloco.value);
  const instrução = ambientes.length ? 'Selecione um ambiente' : 'Selecione um bloco primeiro';

  ambiente.replaceChildren(new Option(instrução, ''));
  for (const { id, nome } of ambientes) {
    ambiente.add(new Option(nome, id));
  }

  ambiente.disabled = ambientes.length === 0;
}

function exibirEtapa(moverFoco = false) {
  if (!confirmacao.hidden) return;

  const id = window.location.hash.slice(1);
  const solicitada = etapas.findIndex(({ painel }) => painel.id === id);
  const categoriaPreenchida = Boolean(formulario.elements.categoria.value);
  const localPreenchido = Boolean(bloco.value && ambiente.value);
  const ultimaDisponivel = categoriaPreenchida ? (localPreenchido ? 2 : 1) : 0;
  indiceEtapa = Math.min(Math.max(solicitada, 0), ultimaDisponivel);

  const atual = etapas[indiceEtapa];
  if (solicitada > indiceEtapa) {
    window.history.replaceState(null, '', '#' + atual.painel.id);
  }

  for (const { painel } of etapas) {
    painel.hidden = painel !== atual.painel;
    painel.querySelector('fieldset').disabled = painel.hidden;
  }

  nomeEtapa.textContent = atual.nome;
  const anterior = etapas[indiceEtapa - 1];
  voltar.href = anterior ? '#' + anterior.painel.id : './index.html';

  if (moverFoco) atual.painel.querySelector('h1').focus();
}

let registrandoChamado = false;

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (registrandoChamado || !confirmacao.hidden) return;
  const proxima = etapas[indiceEtapa + 1];
  if (proxima) {
    window.location.hash = proxima.painel.id;
    return;
  }

  for (const campo of [titulo, descricao]) {
    if (!campo.value.trim()) {
      campo.setCustomValidity('Preencha este campo.');
      campo.reportValidity();
      return;
    }
  }

  if (evento.submitter === enviarSemFoto) {
    foto.value = '';
    atualizarFoto();
  }

  if (foto.files.length && simularFalhaFoto) {
    simularFalhaFoto = false;
    exibirFalhaFoto(true);
    return;
  }

  const erroRegistro = document.querySelector('#erro-registro');
  erroRegistro.hidden = true;

  const dadosChamado = {
    titulo: titulo.value.trim(),
    categoria_id: categoriasAtivas.find(item => item.nome === formulario.elements.categoria.value)?.id,
    local_id: ambiente.value,
    descricao: descricao.value.trim(),
    categoria: formulario.elements.categoria.value,
    local: bloco.selectedOptions[0].textContent + ' · ' + ambiente.selectedOptions[0].textContent,
  };
  let chamado;
  let fotoId;
  registrandoChamado = true;
  try {
    const arquivo = foto.files[0];
    if (arquivo) {
      fotoId = crypto.randomUUID();
      try {
        await acessarFotos('readwrite', fotos => fotos.put(arquivo, fotoId));
      } catch {
        exibirFalhaFoto(true);
        return;
      }
    }

    chamado = registrarChamado({ ...dadosChamado, fotoId });
  } catch {
    if (fotoId) acessarFotos('readwrite', fotos => fotos.delete(fotoId)).catch(() => {});
    erroRegistro.hidden = false;
    erroRegistro.textContent = 'Não foi possível registrar o chamado nesta sessão. Tente novamente.';
    return;
  } finally {
    registrandoChamado = false;
  }

  document.querySelector('#numero-confirmacao').textContent = '#' + chamado.numero;
  document.querySelector('#acompanhar-chamado').href = './detalhes-chamado.html?numero=' + chamado.numero;
  formulario.hidden = true;
  confirmacao.hidden = false;
  voltar.closest('header').hidden = true;
  confirmacao.querySelector('h1').focus();
});

voltar.addEventListener('click', (evento) => {
  if (indiceEtapa > 0 && confirmacao.hidden) {
    evento.preventDefault();
    window.history.back();
  }
});

for (const campo of [titulo, descricao]) {
  campo.addEventListener('input', () => campo.setCustomValidity(''));
}

function atualizarFoto() {
  if (urlFoto) URL.revokeObjectURL(urlFoto);
  urlFoto = undefined;
  previaFoto.hidden = true;
  seletorFoto.hidden = false;
  imagemFoto.removeAttribute('src');
  nomeFoto.textContent = '';
  erroArquivo.textContent = '';
  exibirFalhaFoto(false);

  const arquivo = foto.files[0];
  if (!arquivo) return;

  if (!['image/jpeg', 'image/png'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
    foto.value = '';
    erroArquivo.textContent = 'Escolha uma foto JPG ou PNG de até 5 MiB.';
    return;
  }

  urlFoto = URL.createObjectURL(arquivo);
  imagemFoto.src = urlFoto;
  nomeFoto.textContent = arquivo.name;
  previaFoto.hidden = false;
  seletorFoto.hidden = true;
  removerFoto.focus();
}

foto.addEventListener('change', atualizarFoto);
removerFoto.addEventListener('click', () => {
  foto.value = '';
  atualizarFoto();
  foto.focus();
});

bloco.addEventListener('change', atualizarAmbientes);
window.addEventListener('hashchange', () => exibirEtapa(true));
exibirEtapa();
