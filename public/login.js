(function () {
  const form = document.getElementById('form-login');
  const campoUsuario = document.getElementById('campo-usuario');
  const campoSenha = document.getElementById('campo-senha');
  const mensagemErro = document.getElementById('mensagem-erro');
  const botao = form.querySelector('.capa__botao');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensagemErro.textContent = '';
    botao.disabled = true;
    botao.textContent = 'Abrindo...';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: campoUsuario.value,
          senha: campoSenha.value,
        }),
      });

      if (res.ok) {
        window.location.href = '/';
        return;
      }

      const dados = await res.json().catch(() => ({}));
      mensagemErro.textContent = dados.erro || 'Usuário ou senha incorretos.';
    } catch (erro) {
      mensagemErro.textContent = 'Não foi possível conectar. Verifique sua internet e tente de novo.';
    } finally {
      botao.disabled = false;
      botao.textContent = 'Abrir o diário';
    }
  });
})();
