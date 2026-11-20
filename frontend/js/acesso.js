const login = document.querySelector('#form-login');
const cadastro = document.querySelector('#form-cadastro');
const formulario = login ?? cadastro;

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (cadastro) {
    const { nome, senha, confirmarSenha } = cadastro.elements;
    if (nome.value.trim() === '') {
      nome.setCustomValidity('Digite seu nome.');
      nome.reportValidity();
      return;
    }

    if (senha.value !== confirmarSenha.value) {
      confirmarSenha.setCustomValidity('As senhas precisam ser iguais.');
      confirmarSenha.reportValidity();
      return;
    }

    window.location.assign('./login.html?cadastro=simulado');
    return;
  }

  const email = login.elements.email.value.trim().toLowerCase();
  const tecnico = listarTecnicos().find(conta => conta.email === email
    || (email === 'tecnico@ufam.edu.br' && conta.id === 'carlos'));
  const senha = login.elements.senha;
  if (tecnico?.senhaHash && tecnico.senhaHash !== await hashSenhaDemo(senha.value)) {
    senha.setCustomValidity('Senha incorreta.');
    senha.reportValidity();
    return;
  }
  sessionStorage.removeItem('zela-perfil-admin');
  if (email === 'admin@ufam.edu.br') {
    sessionStorage.removeItem('zela-perfil-tecnico');
    sessionStorage.setItem('zela-perfil-admin', 'ativo');
    window.location.assign('./html/admin/admin.html');
    return;
  }
  const perfil = tecnico?.id;

  sessionStorage.setItem('zela-acesso-demonstracao', 'ativo');
  if (perfil) {
    sessionStorage.setItem('zela-perfil-tecnico', perfil);
    window.location.assign('./html/tecnico/inicio-tecnico.html');
  } else {
    sessionStorage.removeItem('zela-perfil-tecnico');
    window.location.assign('./html/solicitante/index.html');
  }
});

if (login) login.addEventListener('input', () => login.elements.senha.setCustomValidity(''));

if (cadastro) {
  const { nome, senha, confirmarSenha } = cadastro.elements;
  nome.addEventListener('input', () => nome.setCustomValidity(''));
  for (const campo of [senha, confirmarSenha]) {
    campo.addEventListener('input', () => confirmarSenha.setCustomValidity(''));
  }
}

if (login && new URLSearchParams(window.location.search).get('cadastro') === 'simulado') {
  document.querySelector('#cadastro-concluido').hidden = false;
}

formulario.querySelector('button[type="submit"]').disabled = false;
