function dataDoRegistro(registro, indice = 0) {
  if (registro.ocorrido_em || registro.criado_em) return registro.ocorrido_em ?? registro.criado_em;
  const partes = (registro.data ?? registro.texto ?? '').match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?(?:.*?(\d{2}):(\d{2}))?/);
  if (!partes) return new Date(Date.UTC(2026, 10, 12, 9, 0, indice)).toISOString();
  return new Date(Date.UTC(Number(partes[3] ?? 2026), Number(partes[2]) - 1,
    Number(partes[1]), Number(partes[4] ?? 0), Number(partes[5] ?? 0))).toISOString();
}

function comentarioDoHistorico(evento) {
  const nomes = listarTecnicos().map(tecnico => tecnico.nome);
  const autor = nomes.find(nome => evento.texto?.startsWith(nome + ' · '));
  return autor ? { autor, texto: evento.texto.slice(autor.length + 3), criado_em: dataDoRegistro(evento) } : null;
}

function prepararRegistroServico(servico) {
  const eventos = servico.historico.filter(evento => !comentarioDoHistorico(evento))
    .map((evento, indice) => ({ ...evento, id: evento.id ?? 'legado-' + String(indice).padStart(6, '0'), ocorrido_em: dataDoRegistro(evento, indice) }))
    .sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em) || a.id.localeCompare(b.id));
  const aberto = servico.aberto_em ?? eventos[0]?.ocorrido_em ?? '2026-11-12T09:00:00.000Z';
  const ultima = eventos.at(-1)?.ocorrido_em ?? aberto;
  return {
    ...servico, historico: eventos, aberto_em: aberto,
    ultima_movimentacao_em: ultima > aberto ? ultima : aberto,
    equipe_versao: servico.equipe_versao ?? eventos.filter(evento =>
      ['inclusao_tecnico', 'remocao_tecnico', 'troca_principal'].includes(evento.tipo)
      || evento.texto.startsWith('Equipe atualizada')).length,
  };
}

function ordenarFila(chamados) {
  return [...chamados].sort((a, b) => b.ultima_movimentacao_em.localeCompare(a.ultima_movimentacao_em)
    || String(a.id ?? a.numero).localeCompare(String(b.id ?? b.numero)));
}

function listarComentariosChamado(numero) {
  const exemplos = numero === '000124' ? [
    { autor: 'Carlos · Técnico', texto: 'O equipamento apresenta algum ruído?', criado_em: '2026-11-13T12:00:00Z' },
    { autor: 'Você · Solicitante', texto: 'Sim, faz um ruído alto ao ligar.', criado_em: '2026-11-13T12:05:00Z' },
  ] : [];
  const salvos = lerDadosSessao('zela-comentarios-' + numero, exemplos);
  const historico = lerDadosSessao(chaveServicos, {})[numero]?.historico ?? [];
  const legados = historico.map(comentarioDoHistorico).filter(Boolean);
  const unicos = new Map();
  [...salvos, ...legados].forEach((comentario, indice) => {
    const criado = comentario.criado_em ?? dataDoRegistro(comentario, indice);
    const item = { ...comentario, criado_em: criado };
    const chave = item.id ?? [item.autor, item.texto, criado].join('|');
    unicos.set(chave, item);
  });
  return [...unicos.values()].sort((a, b) => a.criado_em.localeCompare(b.criado_em)
    || String(a.id ?? '').localeCompare(String(b.id ?? '')));
}

function salvarComentarioChamado(numero, autor, texto) {
  const conteudo = texto.trim();
  if (!conteudo || conteudo.length > 2000) throw new Error('Escreva um comentário de 1 a 2.000 caracteres.');
  const comentarios = listarComentariosChamado(numero);
  const comentario = { id: crypto.randomUUID(), autor, texto: conteudo, criado_em: new Date().toISOString() };
  sessionStorage.setItem('zela-comentarios-' + numero, JSON.stringify([...comentarios, comentario]));
  return comentario;
}

function excluirCadastro(tipo, id) {
  const catalogo = lerCatalogo();
  const item = catalogo[tipo].find(registro => registro.id === id);
  if (!item) throw new Error('Cadastro não encontrado.');
  const nomes = new Set([item.nome, ...(item.nomes_anteriores ?? [])]);
  const vinculado = listarServicos().some(servico => tipo === 'categoria'
    ? servico.categoria_id === id || nomes.has(servico.categoria)
    : servico.local_id === id || [...nomes].some(nome =>
      servico.local === nome || servico.local === item.bloco + ' · ' + nome
      || servico.local === nome + ' · ' + item.bloco));
  const especialidade = tipo === 'categoria' && listarTecnicos().some(tecnico =>
    tecnico.categorias.some(nome => nomes.has(nome)));
  if (vinculado || especialidade) {
    const erro = new Error(vinculado
      ? 'Este cadastro está vinculado a chamados. Você pode desativá-lo para preservar o histórico.'
      : 'Remova esta categoria das especialidades dos técnicos antes de excluí-la.');
    erro.status = 409;
    throw erro;
  }
  catalogo[tipo] = catalogo[tipo].filter(registro => registro.id !== id);
  sessionStorage.setItem(chaveCatalogo, JSON.stringify(catalogo));
}

function preservarComentariosLegados(numero) {
  const historico = lerDadosSessao(chaveServicos, {})[numero]?.historico ?? [];
  if (historico.some(comentarioDoHistorico)) {
    sessionStorage.setItem('zela-comentarios-' + numero, JSON.stringify(listarComentariosChamado(numero)));
  }
}

function autoriaEvento() {
  if (sessionStorage.getItem('zela-perfil-admin') === 'ativo') {
    return { origem: 'humana', autor: { id: 'demo-admin', nome: 'Administrador' } };
  }
  const id = sessionStorage.getItem('zela-perfil-tecnico');
  const tecnico = listarTecnicos().find(item => item.id === id);
  return { origem: 'humana', autor: tecnico
    ? { id: tecnico.id, nome: tecnico.nome }
    : { id: 'demo-solicitante', nome: 'Solicitante' } };
}
