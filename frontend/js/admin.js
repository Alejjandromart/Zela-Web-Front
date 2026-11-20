(() => {
  if (sessionStorage.getItem('zela-perfil-admin') !== 'ativo') {
    location.replace('../../login.html');
    return;
  }
  const main = document.querySelector('main');
  const estados = { aberto: 'Aberto', andamento: 'Em atendimento', concluido: 'Concluído' };
  const classes = { aberto: 'open', andamento: 'progress', concluido: 'done' };
  let aviso = '';
  let parametros;

  function el(tag, classe, texto) {
    const item = document.createElement(tag);
    if (classe) item.className = classe;
    if (texto !== undefined) item.textContent = texto;
    return item;
  }

  function rota(tela, dados = {}) {
    const query = new URLSearchParams(dados).toString();
    return '#' + tela + (query ? '?' + query : '');
  }

  function ir(tela, texto = '', dados = {}) {
    aviso = texto;
    const destino = rota(tela, dados);
    if (location.hash === destino) render();
    else location.hash = destino;
  }

  function link(texto, tela, dados, classe = 'request-primary request-primary--secondary') {
    const item = el('a', classe, texto);
    item.href = rota(tela, dados);
    return item;
  }

  function titulo(nome, descricao, anterior, dados, acao) {
    document.title = nome + ' | Zela';
    if (anterior) {
      const destino = {
        fila: 'Chamados', chamado: 'Detalhes do chamado', mais: 'Cadastros',
        locais: 'Locais', categorias: 'Categorias', tecnicos: 'Equipe',
      }[anterior];
      main.append(link('← ' + destino, anterior, dados, 'admin-back'));
    }
    const cabecalho = el('header', 'admin-heading');
    const texto = el('div');
    const h1 = el('h1', '', nome);
    h1.tabIndex = -1;
    texto.append(h1);
    if (descricao) texto.append(el('p', '', descricao));
    cabecalho.append(texto);
    if (acao) cabecalho.append(acao);
    main.append(cabecalho);
    if (aviso) {
      const mensagem = el('p', 'admin-notice', aviso);
      mensagem.setAttribute('role', 'status');
      main.append(mensagem);
      aviso = '';
    }
  }

  function secao(nome, itens, acao) {
    const bloco = el('section', 'admin-secao');
    const cabecalho = el('header', 'admin-secao__titulo');
    cabecalho.append(el('h2', '', nome));
    if (acao) cabecalho.append(acao);
    bloco.append(cabecalho, itens);
    return bloco;
  }

  function painel(nome, ...itens) {
    const bloco = el('section', 'detail-panel');
    bloco.append(el('h2', '', nome), ...itens);
    return bloco;
  }

  function status(chamado) {
    return el('span', 'status admin-status status--' + classes[chamado.estado], estados[chamado.estado]);
  }

  function linha(nome, detalhe, tela, dados, final = el('span', '', '›')) {
    const card = link('', tela, dados, 'admin-row');
    const texto = el('div');
    texto.append(el('strong', '', nome), el('small', '', detalhe));
    if (final.textContent === '›') final.setAttribute('aria-hidden', 'true');
    card.append(texto, final);
    return card;
  }

  function acoes(...itens) {
    const grupo = el('div', 'admin-actions');
    grupo.append(...itens);
    return grupo;
  }

  function input(nome, valor = '', tipo = 'text') {
    const campo = el('input');
    campo.name = nome;
    campo.type = tipo;
    campo.value = valor;
    campo.required = tipo !== 'search' && tipo !== 'checkbox';
    if (nome === 'nome') campo.maxLength = 120;
    if (tipo === 'email') campo.maxLength = 254;
    return campo;
  }

  function rotulo(texto, campo) {
    const label = el('label', '', texto);
    label.append(campo);
    return label;
  }

  function select(nome, opcoes, valor = '') {
    const campo = el('select');
    campo.name = nome;
    for (const [id, texto] of opcoes) campo.add(new Option(texto, id));
    campo.value = valor;
    if (campo.selectedIndex < 0) campo.selectedIndex = 0;
    return campo;
  }

  function formulario(texto, campos, enviar, secundario) {
    const form = el('form', 'admin-form admin-form--edicao');
    const botao = el('button', 'request-primary', texto);
    const erro = el('p', 'admin-alert');
    erro.setAttribute('role', 'alert');
    erro.hidden = true;
    const botoes = secundario ? acoes(botao, secundario) : acoes(botao);
    form.append(...campos, erro, botoes);
    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      botao.disabled = true;
      erro.hidden = true;
      try {
        await enviar(new FormData(form));
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
        erro.tabIndex = -1;
        erro.focus();
      } finally {
        botao.disabled = false;
      }
    });
    return form;
  }

  function nomeValido(valor) {
    const nome = valor.trim();
    if (!nome) throw new Error('Preencha o nome.');
    return nome;
  }

  function normalizar(texto) {
    return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function corresponde(termo, ...valores) {
    return normalizar(valores.join(' ')).includes(normalizar(termo.trim().replace(/^#/, '')));
  }

  function lista(container, itens, vazio) {
    container.replaceChildren(...(itens.length ? itens : [el('p', 'admin-empty', vazio)]));
  }

  function listaPesquisavel(rotuloBusca, renderizar) {
    const grupo = el('div', 'admin-form');
    const campo = input('busca', parametros.get('busca') ?? '', 'search');
    const resultados = el('div', 'admin-table admin-list');
    grupo.append(rotulo(rotuloBusca, campo), resultados);
    main.append(grupo);
    const atualizar = () => renderizar(campo.value, resultados);
    campo.addEventListener('input', atualizar);
    atualizar();
  }

  function linhaChamado(item, tecnicos, retorno = {}) {
    const fila = new URLSearchParams(retorno).toString();
    const card = linha(item.titulo, '#' + item.numero + ' · ' + item.local,
      'chamado', { numero: item.numero, retorno: fila }, status(item));
    card.classList.add('admin-row--chamado');
    card.firstElementChild.append(el('small', 'ultima-movimentacao', 'Movimentação · ' + formatarDataRegistro(item.ultima_movimentacao_em)));
    const responsavel = tecnicos.get(item.principal) ?? 'Sem responsável';
    const seta = el('span', 'admin-seta', '›');
    seta.setAttribute('aria-hidden', 'true');
    card.append(el('span', 'admin-responsavel', responsavel), seta);
    return card;
  }

  function listaChamados(container, chamados, tecnicos, retorno, vazio) {
    lista(container, chamados.map(item => linhaChamado(item, tecnicos, retorno)), vazio);
    if (chamados.length) {
      const cabecalho = el('div', 'admin-table__head');
      cabecalho.setAttribute('aria-hidden', 'true');
      cabecalho.append(el('span', '', 'Chamado'), el('span', '', 'Responsável'), el('span', '', 'Status'));
      container.prepend(cabecalho);
    }
  }

  function mapaTecnicos() {
    return new Map(listarTecnicos().map(item => [item.id, item.nome]));
  }

  function painelGestao() {
    titulo('Painel de gestão', 'Acompanhe a manutenção do campus e distribua os chamados.');
    const chamados = listarServicos();
    const pendentes = chamados.filter(item => item.estado !== 'concluido' && !item.principal);
    const total = pendentes.length;
    const resumo = el('section', 'admin-spotlight');
    const texto = el('div');
    const tituloResumo = total
      ? total + (total === 1 ? ' chamado precisa de responsável' : ' chamados precisam de responsável')
      : 'Todos os chamados ativos têm responsável';
    texto.append(el('h2', '', tituloResumo));
    if (total) texto.append(el('p', '', 'Atribua um técnico para dar andamento às solicitações.'));
    texto.append(link(total ? 'Ver pendências de atribuição →' : 'Abrir fila de chamados →',
      'fila', total ? { estado: 'sem' } : {}, 'request-primary'));
    const imagem = el('img');
    imagem.alt = '';
    imagem.src = '../../assestes/08_gestao_chamados.svg';
    imagem.width = 640;
    imagem.height = 460;
    resumo.append(texto, imagem);

    const metricas = el('section', 'admin-metricas');
    metricas.setAttribute('aria-label', 'Resumo por status');
    for (const [estado, nome] of [['aberto', 'Abertos'], ['andamento', 'Em atendimento'], ['concluido', 'Concluídos']]) {
      const quantidade = chamados.filter(chamado => chamado.estado === estado).length;
      const item = link('', 'fila', { estado }, 'admin-metrica admin-metrica--' + estado);
      item.append(el('strong', '', quantidade), el('span', '', nome));
      metricas.append(item);
    }

    const abertos = el('div', 'admin-table');
    const tecnicos = mapaTecnicos();
    const proximos = chamados.filter(item => item.estado === 'aberto')
      .sort((a, b) => Number(Boolean(a.principal)) - Number(Boolean(b.principal)) || b.numero.localeCompare(a.numero));
    listaChamados(abertos, proximos.slice(0, 4), tecnicos, { estado: 'aberto' },
      'Nenhum chamado aberto no momento.');
    main.append(resumo, metricas, secao('Chamados abertos', abertos,
      link('Ver todos', 'fila', { estado: 'aberto' }, 'admin-text-link')));
  }

  function fila() {
    titulo('Chamados', 'Busque solicitações e acompanhe a atribuição da equipe.');
    const filtros = Object.fromEntries(parametros);
    const estadosFila = [
      ['', 'Todos'], ['sem', 'Sem responsável'], ['aberto', 'Abertos'],
      ['andamento', 'Em atendimento'], ['concluido', 'Concluídos'],
    ];
    const atalhos = el('nav', 'admin-filtros');
    atalhos.setAttribute('aria-label', 'Filtrar chamados por status');
    const acoesEstado = estadosFila.map(([estado, nome]) => {
      const atalho = link(nome, 'fila', { estado });
      atalho.className = '';
      if ((filtros.estado ?? '') === estado) atalho.setAttribute('aria-current', 'true');
      return atalho;
    });
    atalhos.append(...acoesEstado);
    const filtro = link('Mais filtros', 'filtros', filtros);
    const busca = input('busca', filtros.busca ?? '', 'search');
    busca.placeholder = 'Ex.: 000131 ou Bloco B';
    const controles = el('div', 'admin-toolbar__linha admin-form');
    controles.append(rotulo('Buscar por chamado, local ou categoria', busca), filtro);
    const barra = el('div', 'admin-toolbar');
    barra.append(controles, atalhos);

    const ativos = el('div', 'admin-filtros-ativos');
    for (const [chave, rotuloFiltro] of [['local', 'Local'], ['categoria', 'Categoria']]) {
      if (filtros[chave]) ativos.append(el('span', 'admin-filtro-ativo', rotuloFiltro + ' · ' + filtros[chave]));
    }
    const limpar = link('Limpar filtros', 'fila', {}, 'admin-text-link');
    ativos.append(limpar);
    const contagem = el('p', 'admin-meta');
    contagem.setAttribute('role', 'status');
    const resultados = el('div', 'admin-table admin-list');
    const tecnicos = mapaTecnicos();
    const chamados = ordenarFila(listarServicos());
    let retornoPagina = {};
    const paginacao = criarPaginacao((itens, pagina, total) => {
      retornoPagina.pagina = pagina;
      contagem.textContent = total === 1 ? '1 chamado' : total + ' chamados';
      listaChamados(resultados, itens, tecnicos, retornoPagina, 'Nenhum chamado corresponde à busca e aos filtros.');
    }, filtros.pagina);

    function atualizar(reiniciar = false) {
      const estado = filtros.estado;
      const retorno = { ...filtros, busca: busca.value };
      retornoPagina = retorno;
      filtro.href = rota('filtros', retorno);
      acoesEstado.forEach((atalho, indice) => {
        atalho.href = rota('fila', { ...retorno, estado: estadosFila[indice][0] });
      });
      ativos.hidden = !filtros.local && !filtros.categoria && !estado && !busca.value;
      const escopo = chamados.filter(item => (!filtros.local || item.local === filtros.local)
        && (!filtros.categoria || item.categoria === filtros.categoria));
      acoesEstado.forEach((atalho, indice) => {
        const valor = estadosFila[indice][0];
        const total = escopo.filter(item => !valor || (valor === 'sem'
          ? !item.principal && item.estado !== 'concluido' : item.estado === valor)).length;
        atalho.textContent = estadosFila[indice][1] + ' (' + total + ')';
      });
      const filtrados = escopo
        .filter(item => !estado || (estado === 'sem' ? !item.principal && item.estado !== 'concluido' : item.estado === estado))
        .filter(item => !filtros.local || item.local === filtros.local)
        .filter(item => !filtros.categoria || item.categoria === filtros.categoria)
        .filter(item => corresponde(busca.value, item.numero, item.titulo, item.local, item.categoria));
      paginacao.atualizar(filtrados, reiniciar);
    }
    busca.addEventListener('input', () => atualizar(true));
    barra.append(ativos, contagem);
    main.append(barra, resultados, paginacao.elemento);
    atualizar();
  }

  function filtros() {
    const dadosAtuais = Object.fromEntries(parametros);
    titulo('Filtros dos chamados', 'Combine status, local e categoria para refinar a fila.', 'fila', dadosAtuais);
    const todos = listarServicos();
    const opcoes = (chave, rotulo) => [['', rotulo], ...[...new Set(todos.map(item => item[chave]).filter(Boolean))].sort().map(valor => [valor, valor])];
    const estado = select('estado', [['', 'Todos os estados'], ...Object.entries(estados), ['sem', 'Sem responsável']], dadosAtuais.estado);
    const local = select('local', opcoes('local', 'Todos os locais'), dadosAtuais.local);
    const categoria = select('categoria', opcoes('categoria', 'Todas as categorias'), dadosAtuais.categoria);
    main.append(formulario('Aplicar filtros', [
      rotulo('Status', estado), rotulo('Local', local), rotulo('Categoria', categoria),
    ], dados => ir('fila', '', { ...Object.fromEntries(dados), busca: dadosAtuais.busca ?? '' }),
    link('Limpar filtros', 'fila', { busca: dadosAtuais.busca ?? '' })));
  }

  function chamado(item) {
    const tecnicos = mapaTecnicos();
    const responsavel = tecnicos.get(item.principal);
    const dados = Object.fromEntries(parametros);
    const retornar = Object.fromEntries(new URLSearchParams(dados.retorno));
    titulo(item.titulo, ['#' + item.numero, item.local, item.categoria].filter(Boolean).join(' · '), 'fila', retornar);

    const detalhes = el('div', 'admin-detalhes');
    const descricao = painel('Descrição do problema', el('p', '', item.descricao), status(item));
    const equipe = painel('Equipe do chamado');
    equipe.classList.add('admin-equipe-resumo');
    equipe.append(el('p', '', responsavel ? 'Responsável principal · ' + responsavel : 'Sem responsável'));
    const colaboradores = item.colaboradores.map(id => tecnicos.get(id) ?? id);
    if (colaboradores.length) equipe.append(el('p', 'admin-secondary', 'Colaboradores · ' + colaboradores.join(', ')));
    if (item.estado !== 'concluido') {
      equipe.append(link(responsavel ? 'Gerenciar equipe' : 'Atribuir técnico',
        responsavel ? 'equipe-chamado' : 'atribuir', dados, 'request-primary'));
    } else equipe.append(el('p', 'admin-secondary', 'Equipe disponível para consulta.'));
    detalhes.append(equipe, descricao);

    const historico = painel('Histórico', criarHistoricoChamado(item));
    historico.classList.add('admin-historico');
    main.append(detalhes, historico,
      painel('Conclusão', el('p', '', item.nota ?? 'O atendimento ainda não foi concluído.')),
      painel('Imagens do chamado', criarAnexosChamado(item)),
      painel('Comentários', criarDiscussaoChamado(item.numero, 'Administrador')));
  }

  function caixa(texto, nome, valor, marcado) {
    const campo = input(nome, valor, 'checkbox');
    campo.checked = marcado;
    const label = el('label', 'admin-check');
    label.append(campo, document.createTextNode(texto));
    return label;
  }

  function equipeChamado(item, atribuir) {
    const rotaChamado = Object.fromEntries(parametros);
    titulo(atribuir ? 'Atribuir responsável' : 'Equipe do chamado', 'Chamado #' + item.numero, 'chamado', rotaChamado);
    const contexto = painel(item.titulo, el('p', 'admin-secondary', item.local), status(item));
    contexto.classList.add('admin-contexto');
    main.append(contexto);
    if (item.estado === 'concluido') {
      main.append(painel('Equipe de conclusão', el('p', '', descreverEquipe(item)),
        el('p', '', 'O chamado está concluído. A equipe está disponível para consulta.')));
      return;
    }
    main.append(criarEditorEquipe(item, atribuir, link('Cancelar', 'chamado', rotaChamado),
      () => ir('chamado', 'Equipe atualizada.', rotaChamado)));
  }

  function cadastros(tipo) {
    const local = tipo === 'local';
    const destino = local ? 'novo-local' : 'nova-categoria';
    titulo(local ? 'Locais do campus' : 'Categorias de problema',
      local ? 'Gerencie os ambientes disponíveis para novos chamados.' : 'Organize os tipos de manutenção disponíveis.',
      null, null, link(local ? 'Adicionar local' : 'Nova categoria', destino, {}, 'request-primary'));
    const abas = el('nav', 'admin-filtros admin-catalogo-abas');
    abas.setAttribute('aria-label', 'Tipos de cadastro');
    for (const [nome, tela, selecionado] of [['Locais', 'locais', local], ['Categorias', 'categorias', !local]]) {
      const aba = link(nome, tela, {}, '');
      if (selecionado) aba.setAttribute('aria-current', 'page');
      abas.append(aba);
    }
    main.append(abas);
    listaPesquisavel(local ? 'Buscar local' : 'Buscar categoria', (busca, resultados) => {
      const itens = lerCatalogo()[tipo].filter(item => corresponde(busca, item.nome, item.bloco));
      lista(resultados, itens.map(item => linha(item.nome, [item.bloco, item.ativo ? 'Ativo' : 'Desativado'].filter(Boolean).join(' · '),
        'editar', { tipo, id: item.id }, item.icone ? el('span', '', item.icone) : undefined)), 'Nenhum cadastro encontrado.');
    });
  }

  function cadastro(tipo, id) {
    const local = tipo === 'local';
    const listagem = local ? 'locais' : 'categorias';
    const registros = lerCatalogo()[tipo];
    const atual = registros.find(item => item.id === id);
    if (id && !atual) return titulo('Cadastro indisponível', '', listagem);
    titulo(atual ? (local ? 'Editar local' : 'Editar categoria') : (local ? 'Adicionar ambiente' : 'Cadastrar categoria'),
      atual ? 'Os chamados existentes preservam seus dados.' : (local ? 'Identifique um local para os chamados.' : 'Crie um tipo de problema no sistema.'), listagem);
    const nome = input('nome', atual?.nome);
    nome.maxLength = 120;
    const campos = [rotulo(local ? 'Nome do local' : 'Nome da categoria', nome)];
    if (local) {
      campos.push(rotulo('Bloco ou área', input('bloco', atual?.bloco)));
      campos.push(rotulo('Tipo de ambiente', select('tipo', ['Sala', 'Laboratório', 'Circulação', 'Área externa', 'Outro'].map(item => [item, item]), atual?.tipo)));
    } else {
      campos.push(rotulo('Ícone representativo', select('icone', [['❄', '❄ Climatização'], ['▣', '▣ Tecnologia'], ['☀', '☀ Iluminação'], ['▤', '▤ Mobiliário'], ['ϟ', 'ϟ Elétrica'], ['◆', '◆ Outros']], atual?.icone)));
    }
    if (atual) campos.push(rotulo('Situação', select('ativo', [['sim', 'Ativo'], ['nao', 'Desativado']], atual.ativo ? 'sim' : 'nao')));
    main.append(formulario('Salvar ' + (atual ? 'alterações' : local ? 'local' : 'categoria'), campos, dados => {
      const valor = nomeValido(dados.get('nome'));
      const bloco = local ? nomeValido(dados.get('bloco')) : undefined;
      const repetido = registros.some(item => item.id !== id && normalizar(item.nome) === normalizar(valor) && (!local || normalizar(item.bloco) === normalizar(bloco)));
      if (repetido) throw new Error('Já existe um cadastro com esse nome.');
      const item = { id: id ?? crypto.randomUUID(), nomes_anteriores: [...new Set([...(atual?.nomes_anteriores ?? []), atual?.nome].filter(Boolean))], nome: valor, bloco, icone: dados.get('icone'), tipo: dados.get('tipo'), ativo: dados.get('ativo') !== 'nao' };
      const dadosCatalogo = lerCatalogo();
      dadosCatalogo[tipo] = atual ? registros.map(registro => registro.id === id ? item : registro) : [...registros, item];
      sessionStorage.setItem(chaveCatalogo, JSON.stringify(dadosCatalogo));
      ir(listagem, 'Cadastro salvo.');
    }, link('Cancelar', listagem)));
    if (atual) main.append(criarExclusaoCadastro(tipo, atual, () => ir(listagem, 'Cadastro excluído.')));
  }

  function carga(id) {
    return listarServicos().filter(item => item.estado !== 'concluido' && (item.principal === id || item.colaboradores.includes(id))).length;
  }

  function equipe() {
    titulo('Equipe técnica', 'Consulte a disponibilidade e a carga dos profissionais.',
      null, null, link('Novo técnico', 'novo-tecnico', {}, 'request-primary'));
    listaPesquisavel('Buscar técnico', (busca, resultados) => {
      lista(resultados, listarTecnicos().filter(item => corresponde(busca, item.nome, item.email))
        .map(item => linha(item.nome, (item.disponivel ? 'Disponível' : 'Indisponível') + ' · ' + carga(item.id) + ' chamado(s) ativo(s)',
          'configurar-tecnico', { id: item.id })), 'Nenhum técnico encontrado.');
    });
  }

  function cadastroTecnico(id) {
    const tecnicos = listarTecnicos();
    const atual = tecnicos.find(tecnico => tecnico.id === id);
    if (id && !atual) return titulo('Técnico indisponível', '', 'tecnicos');
    titulo(atual ? atual.nome : 'Adicionar técnico', atual ? 'Especialidades e disponibilidade.' : 'Cadastre um profissional para os atendimentos.', 'tecnicos');
    const categorias = el('fieldset');
    categorias.append(el('legend', '', 'Categorias atendidas'));
    const nomes = new Set([...lerCatalogo().categoria.filter(item => item.ativo).map(item => item.nome), ...(atual?.categorias ?? [])]);
    for (const nome of nomes) {
      categorias.append(caixa(nome, 'categorias', nome, atual?.categorias.includes(nome) ?? false));
    }
    const campos = [];
    if (!atual) {
      const senha = input('senha', '', 'password');
      senha.minLength = 4;
      senha.maxLength = 8;
      senha.autocomplete = 'new-password';
      campos.push(rotulo('Nome', input('nome')), rotulo('E-mail', input('email', '', 'email')), rotulo('Senha de demonstração (4 a 8 caracteres)', senha));
    }
    campos.push(categorias, rotulo('Disponibilidade', select('disponivel', [['sim', 'Disponível'], ['nao', 'Indisponível']], atual?.disponivel === false ? 'nao' : 'sim')));
    if (atual) campos.push(painel('Carga atual', el('p', '', carga(id) + ' chamados abertos ou em atendimento')));
    main.append(formulario(atual ? 'Salvar alterações' : 'Criar conta de técnico', campos, async dados => {
      const alteracoes = { categorias: dados.getAll('categorias'), disponivel: dados.get('disponivel') === 'sim' };
      let conta = { ...atual, ...alteracoes };
      if (!atual) {
        const email = dados.get('email').trim().toLowerCase();
        if (['admin@ufam.edu.br', 'tecnico@ufam.edu.br'].includes(email) || tecnicos.some(tecnico => tecnico.email === email)) {
          throw new Error('Esse e-mail já está em uso.');
        }
        conta = {
          ...alteracoes, id: crypto.randomUUID(), nome: nomeValido(dados.get('nome')), email,
          senhaHash: await hashSenhaDemo(dados.get('senha')),
        };
      }
      sessionStorage.setItem(chaveTecnicos, JSON.stringify(atual ? tecnicos.map(tecnico => tecnico.id === id ? conta : tecnico) : [...tecnicos, conta]));
      ir('tecnicos', 'Técnico salvo.');
    }, link('Cancelar', 'tecnicos')));
  }

  function mais() {
    titulo('Cadastros', 'Defina os locais e as categorias disponíveis no formulário de chamados.');
    const registros = el('div', 'admin-table');
    registros.append(linha('Locais do campus', 'Blocos, salas e ambientes', 'locais'),
      linha('Categorias de problema', 'Tipos de manutenção', 'categorias'));
    main.append(registros);
  }

  document.querySelector('.admin-sair').addEventListener('click', () => {
    sessionStorage.removeItem('zela-perfil-admin');
    sessionStorage.removeItem('zela-acesso-demonstracao');
  });
  document.querySelector('#pular-menu').addEventListener('click', evento => {
    evento.preventDefault();
    main.focus();
  });

  const telas = {
    painel: painelGestao, fila, filtros,
    chamado, atribuir: item => equipeChamado(item, true), 'equipe-chamado': item => equipeChamado(item, false),
    locais: () => cadastros('local'), categorias: () => cadastros('categoria'),
    'novo-local': () => cadastro('local'), 'nova-categoria': () => cadastro('categoria'),
    editar: () => cadastro(parametros.get('tipo') === 'local' ? 'local' : 'categoria', parametros.get('id')),
    tecnicos: equipe, 'novo-tecnico': () => cadastroTecnico(),
    'configurar-tecnico': () => cadastroTecnico(parametros.get('id')), mais,
  };
  const telasChamado = ['chamado', 'atribuir', 'equipe-chamado'];

  function abaAtiva(tela) {
    if (tela === 'painel') return tela;
    if (['fila', ...telasChamado, 'filtros'].includes(tela)) return 'fila';
    if (['tecnicos', 'novo-tecnico', 'configurar-tecnico'].includes(tela)) return 'tecnicos';
    return 'mais';
  }

  function render() {
    if (sessionStorage.getItem('zela-perfil-admin') !== 'ativo') {
      location.replace('../../login.html');
      return;
    }
    const [nome, query] = location.hash.slice(1).split('?');
    parametros = new URLSearchParams(query);
    const tela = Object.hasOwn(telas, nome) ? nome : 'painel';
    const aba = abaAtiva(tela);
    document.querySelectorAll('.navigation__item').forEach(item => {
      if (item.hash === '#' + aba) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    main.replaceChildren();
    if (telasChamado.includes(tela)) {
      const item = listarServicos().find(servico => servico.numero === parametros.get('numero'));
      if (item) telas[tela](item);
      else titulo('Chamado indisponível', '', 'fila');
    } else telas[tela]();
    window.scrollTo(0, 0);
    main.querySelector('h1')?.focus({ preventScroll: true });
  }

  addEventListener('hashchange', render);
  addEventListener('pageshow', evento => {
    if (evento.persisted) render();
  });
  render();
})();
