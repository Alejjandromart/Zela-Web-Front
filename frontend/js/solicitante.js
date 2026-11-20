const areaChamado = document.querySelector('[data-chamado]');

if (areaChamado) {
  const numero = new URLSearchParams(window.location.search).get('numero');
  const chamado = listarChamados().find(item => item.numero === numero);
  if (!chamado) {
    document.querySelector('#chamado-ausente').hidden = false;
  } else {
    const consulta = new URLSearchParams({ numero }).toString();
    document.querySelector('#voltar-pagina').href = './detalhes-chamado.html?' + consulta;
    const rotuloNumero = document.querySelector('[data-numero]');
    const resumo = document.querySelector('[data-resumo]');
    if (rotuloNumero) rotuloNumero.textContent = 'Chamado #' + numero;
    if (resumo) resumo.textContent = chamado.titulo + ' · ' + chamado.local;
    for (const link of document.querySelectorAll('[data-destino]')) link.search = consulta;
    areaChamado.hidden = false;

    const fotos = document.querySelector('#anexos-chamado');
    const conversa = document.querySelector('#discussao-chamado');
    if (fotos) fotos.append(criarAnexosChamado(chamado));
    if (conversa) conversa.append(criarDiscussaoChamado(chamado.numero, 'Você · Solicitante'));
  }
}

const sair = document.querySelector('#sair-conta');
if (sair) {
  sair.addEventListener('click', () => sessionStorage.removeItem('zela-acesso-demonstracao'));
}
