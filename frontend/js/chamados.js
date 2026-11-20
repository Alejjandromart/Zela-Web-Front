const chamadosExemplo = [
  {
    numero: '000124', titulo: 'Ar-condicionado com defeito', local: 'Bloco B · Sala 204',
    categoria: 'Climatização', estado: 'Em atendimento', responsavel: 'Equipe de manutenção',
    descricao: 'O aparelho liga, mas não está resfriando o ambiente.',
    historico: ['Em atendimento · 13/11', 'Chamado aberto · 12/11'],
  },
  {
    numero: '000125', titulo: 'Lâmpada queimada', local: 'Laboratório 02',
    categoria: 'Iluminação', estado: 'Concluído', responsavel: 'Equipe de manutenção',
    descricao: 'A lâmpada próxima à porta não acende.',
    historico: ['Concluído · 14/11', 'Em atendimento · 13/11', 'Chamado aberto · 12/11'],
  },
  {
    numero: '000126', titulo: 'Tomada danificada', local: 'Laboratório 01',
    categoria: 'Elétrica', estado: 'Aberto', responsavel: 'Aguardando atribuição',
    descricao: 'A tomada ao lado da bancada está solta.',
    historico: ['Chamado aberto · 14/11'],
  },
];

const chaveChamados = 'zela-chamados-demonstracao';

function lerChamadosDaSessao() {
  try {
    const chamados = JSON.parse(sessionStorage.getItem(chaveChamados) ?? '[]');
    return Array.isArray(chamados) ? chamados : [];
  } catch {
    return [];
  }
}

function listarChamados() {
  const servicos = new Map(listarServicos().map(item => [item.numero, item]));
  const estados = { aberto: 'Aberto', andamento: 'Em atendimento', concluido: 'Concluído' };
  const nomes = new Map(listarTecnicos().map(item => [item.id, item.nome]));
  return [...lerChamadosDaSessao(), ...chamadosExemplo].map(chamado => {
    const servico = servicos.get(chamado.numero);
    return {
      ...chamado, ...servico,
      fotoAberturaId: chamado.fotoId,
      estado: estados[servico.estado],
      responsavel: nomes.get(servico.principal) ?? 'Aguardando atribuição',
      historico: servico.historico.map(evento => evento.texto + ' · ' + new Date(evento.ocorrido_em).toLocaleString('pt-BR')),
    };
  });
}

function registrarChamado(dados) {
  const chamados = lerChamadosDaSessao();
  const maiorNumero = Math.max(...[...listarChamados(), ...servicosExemplo].map(chamado => Number(chamado.numero)));
  const chamado = {
    ...dados,
    numero: String(maiorNumero + 1).padStart(6, '0'),
    estado: 'Aberto',
    aberto_em: new Date().toISOString(),
    responsavel: 'Aguardando atribuição',
    historico: [{ id: crypto.randomUUID(), texto: 'Solicitação registrada.', ocorrido_em: new Date().toISOString(), ...autoriaEvento() }],
  };
  sessionStorage.setItem(chaveChamados, JSON.stringify([chamado, ...chamados]));
  return chamado;
}

async function acessarFotos(modo, operacao) {
  const banco = await new Promise((resolve, reject) => {
    const abertura = indexedDB.open('zela-demonstracao', 1);
    abertura.onupgradeneeded = () => abertura.result.createObjectStore('fotos');
    abertura.onsuccess = () => resolve(abertura.result);
    abertura.onerror = () => reject(abertura.error);
  });

  try {
    return await new Promise((resolve, reject) => {
      const transacao = banco.transaction('fotos', modo);
      const pedido = operacao(transacao.objectStore('fotos'));
      transacao.oncomplete = () => resolve(pedido.result);
      transacao.onabort = () => reject(transacao.error);
    });
  } finally {
    banco.close();
  }
}

const servicosExemplo = [
  {
    numero: '000124', titulo: 'Ar-condicionado com defeito',
    local: 'Bloco B · Sala 204', icone: 'climatizacao', estado: 'andamento',
    descricao: 'O aparelho não está resfriando.',
    colaboradores: ['mariana'],
    historico: [
      { data: '13/11 · 10:30', texto: 'Técnico iniciou o atendimento.' },
      { data: '12/11 · 15:10', texto: 'Chamado atribuído ao responsável.' },
      { data: '12/11 · 09:25', texto: 'Solicitação registrada.' },
    ],
  },
  {
    numero: '000131', titulo: 'Tomada danificada', local: 'Laboratório 01 · Bloco B',
    icone: 'eletrica', estado: 'aberto', descricao: 'A tomada está solta e sem energia.',
  },
  {
    numero: '000125', titulo: 'Lâmpada queimada', local: 'Bloco A · Corredor',
    icone: 'iluminacao', estado: 'concluido', descricao: 'A lâmpada próxima à entrada queimou.',
    nota: 'Lâmpada substituída e iluminação testada.',
  },
  {
    numero: '000132', titulo: 'Ventilador com ruído', local: 'Bloco C · Sala 102',
    icone: 'climatizacao', estado: 'concluido', descricao: 'O ventilador vibrava ao ligar.',
    nota: 'Fixação do ventilador ajustada.',
  },
  {
    numero: '000133', titulo: 'Computador sem rede', local: 'Laboratório 03',
    icone: 'computador', estado: 'concluido', descricao: 'O computador não conectava à rede.',
    nota: 'Cabo trocado e conexão verificada.',
  },
  {
    numero: '000134', titulo: 'Projetor sem imagem', local: 'Bloco A · Sala 101',
    icone: 'computador', estado: 'andamento', descricao: 'O projetor liga, mas não exibe imagem.',
  },
  {
    numero: '000135', titulo: 'Luminária piscando', local: 'Bloco C · Sala 103',
    icone: 'iluminacao', estado: 'aberto', descricao: 'A luminária pisca durante o uso.',
  },
  {
    numero: '000136', titulo: 'Mesa com pé solto', local: 'Biblioteca',
    icone: 'mobiliario', estado: 'aberto', descricao: 'Um dos pés da mesa está solto.',
  },
].map(servico => ({
  principal: 'carlos',
  colaboradores: [],
  historico: [{ data: '14/11 · 09:00', texto: 'Solicitação registrada.' }],
  ...servico,
}));


const chaveServicos = 'zela-servicos-tecnico';
const chaveTecnicos = 'zela-cadastro-tecnicos';

function lerDadosSessao(chave, padrao) {
  try {
    return JSON.parse(sessionStorage.getItem(chave) ?? 'null') ?? padrao;
  } catch {
    return padrao;
  }
}

function listarTecnicos() {
  return lerDadosSessao(chaveTecnicos, [
    { id: 'carlos', nome: 'Carlos Silva', email: 'carlos@ufam.edu.br', disponivel: true, categorias: ['Climatização', 'Elétrica'] },
    { id: 'mariana', nome: 'Mariana Souza', email: 'mariana@ufam.edu.br', disponivel: true, categorias: ['Computadores', 'Iluminação'] },
    { id: 'joao', nome: 'João Pereira', email: 'joao@ufam.edu.br', disponivel: true, categorias: ['Mobiliário'] },
  ]);
}

async function hashSenhaDemo(senha) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function listarServicos() {
  const categorias = {
    climatizacao: 'Climatização', eletrica: 'Elétrica', iluminacao: 'Iluminação',
    computador: 'Computadores', mobiliario: 'Mobiliário',
  };
  const estados = { Aberto: 'aberto', 'Em atendimento': 'andamento', 'Concluído': 'concluido' };
  const exemplos = servicosExemplo.map(servico => ({ ...servico, categoria: categorias[servico.icone] }));
  const numeros = new Set(exemplos.map(servico => servico.numero));
  const solicitacoes = [...lerChamadosDaSessao(), ...chamadosExemplo].filter(chamado => !numeros.has(chamado.numero)).map(chamado => ({
    ...chamado,
    estado: estados[chamado.estado] ?? 'aberto',
    icone: Object.keys(categorias).find(icone => categorias[icone] === chamado.categoria) ?? 'mobiliario',
    principal: null,
    colaboradores: [],
    historico: chamado.historico.map(evento => typeof evento === 'string' ? { texto: evento } : evento),
  }));
  const salvos = lerDadosSessao(chaveServicos, {});
  return [...exemplos, ...solicitacoes].map(servico => prepararRegistroServico({ ...servico, ...salvos[servico.numero] }));
}

function salvarEventoServico(servico, texto, dados = {}) {
  const atual = listarServicos().find(item => item.numero === servico.numero);
  if (!atual) throw new Error('Chamado não encontrado.');
  if (atual.estado === 'concluido') throw new Error('O chamado já está concluído.');
  const seguinte = { aberto: 'andamento', andamento: 'concluido' };
  if (dados.estado && seguinte[atual.estado] !== dados.estado) throw new Error('O estado do chamado foi alterado. Recarregue os detalhes.');
  preservarComentariosLegados(atual.numero);
  const salvos = lerDadosSessao(chaveServicos, {});
  const evento = { id: crypto.randomUUID(), texto, ocorrido_em: new Date().toISOString(), tipo: 'mudanca_estado', ...autoriaEvento() };
  salvos[atual.numero] = { ...salvos[atual.numero], ...dados, historico: [...atual.historico, evento] };
  sessionStorage.setItem(chaveServicos, JSON.stringify(salvos));
}

const chaveCatalogo = 'zela-catalogo-admin';
const catalogoPadrao = {
  categoria: ['Climatização', 'Computadores', 'Iluminação', 'Mobiliário', 'Elétrica', 'Outros'].map((nome, index) => ({
    id: String(index), nome, ativo: true, icone: ['❄', '▣', '☀', '▤', 'ϟ', '◆'][index],
  })),
  local: [
    { id: '0', nome: 'Sala 204', bloco: 'Bloco B', tipo: 'Sala', ativo: true },
    { id: '1', nome: 'Laboratório 01', bloco: 'Bloco A', tipo: 'Laboratório', ativo: true },
    { id: '2', nome: 'Corredor', bloco: 'Bloco A', tipo: 'Circulação', ativo: true },
    { id: '3', nome: 'Laboratório 02', bloco: 'Bloco B', tipo: 'Laboratório', ativo: true },
  ],
};

function lerCatalogo() {
  return lerDadosSessao(chaveCatalogo, catalogoPadrao);
}
