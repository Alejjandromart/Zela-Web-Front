function salvarEquipeChamado(numero, composicao) {
  const atual = listarServicos().find(servico => servico.numero === numero);
  if (!atual) throw new Error('Chamado não encontrado.');
  if (atual.estado === 'concluido') throw new Error('A equipe de um chamado concluído está disponível apenas para consulta.');
  const principal = composicao.principal_id || null;
  const colaboradores = [...composicao.colaborador_ids];
  const ids = [principal, ...colaboradores].filter(Boolean);
  const tecnicos = new Map(listarTecnicos().map(item => [item.id, item.nome]));
  if (new Set(ids).size !== ids.length || ids.some(id => !tecnicos.has(id))) {
    throw new Error('Selecione técnicos distintos e cadastrados.');
  }
  if (!principal && (colaboradores.length || atual.estado === 'andamento')) {
    throw new Error('Esta equipe precisa de um responsável principal.');
  }
  const mesmaEquipe = atual.principal === principal
    && [...atual.colaboradores].sort().join('|') === [...colaboradores].sort().join('|');
  if (mesmaEquipe) return atual;
  if (composicao.equipe_versao !== atual.equipe_versao) {
    const erro = new Error('A equipe foi alterada desde a abertura desta tela. Revise a equipe atual e seu rascunho.');
    erro.codigo = 'EQUIPE_DESATUALIZADA';
    erro.status = 409;
    erro.atual = atual;
    throw erro;
  }
  const antes = [atual.principal, ...atual.colaboradores].filter(Boolean);
  const eventos = [];
  const ocorrido = new Date().toISOString();
  for (const id of antes.filter(id => !ids.includes(id))) {
    eventos.push({ id: crypto.randomUUID(), tipo: 'remocao_tecnico', texto: 'Técnico removido · ' + tecnicos.get(id), ocorrido_em: ocorrido, ...autoriaEvento() });
  }
  for (const id of ids.filter(id => !antes.includes(id))) {
    eventos.push({ tipo: 'inclusao_tecnico', texto: 'Técnico incluído · ' + tecnicos.get(id), ocorrido_em: ocorrido, ...autoriaEvento() });
  }
  if (atual.principal !== principal) {
    eventos.push({ tipo: 'troca_principal', texto: 'Responsável principal · ' + (tecnicos.get(principal) ?? 'Sem responsável'), ocorrido_em: ocorrido, ...autoriaEvento() });
  }
  preservarComentariosLegados(numero);
  const salvos = lerDadosSessao(chaveServicos, {});
  salvos[numero] = {
    ...salvos[numero], principal, colaboradores,
    equipe_versao: atual.equipe_versao + eventos.length,
    historico: [...atual.historico, ...eventos],
  };
  sessionStorage.setItem(chaveServicos, JSON.stringify(salvos));
  return listarServicos().find(item => item.numero === numero);
}

function descreverEquipe(equipe) {
  const nomes = new Map(listarTecnicos().map(item => [item.id, item.nome]));
  return 'Principal: ' + (nomes.get(equipe.principal) ?? 'Sem responsável')
    + '. Colaboradores: ' + (equipe.colaboradores.map(id => nomes.get(id) ?? id).join(', ') || 'Nenhum') + '.';
}

function criarEditorEquipe(item, atribuir, cancelar, aoSalvar) {
  const form = document.createElement('form');
  form.className = 'admin-form admin-form--edicao';
  const label = document.createElement('label');
  label.textContent = 'Responsável principal';
  const principal = document.createElement('select');
  principal.name = 'principal';
  principal.required = atribuir || item.estado === 'andamento';
  principal.add(new Option('Sem responsável', ''));
  for (const tecnico of listarTecnicos()) principal.add(new Option(tecnico.nome, tecnico.id));
  principal.value = item.principal ?? '';
  label.append(principal);
  const grupo = document.createElement('fieldset');
  grupo.append(Object.assign(document.createElement('legend'), { textContent: 'Colaboradores' }));
  for (const tecnico of listarTecnicos()) {
    const label = document.createElement('label');
    label.className = 'admin-check';
    const campo = document.createElement('input');
    campo.type = 'checkbox';
    campo.name = 'colaborador';
    campo.value = tecnico.id;
    campo.checked = item.colaboradores.includes(tecnico.id);
    label.append(campo, document.createTextNode(tecnico.nome));
    grupo.append(label);
  }
  function atualizarPapeis() {
    grupo.querySelectorAll('input').forEach(campo => {
      campo.disabled = campo.value === principal.value;
      if (campo.disabled) campo.checked = false;
    });
  }
  principal.addEventListener('change', atualizarPapeis);
  atualizarPapeis();
  const conflito = document.createElement('section');
  conflito.className = 'equipe-conflito';
  conflito.hidden = true;
  conflito.tabIndex = -1;
  conflito.setAttribute('role', 'alert');
  const erro = document.createElement('p');
  erro.setAttribute('role', 'alert');
  const salvar = document.createElement('button');
  salvar.className = 'request-primary';
  salvar.textContent = atribuir ? 'Atribuir responsável' : 'Salvar equipe';
  const acoes = document.createElement('div');
  acoes.className = 'admin-actions';
  acoes.append(salvar, cancelar);
  form.append(label, grupo, conflito, erro, acoes);
  let versao = item.equipe_versao;
  let revisaoAtual;
  let revisar;
  let aguardandoRevisao = false;
  function rascunho() {
    return {
      principal_id: principal.value || null,
      colaborador_ids: [...grupo.querySelectorAll('input:checked')].map(campo => campo.value),
      equipe_versao: versao,
    };
  }
  function invalidarConfirmacao() {
    if (!revisaoAtual) return;
    aguardandoRevisao = true;
    revisar.checked = false;
    conflito.querySelector('[data-rascunho]').textContent = 'Seu rascunho · '
      + descreverEquipe({ principal: principal.value, colaboradores: rascunho().colaborador_ids });
  }
  form.addEventListener('change', evento => {
    if (evento.target !== revisar) invalidarConfirmacao();
  });
  form.addEventListener('submit', evento => {
    evento.preventDefault();
    erro.textContent = '';
    if (aguardandoRevisao && !revisar.checked) {
      erro.textContent = 'Confirme a revisão das duas composições antes de salvar.';
      revisar.focus();
      return;
    }
    const dados = rascunho();
    try {
      if (revisaoAtual) dados.equipe_versao = revisaoAtual.equipe_versao;
      salvarEquipeChamado(item.numero, dados);
      aoSalvar();
    } catch (falha) {
      if (falha.codigo !== 'EQUIPE_DESATUALIZADA') {
        erro.textContent = falha.message;
        return;
      }
      revisaoAtual = falha.atual;
      aguardandoRevisao = true;
      conflito.replaceChildren();
      const titulo = document.createElement('h2');
      titulo.textContent = 'A equipe mudou. Revise antes de salvar.';
      const atual = document.createElement('p');
      atual.textContent = 'Equipe atual · ' + descreverEquipe(revisaoAtual);
      const draft = document.createElement('p');
      draft.dataset.rascunho = '';
      draft.textContent = 'Seu rascunho · ' + descreverEquipe({ principal: principal.value, colaboradores: dados.colaborador_ids });
      const confirmar = document.createElement('label');
      confirmar.className = 'admin-check';
      revisar = document.createElement('input');
      revisar.type = 'checkbox';
      revisar.addEventListener('input', evento => evento.stopPropagation());
      confirmar.append(revisar, document.createTextNode('Revisei a equipe atual e confirmo o envio do meu rascunho.'));
      conflito.append(titulo, atual, draft, confirmar);
      conflito.hidden = false;
      conflito.focus();
    }
  });
  return form;
}
