const coresEstado = {
  'Aberto': 'status--open',
  'Em atendimento': 'status--progress',
  'Concluído': 'status--done',
};

function criarElemento(tag, texto, classe) {
  const elemento = document.createElement(tag);
  elemento.textContent = texto;
  if (classe) elemento.className = classe;
  return elemento;
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function criarCartao(chamado) {
  const cartao = criarElemento('li', '', 'ticket');
  const icone = criarElemento('span', '▤', 'ticket__icon');
  icone.setAttribute('aria-hidden', 'true');
  const resumo = criarElemento('div', '', 'ticket__summary');
  const titulo = criarElemento('h2', '');
  const link = criarElemento('a', chamado.titulo);
  link.href = './detalhes-chamado.html?numero=' + encodeURIComponent(chamado.numero);
  titulo.append(link);
  resumo.append(titulo, criarElemento('p', chamado.local), criarElemento('small', 'Movimentação · ' + formatarDataRegistro(chamado.ultima_movimentacao_em), 'ultima-movimentacao'));
  const estado = criarElemento('p', chamado.estado, 'status ' + coresEstado[chamado.estado]);
  cartao.append(icone, resumo, estado);
  return cartao;
}

const lista = document.querySelector('#lista-chamados');
if (lista) {
  const busca = document.querySelector('#buscar-chamado');
  const filtros = document.querySelectorAll('[data-estado]');
  const vazio = document.querySelector('#sem-resultados');
  let estadoSelecionado = '';
  const chamados = ordenarFila(listarChamados());
  const paginacao = criarPaginacao((itens, pagina, total) => {
    lista.replaceChildren(...itens.map(criarCartao));
    vazio.hidden = total > 0;
  });
  lista.after(paginacao.elemento);

  function atualizarLista() {
    const termo = normalizar(busca.value).replace(/^#/, '');
    const resultados = chamados.filter(chamado => {
      const texto = normalizar(chamado.titulo + ' ' + chamado.local + ' ' + chamado.numero);
      return texto.includes(termo) && (!estadoSelecionado || chamado.estado === estadoSelecionado);
    });
    paginacao.atualizar(resultados, true);
  }

  busca.addEventListener('input', atualizarLista);
  for (const filtro of filtros) {
    filtro.addEventListener('click', () => {
      estadoSelecionado = filtro.dataset.estado;
      for (const botao of filtros) botao.setAttribute('aria-pressed', String(botao === filtro));
      atualizarLista();
    });
  }
  atualizarLista();
}

const detalhes = document.querySelector('#detalhes-chamado');
if (detalhes) {
  const numero = new URLSearchParams(window.location.search).get('numero');
  const chamado = listarChamados().find(item => item.numero === numero);
  if (!chamado) {
    document.querySelector('#chamado-ausente').hidden = false;
  } else {
    for (const campo of ['titulo', 'estado', 'local', 'responsavel', 'descricao']) {
      document.querySelector('#' + campo + '-chamado').textContent = chamado[campo];
    }
    document.querySelector('#numero-chamado').textContent = 'Chamado #' + chamado.numero;
    document.querySelector('#estado-chamado').classList.add(coresEstado[chamado.estado]);
    const ilustracoes = {
      'Em atendimento': '03_em_atendimento.svg',
      'Concluído': '04_atendimento_concluido.svg',
    };
    const arquivo = ilustracoes[chamado.estado];
    if (arquivo) {
      const imagem = document.querySelector('#ilustracao-estado');
      imagem.src = '../../assestes/' + arquivo;
      imagem.hidden = false;
    }
    const servico = listarServicos().find(item => item.numero === numero);
    document.querySelector('#historico-chamado').append(criarHistoricoChamado(servico));
    if (chamado.estado === 'Concluído' && chamado.nota) {
      document.querySelector('#nota-conclusao').textContent = chamado.nota;
      document.querySelector('#conclusao-chamado').hidden = false;
    }
    for (const link of document.querySelectorAll('[data-destino]')) {
      link.search = new URLSearchParams({ numero: chamado.numero }).toString();
    }
    document.querySelector('#chamado-encontrado').hidden = false;
  }
}
