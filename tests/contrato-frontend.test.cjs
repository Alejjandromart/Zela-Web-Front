const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function contexto() {
  const valores = new Map();
  const ctx = vm.createContext({
    crypto: webcrypto, TextEncoder,
    sessionStorage: {
      getItem: chave => valores.get(chave) ?? null,
      setItem: (chave, valor) => valores.set(chave, valor),
    },
  });
  for (const arquivo of ['chamados', 'registros', 'equipes']) {
    vm.runInContext(readFileSync('frontend/js/' + arquivo + '.js', 'utf8'), ctx);
  }
  return codigo => {
    const valor = vm.runInContext(codigo, ctx);
    return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
  };
}

test('comentários são compartilhados e preservam a última movimentação', () => {
  const run = contexto();
  const antes = run("listarServicos().find(s => s.numero === '000124')");
  run("salvarComentarioChamado('000124', 'Administrador', 'Comentário comum')");
  const depois = run("listarServicos().find(s => s.numero === '000124')");
  assert.equal(depois.ultima_movimentacao_em, antes.ultima_movimentacao_em);
  assert.deepEqual(depois.historico, antes.historico);
  assert.equal(run("listarComentariosChamado('000124').at(-1).texto"), 'Comentário comum');
});

test('comentários legados saem do histórico sem perda ou duplicação', () => {
  const run = contexto();
  run("sessionStorage.setItem(chaveServicos, JSON.stringify({'000124': {historico:[{texto:'Solicitação registrada.',data:'12/11 · 09:25'},{texto:'Carlos Silva · Mensagem antiga',data:'19/11 · 12:00'}]}}))");
  assert.equal(run("listarServicos().find(s=>s.numero==='000124').historico.length"), 1);
  assert.equal(run("listarComentariosChamado('000124').filter(c=>c.texto==='Mensagem antiga').length"), 1);
  run("salvarComentarioChamado('000124','Administrador','Resposta')");
  assert.equal(run("listarComentariosChamado('000124').filter(c=>c.texto==='Mensagem antiga').length"), 1);
});

test('versão desatualizada preserva a equipe e reenvio idêntico é idempotente', () => {
  const run = contexto();
  run("salvarEquipeChamado('000131', {principal_id:'joao',colaborador_ids:[],equipe_versao:0})");
  const salvo = run("listarServicos().find(s=>s.numero==='000131')");
  assert.throws(() => run("salvarEquipeChamado('000131', {principal_id:'mariana',colaborador_ids:[],equipe_versao:0})"), /equipe foi alterada/);
  assert.deepEqual(run("listarServicos().find(s=>s.numero==='000131')"), salvo);
  const repetido = run("salvarEquipeChamado('000131', {principal_id:'joao',colaborador_ids:[],equipe_versao:0})");
  assert.deepEqual(repetido, salvo);
});

test('estado final e composição da equipe são validados na gravação', () => {
  const run = contexto();
  assert.throws(() => run("salvarEquipeChamado('000125',{principal_id:'joao',colaborador_ids:[],equipe_versao:0})"), /concluído/);
  assert.throws(() => run("salvarEventoServico(listarServicos().find(s=>s.numero==='000125'),'Alteração',{estado:'andamento'})"), /concluído/);
  assert.throws(() => run("salvarEquipeChamado('000124',{principal_id:null,colaborador_ids:[],equipe_versao:0})"), /responsável/);
  assert.throws(() => run("salvarEquipeChamado('000131',{principal_id:'carlos',colaborador_ids:['carlos'],equipe_versao:0})"), /distintos/);
});

test('cadastros vinculados são preservados e cadastros livres podem ser excluídos', () => {
  const run = contexto();
  assert.throws(() => run("excluirCadastro('categoria','0')"), /vinculado/);
  run("const c = lerCatalogo(); c.categoria.push({id:'nova',nome:'Livre',ativo:true}); sessionStorage.setItem(chaveCatalogo,JSON.stringify(c))");
  run("excluirCadastro('categoria','nova')");
  assert.equal(run("lerCatalogo().categoria.some(c=>c.id==='nova')"), false);
});

test('fila usa movimentação decrescente e histórico mantém ordem cronológica', () => {
  const run = contexto();
  const fila = run('ordenarFila(listarServicos())');
  for (let i = 1; i < fila.length; i += 1) {
    assert.ok(fila[i - 1].ultima_movimentacao_em >= fila[i].ultima_movimentacao_em);
  }
  const eventos = run("listarServicos().find(s=>s.numero==='000124').historico");
  assert.ok(eventos[0].ocorrido_em <= eventos.at(-1).ocorrido_em);
  const aberto = run("registrarChamado({titulo:'Teste',descricao:'Descrição',categoria:'Outros',local:'Biblioteca'})");
  assert.equal(run('ordenarFila(listarServicos())[0].numero'), aberto.numero);
});

test('comentários legados sobrevivem à próxima alteração de equipe e de estado', () => {
  const run = contexto();
  run("sessionStorage.setItem(chaveServicos, JSON.stringify({'000131': {historico:[{texto:'Solicitação registrada.',data:'12/11 · 09:25'},{texto:'Carlos Silva · Mensagem preservada',data:'19/11 · 12:00'}]}}))");
  run("salvarEquipeChamado('000131',{principal_id:'joao',colaborador_ids:[],equipe_versao:0})");
  run("salvarEventoServico(listarServicos().find(s=>s.numero==='000131'),'Atendimento iniciado',{estado:'andamento'})");
  assert.equal(run("listarComentariosChamado('000131').filter(c=>c.texto==='Mensagem preservada').length"), 1);
});

test('locais de mesmo nome em blocos diferentes mantêm os vínculos corretos', () => {
  const run = contexto();
  run("const catalogo = lerCatalogo(); catalogo.local.push({id:'outro',nome:'Sala 204',bloco:'Bloco T',ativo:true}); sessionStorage.setItem(chaveCatalogo,JSON.stringify(catalogo))");
  run("excluirCadastro('local','outro')");
  assert.equal(run("lerCatalogo().local.some(item=>item.id==='outro')"), false);
  assert.throws(() => run("excluirCadastro('local','0')"), /vinculado/);
});

test('comentários distintos publicados no mesmo instante mantêm seus identificadores', () => {
  const run = contexto();
  run("sessionStorage.setItem('zela-comentarios-000131',JSON.stringify([{id:'a',autor:'Administrador',texto:'Repetida',criado_em:'2026-11-20T12:00:00Z'},{id:'b',autor:'Administrador',texto:'Repetida',criado_em:'2026-11-20T12:00:00Z'}]))");
  assert.equal(run("listarComentariosChamado('000131').length"), 2);
});

test('eventos novos identificam a origem humana e a autoria da demonstração', () => {
  const run = contexto();
  run("sessionStorage.setItem('zela-perfil-admin','ativo')");
  const equipe = run("salvarEquipeChamado('000131',{principal_id:'joao',colaborador_ids:[],equipe_versao:0})");
  assert.equal(equipe.historico.at(-1).autor.nome, 'Administrador');
  assert.equal(equipe.historico.at(-1).origem, 'humana');
  run("sessionStorage.setItem('zela-perfil-admin','inativo'); sessionStorage.setItem('zela-perfil-tecnico','joao')");
  run("salvarEventoServico(listarServicos().find(s=>s.numero==='000131'),'Atendimento iniciado',{estado:'andamento'})");
  const estado = run("listarServicos().find(s=>s.numero==='000131').historico.at(-1)");
  assert.equal(estado.autor.nome, 'João Pereira');
  assert.equal(estado.origem, 'humana');
});
