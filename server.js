const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { listarDias, atualizarDia } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Usuário/senha para acessar o diário. Por padrão usa os valores abaixo,
// mas em produção (Render) é mais seguro definir DIARIO_USUARIO e
// DIARIO_SENHA como variáveis de ambiente em vez de deixar no código.
const USUARIO = (process.env.DIARIO_USUARIO || 'renata').trim().toLowerCase();
const SENHA = process.env.DIARIO_SENHA || 'maria';
const CHAVE_SESSAO = crypto
  .createHash('sha256')
  .update(`${USUARIO}:${SENHA}:diario-da-serra-gramado-2026`)
  .digest('hex');

function lerCookies(req) {
  const cabecalho = req.headers.cookie;
  const cookies = {};
  if (!cabecalho) return cookies;
  cabecalho.split(';').forEach((parte) => {
    const idx = parte.indexOf('=');
    if (idx === -1) return;
    const chave = parte.slice(0, idx).trim();
    const valor = parte.slice(idx + 1).trim();
    if (chave) cookies[chave] = decodeURIComponent(valor);
  });
  return cookies;
}

function estaAutenticado(req) {
  return lerCookies(req).sessao === CHAVE_SESSAO;
}

function exigirLogin(req, res, next) {
  if (estaAutenticado(req)) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
  return res.redirect('/login.html');
}

app.use(express.json());

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  const usuarioOk = (usuario || '').trim().toLowerCase() === USUARIO;
  const senhaOk = senha === SENHA;
  if (usuarioOk && senhaOk) {
    const seisMeses = 60 * 60 * 24 * 180;
    res.setHeader(
      'Set-Cookie',
      `sessao=${CHAVE_SESSAO}; HttpOnly; Path=/; Max-Age=${seisMeses}; SameSite=Lax`
    );
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos' });
});

app.get('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'sessao=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/login.html');
});

// Página principal (protegida) — precisa vir antes do express.static,
// que também tentaria responder por "/".
app.get(['/', '/index.html'], exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/dias', exigirLogin, (req, res) => {
  res.json(listarDias());
});

app.put('/api/dias/:data', exigirLogin, (req, res) => {
  try {
    const { data } = req.params;
    const { tema, clima, notas, atividades } = req.body;
    const atualizado = atualizarDia(data, { tema, clima, notas, atividades });
    if (!atualizado) {
      console.error(`[PUT /api/dias] dia não encontrado: ${data}`);
      return res.status(404).json({ erro: 'Dia não encontrado' });
    }
    console.log(`[PUT /api/dias] salvo com sucesso: ${data}`);
    res.json(atualizado);
  } catch (erro) {
    console.error('[PUT /api/dias] erro ao salvar:', erro);
    res.status(500).json({ erro: 'Falha ao salvar no servidor' });
  }
});

// Arquivos estáticos (CSS, JS, imagens, login.html) — não exigem login,
// já que não expõem os dados da viagem.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Diário de viagem rodando em http://localhost:${PORT}`);
});
