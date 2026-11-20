(() => {
  const pagina = document.body.dataset.pagina;
  const conteudo = document.querySelector('#conteudo');
  const consulta = new URLSearchParams(location.search);
  const chavePerfil = 'zela-perfil-tecnico';
  const perfis = Object.fromEntries(listarTecnicos().map(({ id, nome }) => [id, nome]));
  const perfil = sessionStorage.getItem(chavePerfil);
  if (!Object.hasOwn(perfis, perfil)) {
    location.replace('../../login.html');
    return;
  }
  const estados = { aberto: 'Aberto', andamento: 'Em atendimento', concluido: 'Concluído' };
  const classesEstado = { aberto: 'open', andamento: 'progress', concluido: 'done' };
  const rotas = {
    inicio: 'inicio-tecnico', lista: 'atendimentos-tecnico', detalhes: 'detalhes-tecnico',
    iniciar: 'iniciar-atendimento-tecnico', atualizacoes: 'atualizacoes-tecnico',
    concluir: 'concluir-atendimento-tecnico', concluidos: 'concluidos-tecnico',
    registrar: 'registrar-conclusao-tecnico', colaborador: 'colaborador-tecnico',
  };
  const icones = {
    climatizacao: 'M3 8h12a3 3 0 1 0-3-3M2 13h18a2 2 0 1 1-2 3M4 18h8a2 2 0 1 1-2 3',
    eletrica: 'M13 2 5 13h7l-1 9 8-12h-7z',
    iluminacao: 'M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0l-1 3H9z',
    computador: 'M3 4h18v13H3zM8 21h8m-4-4v4',
    mobiliario: 'M5 5h14v9H5zM4 14h16M6 14v6m12-6v6',
    seta: 'M9 6l6 6-6 6',
  };
  function url(destino, servico) {
    const parametros = new URLSearchParams();
    if (servico) {
      parametros.set('numero', servico.numero);
      if (pagina === 'concluidos' || consulta.get('origem') === 'concluidos') {
        parametros.set('origem', 'concluidos');
      }
    }
    return './' + rotas[destino] + '.html' + (servico ? '?' + parametros : '');
  }

  const voltarPara = consulta.get('origem') === 'concluidos' ? 'concluidos' : 'lista';

  function podeConsultar(servico) {
    return servico.principal === perfil || servico.colaboradores.includes(perfil);
  }

  function podeAlterar(servico, estado) {
    return servico?.principal === perfil && servico.estado === estado;
  }

  function rotaServico(servico) {
    if (servico.principal !== perfil) return 'colaborador';
    return servico.estado === 'aberto' ? 'iniciar' : 'detalhes';
  }

  function elemento(tag, classe, texto) {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto !== undefined) no.textContent = texto;
    return no;
  }

  function icone(nome) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', icones[nome]);
    svg.append(path);
    return svg;
  }

  function ilustracao(arquivo) {
    const imagem = elemento('img', 'tecnico-ilustracao');
    imagem.src = '../../assestes/' + arquivo;
    imagem.alt = '';
    imagem.width = 640;
    imagem.height = 460;
    return imagem;
  }

  function ilustrar(bloco, arquivo) {
    const texto = elemento('div');
    texto.append(...bloco.childNodes);
    bloco.classList.add('tecnico-ilustrado');
    bloco.append(texto, ilustracao(arquivo));
    return bloco;
  }

  function status(estado) {
    return elemento('span', 'status status--' + classesEstado[estado], estados[estado]);
  }

  function link(texto, destino, servico, secundario = false) {
    const acao = elemento('a', 'request-primary', texto);
    acao.classList.toggle('request-primary--secondary', secundario);
    acao.href = url(destino, servico);
    return acao;
  }

  function botao(texto) {
    const acao = elemento('button', 'request-primary', texto);
    acao.type = 'submit';
    return acao;
  }

  function painel(titulo, ...filhos) {
    const secao = elemento('section', 'detail-panel');
    secao.append(elemento('h2', '', titulo), ...filhos);
    return secao;
  }

  function resumo(servico, titulo = servico.titulo) {
    const secao = elemento('section', 'detail-panel tecnico-resumo');
    secao.append(
      elemento('p', 'ticket-number', 'Chamado #' + servico.numero),
      elemento('h1', '', titulo),
      status(servico.estado),
    );
    return secao;
  }

  function tituloPagina(titulo, descricao) {
    conteudo.append(elemento('h1', '', titulo), elemento('p', 'ticket-intro', descricao));
  }

  function acoes(...itens) {
    const grupo = elemento('div', 'tecnico-acoes');
    grupo.append(...itens);
    return grupo;
  }

  function cartao(servico) {
    const item = elemento('li');
    const destino = elemento('a', 'ticket');
    destino.href = url(rotaServico(servico), servico);
    const imagem = elemento('span', 'ticket__icon');
    imagem.append(icone(servico.icone));
    const resumo = elemento('div', 'ticket__summary');
    resumo.append(
      elemento('h3', '', servico.titulo),
      elemento('p', '', '#' + servico.numero + ' · ' + servico.local),
    );
    const seta = icone('seta');
    seta.classList.add('ticket__arrow');
    destino.append(imagem, resumo, status(servico.estado), seta);
    item.append(destino);
    return item;
  }

  function listaServicos(servicos, mensagem) {
    const grupo = elemento('div', 'tecnico-lista');
    const lista = elemento('ul', 'ticket-list');
    const vazio = elemento('div', 'tickets-empty');
    const imagemVazio = ilustracao('02_sem_chamados.svg');
    imagemVazio.loading = 'lazy';
    const textoVazio = elemento('p', '', mensagem);
    textoVazio.setAttribute('role', 'status');
    vazio.append(imagemVazio, textoVazio);
    const paginacao = criarPaginacao((itens, pagina, total) => {
      lista.replaceChildren(...itens.map(cartao));
      vazio.hidden = total > 0;
    });
    grupo.append(lista, vazio, paginacao.elemento);

    function atualizar(itens) {
      paginacao.atualizar(ordenarFila(itens), true);
    }

    atualizar(servicos);
    return { grupo, atualizar };
  }

  function inicio(servicos) {
    const cabecalho = elemento('header', 'tecnico-inicio');
    cabecalho.append(
      elemento('h1', '', 'Meus atendimentos'),
      elemento('p', 'ticket-intro', 'Confira o que precisa ser atendido.'),
    );
    conteudo.append(ilustrar(cabecalho, '08_gestao_chamados.svg'));
    const metricas = elemento('div', 'tecnico-metricas');
    for (const [rotulo, estado] of [['Pendentes', 'aberto'], ['Em atendimento', 'andamento']]) {
      const bloco = elemento('a', 'tecnico-metrica');
      bloco.href = url('lista') + '#estado=' + estado;
      const total = servicos.filter(servico => servico.estado === estado).length;
      bloco.append(elemento('strong', '', total), elemento('span', '', rotulo));
      metricas.append(bloco);
    }
    const proximos = ['andamento', 'aberto'].flatMap(estado => servicos
      .filter(servico => servico.estado === estado)
      .sort((a, b) => a.numero.localeCompare(b.numero))).slice(0, 2);
    const { grupo } = listaServicos(proximos, 'Nenhum serviço pendente ou em atendimento.');
    conteudo.append(metricas, elemento('h2', 'tecnico-lista-titulo', 'Próximos serviços'), grupo);
    conteudo.append(acoes(link('Ver todos os atendimentos', 'lista', null, true)));
  }

  function normalizar(texto) {
    return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function prepararLista(servicos, somenteConcluidos) {
    tituloPagina(
      somenteConcluidos ? 'Serviços concluídos' : 'Atendimentos',
      somenteConcluidos ? 'Consulte o que você já finalizou.' : 'Encontre seus serviços rapidamente.',
    );
    const busca = elemento('div', 'tecnico-busca');
    const rotulo = elemento('label', 'search-label', somenteConcluidos ? 'Buscar serviço concluído' : 'Buscar atendimento');
    const campo = elemento('input', 'ticket-search');
    campo.id = 'buscar-servico';
    campo.type = 'search';
    campo.placeholder = 'Título, local ou número';
    rotulo.htmlFor = campo.id;
    busca.append(rotulo, campo);
    conteudo.append(busca);

    const { grupo, atualizar } = listaServicos(servicos, 'Nenhum atendimento encontrado.');
    const chaveFiltros = 'zela-filtros-tecnico-' + perfil + '-' + pagina;
    const salvos = JSON.parse(sessionStorage.getItem(chaveFiltros) ?? '{}');
    const filtroInicial = new URLSearchParams(location.hash.slice(1)).get('estado');
    let estado = somenteConcluidos ? '' : filtroInicial ?? salvos.estado ?? '';
    if (!Object.hasOwn(estados, estado)) estado = '';
    campo.value = filtroInicial ? '' : salvos.busca ?? '';
    const filtrar = () => {
      sessionStorage.setItem(chaveFiltros, JSON.stringify({ estado, busca: campo.value }));
      const termo = normalizar(campo.value.trim().replace(/^#/, ''));
      atualizar(servicos.filter(servico => {
        const texto = normalizar([servico.numero, servico.titulo, servico.local].join(' '));
        return (!estado || servico.estado === estado) && texto.includes(termo);
      }));
    };

    campo.addEventListener('input', filtrar);
    if (!somenteConcluidos) {
      const filtros = elemento('div', 'ticket-filters');
      filtros.setAttribute('role', 'group');
      filtros.setAttribute('aria-label', 'Filtrar por estado');
      for (const [valor, texto] of [['', 'Todos'], ['aberto', 'Abertos'], ['andamento', 'Em atendimento'], ['concluido', 'Concluídos']]) {
        const filtro = elemento('button', '', texto);
        filtro.type = 'button';
        filtro.setAttribute('aria-pressed', String(valor === estado));
        filtro.addEventListener('click', () => {
          estado = valor;
          filtros.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
          filtro.setAttribute('aria-pressed', 'true');
          filtrar();
        });
        filtros.append(filtro);
      }
      conteudo.append(filtros);
    }
    conteudo.append(grupo);
    filtrar();
    if (filtroInicial) history.replaceState(null, '', location.href.split('#')[0]);
    const destino = somenteConcluidos ? 'lista' : 'concluidos';
    conteudo.append(acoes(link(somenteConcluidos ? 'Todos os atendimentos' : 'Ver serviços concluídos', destino, null, true)));
  }

  function mensagem() {
    const feedback = elemento('p', 'tecnico-feedback');
    feedback.setAttribute('role', 'status');
    return feedback;
  }

  function campoTexto(nome, rotulo, exemplo, linhas) {
    const grupo = elemento('div');
    const label = elemento('label', '', rotulo);
    const campo = elemento('textarea');
    campo.id = campo.name = nome;
    campo.placeholder = exemplo;
    campo.rows = linhas;
    campo.required = true;
    campo.maxLength = 5000;
    label.htmlFor = campo.id;
    grupo.append(label, campo);
    return { grupo, campo };
  }

  function lerTexto(campo, aviso) {
    const texto = campo.value.trim();
    if (!texto) {
      aviso.textContent = 'Preencha o campo antes de salvar.';
      campo.focus();
    }
    return texto;
  }

  function detalhes(servico) {
    const arquivo = servico.estado === 'concluido'
      ? '04_atendimento_concluido.svg'
      : '03_em_atendimento.svg';
    conteudo.append(
      ilustrar(resumo(servico), arquivo),
      painel('Local do atendimento', elemento('p', '', servico.local), elemento('p', 'tecnico-texto', servico.descricao)),
    );
    if (servico.estado === 'concluido' && servico.nota) {
      const conclusao = painel('Conclusão do serviço', elemento('p', 'tecnico-texto', servico.nota));
      conteudo.append(conclusao);

    }
    conteudo.append(painel('Imagens do chamado', criarAnexosChamado(servico)));
    const historico = link('Ver histórico e comentários', 'atualizacoes', servico, true);
    if (podeAlterar(servico, 'andamento')) {
      conteudo.append(acoes(link('Concluir atendimento', 'registrar', servico), historico));
    } else {
      conteudo.append(acoes(historico));
    }
  }

  function iniciar(servico) {
    const form = elemento('form');
    const aviso = mensagem();
    form.append(acoes(botao('Iniciar atendimento'), link('Voltar à lista', voltarPara, null, true)), aviso);
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      const atual = listarServicos().find(item => item.numero === servico.numero);
      if (!podeAlterar(atual, 'aberto')) {
        location.replace(url(rotaServico(atual), atual));
        return;
      }
      try {
        salvarEventoServico(atual, 'Técnico iniciou o atendimento.', { estado: 'andamento' });
        location.assign(url('detalhes', servico));
      } catch {
        aviso.textContent = 'Não foi possível iniciar o atendimento. Tente novamente.';
      }
    });
    conteudo.append(
      resumo(servico),
      ilustrar(painel('Onde ir',
        elemento('p', '', servico.local),
        elemento('p', 'tecnico-texto', servico.descricao),
      ), '07_localizacao.svg'),
      painel('Próximo passo', elemento('p', 'tecnico-texto', 'Inicie o serviço quando estiver no local.')),
      form,
    );
  }

  function atualizacoes(servico) {
    conteudo.append(resumo(servico, 'Atualizações do chamado'),
      painel('Histórico do serviço', criarHistoricoChamado(servico)),
      painel('Comentários', criarDiscussaoChamado(servico.numero, perfis[perfil] + ' · Técnico')));
  }

  function registrar(servico) {
    tituloPagina('Concluir atendimento', 'Descreva o reparo antes de finalizar.');
    const form = elemento('form', 'request-comment-form tecnico-conclusao');
    const nota = campoTexto('nota', 'Nota de conclusão (obrigatória)', 'Ex.: Foi substituído o componente...', 4);
    const foto = elemento('input');
    foto.type = 'file';
    foto.id = 'foto-reparo';
    foto.accept = '.jpg,.jpeg,.png,image/jpeg,image/png';
    const label = elemento('label', '', 'Foto após manutenção (opcional)');
    label.htmlFor = foto.id;
    const fotoGrupo = elemento('div', 'tecnico-foto');
    const aviso = mensagem();
    const previa = elemento('img', 'tecnico-foto__previa');
    previa.alt = 'Prévia da foto do reparo';
    previa.hidden = true;
    const remover = elemento('button', 'tecnico-foto__remover', 'Remover foto');
    remover.type = 'button';
    remover.hidden = true;
    let fonte;
    const limparPrevia = () => {
      if (fonte) URL.revokeObjectURL(fonte);
      previa.removeAttribute('src');
      previa.hidden = remover.hidden = true;
    };
    foto.addEventListener('change', () => {
      limparPrevia();
      aviso.textContent = '';
      const arquivo = foto.files[0];
      if (!arquivo) return;
      if (!['image/jpeg', 'image/png'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
        aviso.textContent = 'Selecione uma imagem JPG ou PNG de até 5 MiB.';
        foto.value = '';
        return;
      }
      fonte = URL.createObjectURL(arquivo);
      previa.src = fonte;
      previa.hidden = remover.hidden = false;
    });
    remover.addEventListener('click', () => {
      foto.value = '';
      limparPrevia();
      foto.focus();
    });
    fotoGrupo.append(label, elemento('p', 'tecnico-texto', 'JPG ou PNG de até 5 MiB.'), foto, previa, remover);
    const confirmar = botao('Concluir atendimento');
    const campos = elemento('div', 'detail-panel');
    campos.append(nota.grupo, fotoGrupo);
    form.append(campos, aviso, acoes(confirmar, link('Cancelar', 'detalhes', servico, true)));

    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      const texto = lerTexto(nota.campo, aviso);
      if (!texto) return;
      const arquivo = foto.files[0];
      if (arquivo && (!['image/jpeg', 'image/png'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) {
        aviso.textContent = 'Selecione uma imagem JPG ou PNG de até 5 MiB.';
        foto.focus();
        return;
      }
      confirmar.disabled = true;
      let fotoId;
      try {
        if (arquivo) {
          fotoId = 'reparo-' + crypto.randomUUID();
          await acessarFotos('readwrite', fotos => fotos.put(arquivo, fotoId));
        }
        const atual = listarServicos().find(item => item.numero === servico.numero);
        if (!podeAlterar(atual, 'andamento')) throw new Error('Atendimento atualizado');
        salvarEventoServico(atual, 'Atendimento concluído.', { estado: 'concluido', nota: texto, fotoConclusaoId: fotoId });
        location.assign(url('detalhes', servico));
      } catch {
        if (fotoId) await acessarFotos('readwrite', fotos => fotos.delete(fotoId)).catch(() => {});
        aviso.textContent = 'Não foi possível concluir o atendimento. Tente novamente.';
        confirmar.disabled = false;
      }
    });
    conteudo.append(painel(servico.titulo, elemento('p', 'tecnico-texto', '#' + servico.numero + ' · ' + servico.local)), form);
  }

  function colaborador(servico) {
    const equipe = [servico.principal, ...servico.colaboradores].map(pessoa => {
      const funcao = pessoa === servico.principal ? 'Responsável principal' : 'Colaborador';
      return elemento('p', '', perfis[pessoa] + ' · ' + (pessoa === perfil ? 'Você, ' + funcao.toLowerCase() : funcao));
    });
    const cabecalho = resumo(servico);
    cabecalho.append(elemento('span', 'tecnico-papel', 'Colaborador'));
    conteudo.append(
      ilustrar(cabecalho, {
        aberto: '07_localizacao.svg',
        andamento: '03_em_atendimento.svg',
        concluido: '04_atendimento_concluido.svg',
      }[servico.estado]),
      painel('Local do atendimento', elemento('p', '', servico.local), elemento('p', 'tecnico-texto', servico.descricao)),
      painel('Equipe atual', ...equipe),
      painel('Você pode consultar e comentar', elemento('p', 'tecnico-texto', 'Apenas o responsável principal altera o estado.')),
      acoes(link('Adicionar comentário', 'atualizacoes', servico)),
    );
  }

  const perfilDialogo = document.querySelector('#perfil');
  if (perfilDialogo) {
    document.querySelectorAll('[data-perfil]').forEach(botao => {
      botao.addEventListener('click', () => perfilDialogo.showModal());
    });
    perfilDialogo.querySelector('[data-nome-perfil]').textContent = perfis[perfil];
    perfilDialogo.querySelector('[data-sair]').addEventListener('click', () => {
      sessionStorage.removeItem(chavePerfil);
      sessionStorage.removeItem('zela-acesso-demonstracao');
    });
  }

  const servicos = listarServicos().filter(podeConsultar);
  if (pagina === 'inicio') {
    inicio(servicos);
  } else if (pagina === 'lista' || pagina === 'concluidos') {
    const concluidos = pagina === 'concluidos';
    prepararLista(concluidos ? servicos.filter(servico => servico.estado === 'concluido') : servicos, concluidos);
  } else {
    const padrao = pagina === 'iniciar' ? '000131' : '000124';
    const servico = servicos.find(item => item.numero === (consulta.get('numero') ?? padrao));
    const colaboracao = servico && servico.principal !== perfil;
    const voltar = document.querySelector('#voltar');
    voltar.href = url(voltarPara);
    if (!servico) {
      tituloPagina('Atendimento indisponível', 'Este chamado não está atribuído ao perfil selecionado.');
      conteudo.append(acoes(link('Voltar à lista', voltarPara)));
    } else if (pagina === 'atualizacoes') {
      voltar.href = url(rotaServico(servico), servico);
      atualizacoes(servico);
    } else if (colaboracao && pagina === 'colaborador') {
      colaborador(servico);
    } else if (pagina === 'iniciar' && podeAlterar(servico, 'aberto')) {
      iniciar(servico);
    } else if (pagina === 'detalhes' && rotaServico(servico) === 'detalhes') {
      detalhes(servico);
    } else if (pagina === 'concluir' && podeAlterar(servico, 'andamento')) {
      location.replace(url('registrar', servico));
    } else if (pagina === 'registrar' && podeAlterar(servico, 'andamento')) {
      voltar.href = url('detalhes', servico);
      registrar(servico);
    } else {
      location.replace(url(rotaServico(servico), servico));
    }
  }
})();
