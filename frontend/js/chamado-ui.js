function textoChamado(tag, texto, classe = '') {
  const item = document.createElement(tag);
  item.className = classe;
  item.textContent = texto;
  return item;
}

function formatarDataRegistro(data) {
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function criarPaginacao(renderizar, paginaInicial = 1, limite = 20) {
  const elemento = document.createElement('nav');
  elemento.className = 'chamado-paginacao';
  elemento.setAttribute('aria-label', 'Paginação');
  const anterior = textoChamado('button', 'Anterior');
  const proxima = textoChamado('button', 'Próxima');
  anterior.type = proxima.type = 'button';
  const resumo = textoChamado('span', '');
  resumo.setAttribute('role', 'status');
  elemento.append(anterior, resumo, proxima);
  const tamanho = Math.min(100, Math.max(1, Number(limite) || 20));
  let pagina = Math.max(1, Number(paginaInicial) || 1);
  let itens = [];
  function mostrar() {
    const paginas = Math.max(1, Math.ceil(itens.length / tamanho));
    pagina = Math.min(pagina, paginas);
    anterior.disabled = pagina === 1;
    proxima.disabled = pagina === paginas;
    elemento.hidden = itens.length <= tamanho;
    resumo.textContent = 'Página ' + pagina + ' de ' + paginas;
    renderizar(itens.slice((pagina - 1) * tamanho, pagina * tamanho), pagina, itens.length);
  }
  anterior.addEventListener('click', () => { pagina -= 1; mostrar(); });
  proxima.addEventListener('click', () => { pagina += 1; mostrar(); });
  return {
    elemento,
    atualizar(novos, reiniciar = false) {
      itens = novos;
      if (reiniciar) pagina = 1;
      mostrar();
    },
    ultima(novos) {
      itens = novos;
      pagina = Math.max(1, Math.ceil(itens.length / tamanho));
      mostrar();
    },
  };
}

function criarHistoricoChamado(servico) {
  const bloco = document.createElement('div');
  const lista = document.createElement('ol');
  lista.className = 'registros-lista';
  const paginacao = criarPaginacao(eventos => {
    lista.replaceChildren(...eventos.map(evento => {
      const item = document.createElement('li');
      const autoria = evento.origem === 'automatica'
        ? 'Origem automática' : evento.autor?.nome ?? 'Autoria não registrada';
      item.append(textoChamado('p', evento.texto),
        textoChamado('small', formatarDataRegistro(evento.ocorrido_em) + ' · ' + autoria));
      return item;
    }));
  });
  bloco.append(lista, paginacao.elemento);
  paginacao.atualizar(servico.historico);
  return bloco;
}

function criarDiscussaoChamado(numero, autor) {
  const bloco = document.createElement('div');
  bloco.className = 'chamado-discussao';
  const lista = document.createElement('ol');
  lista.className = 'registros-lista';
  const vazio = textoChamado('p', 'Ainda não há comentários.');
  const paginacao = criarPaginacao(comentarios => {
    lista.replaceChildren(...comentarios.map(comentario => {
      const item = document.createElement('li');
      item.append(textoChamado('strong', comentario.autor), textoChamado('p', comentario.texto),
        textoChamado('small', formatarDataRegistro(comentario.criado_em)));
      return item;
    }));
  });
  function atualizar(ultima = false) {
    const comentarios = listarComentariosChamado(numero);
    vazio.hidden = comentarios.length > 0;
    if (ultima) paginacao.ultima(comentarios);
    else paginacao.atualizar(comentarios);
  }
  const form = document.createElement('form');
  form.className = 'request-comment-form';
  const label = textoChamado('label', 'Escrever comentário');
  label.htmlFor = 'comentario';
  const campo = document.createElement('textarea');
  campo.id = campo.name = 'comentario';
  campo.required = true;
  campo.maxLength = 2000;
  campo.rows = 3;
  campo.placeholder = 'Digite sua mensagem…';
  const enviar = textoChamado('button', 'Enviar comentário', 'request-primary');
  enviar.type = 'submit';
  const feedback = textoChamado('p', '');
  feedback.setAttribute('role', 'status');
  form.append(label, campo, enviar, feedback);
  form.addEventListener('submit', evento => {
    evento.preventDefault();
    try {
      salvarComentarioChamado(numero, autor, campo.value);
      campo.value = '';
      feedback.textContent = 'Comentário enviado.';
      atualizar(true);
    } catch (erro) {
      feedback.textContent = erro.message;
    }
  });
  bloco.append(vazio, lista, paginacao.elemento, form);
  atualizar();
  return bloco;
}

function criarAnexosChamado(servico) {
  const bloco = document.createElement('div');
  bloco.className = 'chamado-anexos';
  const abertura = lerChamadosDaSessao().find(item => item.numero === servico.numero)?.fotoId
    ?? servico.fotoAberturaId;
  const conclusao = servico.fotoConclusaoId
    ?? (servico.fotoId?.startsWith('reparo-') ? servico.fotoId : null);
  for (const [finalidade, id] of [['abertura', abertura], ['conclusão', conclusao]]) {
    const secao = document.createElement('section');
    const titulo = textoChamado('h3', 'Foto da ' + finalidade);
    const mensagem = textoChamado('p', id ? 'Carregando imagem…' : 'Nenhuma foto anexada.');
    mensagem.setAttribute('role', 'status');
    secao.append(titulo, mensagem);
    bloco.append(secao);
    if (id) carregarAnexoChamado(id, finalidade, secao, mensagem);
  }
  return bloco;
}

async function carregarAnexoChamado(id, finalidade, secao, mensagem) {
  try {
    const arquivo = await acessarFotos('readonly', fotos => fotos.get(id));
    if (!arquivo) throw new Error('A imagem não está disponível neste navegador.');
    const url = URL.createObjectURL(arquivo);
    const imagem = document.createElement('img');
    imagem.alt = 'Foto da ' + finalidade + ' do chamado';
    imagem.src = url;
    await imagem.decode();
    const download = textoChamado('a', 'Baixar foto da ' + finalidade);
    download.href = url;
    download.download = arquivo.name;
    mensagem.hidden = true;
    secao.append(imagem, download);
    addEventListener('pagehide', evento => {
      if (!evento.persisted) URL.revokeObjectURL(url);
    }, { once: true });
  } catch (erro) {
    mensagem.textContent = erro.message;
  }
}

function criarExclusaoCadastro(tipo, item, aoExcluir) {
  const bloco = document.createElement('section');
  bloco.className = 'cadastro-exclusao';
  const botao = textoChamado('button', 'Excluir ' + (tipo === 'local' ? 'local' : 'categoria'), 'request-primary request-primary--secondary');
  botao.type = 'button';
  bloco.append(botao);
  botao.addEventListener('click', () => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'cadastro-dialogo';
    const titulo = textoChamado('h2', 'Excluir ' + item.nome + '?');
    titulo.id = 'titulo-exclusao';
    dialogo.setAttribute('aria-labelledby', titulo.id);
    const texto = textoChamado('p', 'A exclusão remove este cadastro. Cadastros vinculados devem ser desativados para preservar os registros.');
    const erro = textoChamado('p', '');
    erro.setAttribute('role', 'alert');
    const confirmar = textoChamado('button', 'Confirmar exclusão', 'request-primary');
    const cancelar = textoChamado('button', 'Cancelar', 'request-primary request-primary--secondary');
    confirmar.type = cancelar.type = 'button';
    cancelar.addEventListener('click', () => dialogo.close());
    confirmar.addEventListener('click', () => {
      try {
        excluirCadastro(tipo, item.id);
        dialogo.close();
        aoExcluir();
      } catch (falha) {
        erro.textContent = falha.message;
      }
    });
    dialogo.append(titulo, texto, erro, confirmar, cancelar);
    dialogo.addEventListener('close', () => dialogo.remove(), { once: true });
    document.body.append(dialogo);
    dialogo.showModal();
    cancelar.focus();
  });
  return bloco;
}
