# Diário da Serra — Gramado 2026

Diário de viagem em formato de caderno (11 a 22 de agosto de 2026), com um
backend simples para você editar o roteiro direto no site, de qualquer
dispositivo.

## Como funciona

- `server.js` + `db.js`: um servidor Node/Express que guarda o tema do dia,
  clima, atividades e observações de cada um dos 12 dias da viagem em um
  arquivo `dados.json` local (criado automaticamente na primeira vez que o
  servidor roda).
- `public/`: o front-end (HTML/CSS/JS) — o "caderno" com abas de dia,
  navegação e o botão **Editar / Salvar**.

Quando você clica em **Editar**, os campos da página ficam editáveis. Ao
clicar em **Salvar** (ou trocar de dia), as alterações são enviadas para o
servidor e ficam salvas no banco — de qualquer computador ou celular que
acesse o site.

## Rodando localmente

```bash
npm install
npm start
```

Acesse `http://localhost:3000`.

## Login

O site agora pede usuário e senha antes de abrir. Por padrão:

- **Usuário:** `renata`
- **Senha:** `maria`

Esses valores estão fixos no `server.js`. Funciona assim mesmo sem nenhuma
configuração extra — mas como o código provavelmente vai para um
repositório do GitHub, **duas recomendações**:

1. Deixe o repositório do GitHub como **privado** (em vez de público), já
   que a senha aparece no código-fonte.
2. Se quiser evitar isso completamente, defina as variáveis de ambiente
   `DIARIO_USUARIO` e `DIARIO_SENHA` no painel do Render (aba
   **Environment**) em vez de deixar os valores padrão — o servidor usa
   elas automaticamente se existirem, e assim a senha real nunca fica no
   GitHub.

Para sair, tem um link "Sair" no topo do diário.

## Previsão do tempo

Além da temperatura mínima/máxima, cada dia mostra sol, nublado, chuva etc.
separado por manhã / tarde / noite, usando o Open-Meteo (serviço gratuito,
sem necessidade de chave). Assim como a temperatura, isso só fica
disponível a partir de ~16 dias antes da data.

## Publicando no GitHub


```bash
git init
git add .
git commit -m "Diário da viagem para Gramado"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/diario-gramado.git
git push -u origin main
```

(Crie antes o repositório vazio em github.com/new, sem README, e troque
`SEU-USUARIO` pelo seu usuário do GitHub.)

## Publicando no Render

1. Em [render.com](https://render.com), clique em **New +** → **Web Service**.
2. Conecte sua conta do GitHub e escolha o repositório `diario-gramado`.
3. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Clique em **Create Web Service**. Em poucos minutos o Render te dá uma
   URL pública (algo como `https://diario-gramado.onrender.com`).

### Importante sobre o armazenamento

O arquivo `dados.json` fica no disco do próprio serviço no Render. No plano
gratuito, esse disco é **apagado a cada novo deploy** (quando você faz
`git push` de uma alteração de código) — mas os dados **permanecem** entre
acessos normais e reinícios automáticos do serviço, então para a duração da
viagem isso funciona bem, desde que você não suba novos commits depois de
começar a preencher o diário.

Se quiser que os dados nunca se percam mesmo com novos deploys, dá para
adicionar um **Persistent Disk** no Render (recurso pago) ou trocar por um
banco gerenciado — posso te ajudar a migrar se decidir seguir por esse
caminho.
