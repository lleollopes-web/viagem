(function () {
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const FOTOS = ['foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg', 'foto-4.jpg', 'foto-5.jpg'];

  // Coordenadas de Gramado, RS
  const LAT = -29.3746;
  const LON = -50.8747;

  let dias = [];
  let indiceAtual = 0;
  let editando = false;
  let previsoes = {}; // { '2026-08-11': { max: 14, min: 6 } }

  const CODIGO_TEMPO = {
    0: { icone: '☀️', label: 'Sol' },
    1: { icone: '🌤️', label: 'Poucas nuvens' },
    2: { icone: '⛅', label: 'Parcial. nublado' },
    3: { icone: '☁️', label: 'Nublado' },
    45: { icone: '🌫️', label: 'Neblina' },
    48: { icone: '🌫️', label: 'Neblina' },
    51: { icone: '🌦️', label: 'Chuvisco' },
    53: { icone: '🌦️', label: 'Chuvisco' },
    55: { icone: '🌦️', label: 'Chuvisco' },
    56: { icone: '🌦️', label: 'Chuvisco gelado' },
    57: { icone: '🌦️', label: 'Chuvisco gelado' },
    61: { icone: '🌧️', label: 'Chuva' },
    63: { icone: '🌧️', label: 'Chuva' },
    65: { icone: '🌧️', label: 'Chuva forte' },
    66: { icone: '🌧️', label: 'Chuva gelada' },
    67: { icone: '🌧️', label: 'Chuva gelada' },
    71: { icone: '❄️', label: 'Neve' },
    73: { icone: '❄️', label: 'Neve' },
    75: { icone: '❄️', label: 'Neve forte' },
    77: { icone: '❄️', label: 'Neve' },
    80: { icone: '🌦️', label: 'Aguaceiros' },
    81: { icone: '🌧️', label: 'Aguaceiros' },
    82: { icone: '🌧️', label: 'Aguaceiros fortes' },
    85: { icone: '🌨️', label: 'Neve' },
    86: { icone: '🌨️', label: 'Neve' },
    95: { icone: '⛈️', label: 'Trovoada' },
    96: { icone: '⛈️', label: 'Trovoada' },
    99: { icone: '⛈️', label: 'Trovoada' },
  };

  // Ordem de gravidade — usada para escolher o código mais relevante de cada período
  const ORDEM_GRAVIDADE = [99, 96, 95, 86, 85, 75, 77, 73, 71, 82, 81, 67, 66, 65, 63, 61, 57, 56, 55, 53, 51, 48, 45, 3, 2, 1, 0];

  const PERIODOS = [
    { chave: 'manha', nome: 'Manhã', horas: [6, 7, 8, 9, 10, 11] },
    { chave: 'tarde', nome: 'Tarde', horas: [12, 13, 14, 15, 16, 17] },
    { chave: 'noite', nome: 'Noite', horas: [18, 19, 20, 21, 22, 23] },
  ];

  const el = {
    lombada: document.getElementById('lombada'),
    esquerda: document.getElementById('conteudo-esquerda'),
    direita: document.getElementById('conteudo-direita'),
    marcaEsquerda: document.getElementById('marca-agua-esquerda'),
    marcaDireita: document.getElementById('marca-agua-direita'),
    folhaEsquerda: document.getElementById('folha-esquerda'),
    folhaDireita: document.getElementById('folha-direita'),
    btnEditar: document.getElementById('btn-editar'),
    btnAnterior: document.getElementById('btn-anterior'),
    btnProximo: document.getElementById('btn-proximo'),
    indicador: document.getElementById('indicador-pagina'),
    aviso: document.getElementById('aviso-salvo'),
  };

  async function carregar() {
    const res = await fetch('/api/dias');
    dias = await res.json();
    renderLombada();
    renderPagina();
    buscarPrevisao();
  }

  async function buscarPrevisao() {
    if (!dias.length) return;
    const inicio = dias[0].data;
    const fim = dias[dias.length - 1].data;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&hourly=weathercode,precipitation_probability` +
      `&timezone=America%2FSao_Paulo&start_date=${inicio}&end_date=${fim}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('resposta não ok');
      const dados = await res.json();

      if (dados.daily && dados.daily.time) {
        dados.daily.time.forEach((data, i) => {
          previsoes[data] = previsoes[data] || {};
          previsoes[data].max = Math.round(dados.daily.temperature_2m_max[i]);
          previsoes[data].min = Math.round(dados.daily.temperature_2m_min[i]);
        });
      }

      if (dados.hourly && dados.hourly.time) {
        // Agrupa hora a hora por data: { '2026-08-11': { 6: {codigo, chuva}, 7: {...}, ... } }
        const porData = {};
        dados.hourly.time.forEach((horaIso, i) => {
          const [data, horaStr] = horaIso.split('T');
          const hora = parseInt(horaStr.slice(0, 2), 10);
          porData[data] = porData[data] || {};
          porData[data][hora] = {
            codigo: dados.hourly.weathercode[i],
            chuva: dados.hourly.precipitation_probability ? dados.hourly.precipitation_probability[i] : null,
          };
        });

        Object.keys(porData).forEach(data => {
          previsoes[data] = previsoes[data] || {};
          previsoes[data].periodos = {};
          PERIODOS.forEach(periodo => {
            const horasDoPeriodo = periodo.horas
              .map(h => porData[data][h])
              .filter(Boolean);
            if (!horasDoPeriodo.length) return;

            // Escolhe o código mais "grave" presente no período
            let codigoEscolhido = horasDoPeriodo[0].codigo;
            for (const cod of ORDEM_GRAVIDADE) {
              if (horasDoPeriodo.some(h => h.codigo === cod)) { codigoEscolhido = cod; break; }
            }
            const chuvaMax = Math.max(...horasDoPeriodo.map(h => h.chuva ?? 0));

            previsoes[data].periodos[periodo.chave] = {
              ...(CODIGO_TEMPO[codigoEscolhido] || { icone: '🌡️', label: '—' }),
              chuva: chuvaMax,
            };
          });
        });
      }

      renderPagina();
    } catch (e) {
      console.error('Não foi possível buscar a previsão do tempo:', e);
    }
  }

  function svgMontanhas() {
    return `<svg class="motivo-svg" width="120" height="34" viewBox="0 0 120 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 30 L24 10 L38 22 L58 4 L82 26 L96 14 L118 30" stroke="#2f4a3e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
      <circle cx="100" cy="8" r="4" stroke="#b8923f" stroke-width="1.6" fill="none"/>
    </svg>`;
  }

  function aplicarMarcaAgua() {
    const foto = FOTOS[indiceAtual % FOTOS.length];
    const url = `url("imagens/${foto}")`;
    el.marcaEsquerda.style.backgroundImage = url;
    el.marcaDireita.style.backgroundImage = url;
  }

  function renderLombada() {
    el.lombada.innerHTML = '';
    dias.forEach((dia, i) => {
      const btn = document.createElement('button');
      btn.className = 'aba-dia' + (i === indiceAtual ? ' ativa' : '');
      const d = new Date(dia.data + 'T00:00:00');
      btn.textContent = `${d.getDate()} ${MESES[d.getMonth()]}`;
      btn.setAttribute('aria-label', `Ir para ${dia.diaSemana}, ${d.getDate()} de ${MESES[d.getMonth()]}`);
      btn.addEventListener('click', () => irPara(i));
      el.lombada.appendChild(btn);
    });
  }

  function blocoPrevisaoReal(dataIso) {
    const p = previsoes[dataIso];
    if (!p || (p.max === undefined && !p.periodos)) {
      return `<p class="previsao-real previsao-real--vazia">Previsão ainda não disponível<br><span>(aparece a partir de ~16 dias antes)</span></p>`;
    }
    const faixa = (p.max !== undefined) ? `<span class="previsao-faixa">${p.min}°C – ${p.max}°C</span>` : '';
    let periodosHtml = '';
    if (p.periodos) {
      periodosHtml = `<div class="previsao-periodos">` +
        PERIODOS.map(periodo => {
          const info = p.periodos[periodo.chave];
          if (!info) return '';
          const chuvaHtml = info.chuva >= 30 ? `<span class="previsao-chuva">${info.chuva}% chuva</span>` : '';
          return `
            <div class="periodo">
              <span class="periodo__nome">${periodo.nome}</span>
              <span class="periodo__icone" title="${info.label}">${info.icone}</span>
              <span class="periodo__label">${info.label}</span>
              ${chuvaHtml}
            </div>`;
        }).join('') +
        `</div>`;
    }
    return `<div class="previsao-real">${faixa}${periodosHtml}</div>`;
  }

  function formatarMoeda(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function calcularTotalDia(atividades) {
    return atividades.reduce((soma, a) => soma + (parseFloat(a.valor) || 0), 0);
  }

  function renderPagina() {
    const dia = dias[indiceAtual];
    if (!dia) return;

    aplicarMarcaAgua();

    const d = new Date(dia.data + 'T00:00:00');
    const somenteLeitura = !editando;

    el.esquerda.innerHTML = `
      <span class="contador-dia">Dia ${dia.numeroDia} de ${dias.length}</span>
      <p class="data-grande">${String(d.getDate()).padStart(2, '0')}</p>
      <p class="mes-numero">${MESES[d.getMonth()]}. ${d.getFullYear()}</p>
      <p class="dia-semana">${dia.diaSemana}</p>
      ${svgMontanhas()}
      <span class="campo-label">Temperatura prevista</span>
      ${blocoPrevisaoReal(dia.data)}
      <span class="campo-label">Tema do dia</span>
      <input type="text" class="campo-texto campo-tema campo-texto--vazio" placeholder="ex.: Chegada em Gramado"
        value="${escapeAttr(dia.tema)}" ${somenteLeitura ? 'disabled' : ''} />
      <span class="campo-label">Notas sobre o clima</span>
      <input type="text" class="campo-texto campo-clima campo-texto--vazio" placeholder="ex.: levar casaco extra"
        value="${escapeAttr(dia.clima)}" ${somenteLeitura ? 'disabled' : ''} />
    `;

    const listaHtml = dia.atividades.length
      ? dia.atividades.map((a, i) => itemAtividadeHtml(a, i, somenteLeitura)).join('')
      : (somenteLeitura ? '<p class="vazio-atividades">Nenhuma atividade anotada ainda.</p>' : '');

    const total = calcularTotalDia(dia.atividades);

    el.direita.innerHTML = `
      <h2 class="folha__titulo-secao">Roteiro do dia</h2>
      <ul class="lista-atividades ${editando ? 'editando' : ''}" id="lista-atividades">${listaHtml}</ul>
      ${editando ? '<button type="button" class="btn-add-item" id="btn-add-item">+ adicionar horário</button>' : ''}
      <p class="total-dia" id="total-dia">Total do dia: <strong>${formatarMoeda(total)}</strong></p>
      <h2 class="folha__titulo-secao">Observações</h2>
      <textarea class="textarea-notas" id="campo-notas" placeholder="Anotações, lembranças, o que não pode faltar..."
        ${somenteLeitura ? 'disabled' : ''}>${escapeHtml(dia.notas)}</textarea>
    `;

    if (editando) {
      document.getElementById('btn-add-item').addEventListener('click', adicionarItem);
      el.direita.querySelectorAll('.btn-remover-item').forEach(btn => {
        btn.addEventListener('click', (e) => removerItem(Number(e.currentTarget.dataset.indice)));
      });
      el.direita.querySelectorAll('.item-atividade input').forEach(input => {
        input.addEventListener('input', atualizarTotalNaTela);
      });
    }

    el.indicador.textContent = `${indiceAtual + 1} / ${dias.length}`;
    el.btnAnterior.disabled = indiceAtual === 0;
    el.btnProximo.disabled = indiceAtual === dias.length - 1;

    [...el.lombada.children].forEach((btn, i) => btn.classList.toggle('ativa', i === indiceAtual));
  }

  function atualizarTotalNaTela() {
    const atividades = coletarAtividadesDoDom();
    const total = calcularTotalDia(atividades);
    const elTotal = document.getElementById('total-dia');
    if (elTotal) elTotal.innerHTML = `Total do dia: <strong>${formatarMoeda(total)}</strong>`;
  }

  function itemAtividadeHtml(atividade, i, somenteLeitura) {
    return `
      <li class="item-atividade ${somenteLeitura ? 'somente-leitura' : ''}">
        <input type="time" class="hora" data-campo="hora" data-indice="${i}"
          value="${escapeAttr(atividade.hora)}" ${somenteLeitura ? 'disabled' : ''} />
        <input type="text" class="descricao" data-campo="descricao" data-indice="${i}" placeholder="O que vai fazer nesse horário"
          value="${escapeAttr(atividade.descricao)}" ${somenteLeitura ? 'disabled' : ''} />
        <input type="number" class="valor" data-campo="valor" data-indice="${i}" placeholder="R$ 0,00" step="0.01" min="0"
          value="${atividade.valor !== undefined && atividade.valor !== '' ? escapeAttr(String(atividade.valor)) : ''}"
          ${somenteLeitura ? 'disabled' : ''} />
        <button type="button" class="btn-remover-item" data-indice="${i}" aria-label="Remover este item">✕</button>
      </li>
    `;
  }

  function coletarAtividadesDoDom() {
    const linhas = [...el.direita.querySelectorAll('.item-atividade')];
    return linhas.map(li => ({
      hora: li.querySelector('[data-campo="hora"]').value.trim(),
      descricao: li.querySelector('[data-campo="descricao"]').value.trim(),
      valor: parseFloat(li.querySelector('[data-campo="valor"]').value) || 0,
    }));
  }

  function adicionarItem() {
    const dia = dias[indiceAtual];
    dia.atividades = coletarAtividadesDoDom();
    dia.atividades.push({ hora: '', descricao: '', valor: 0 });
    renderPagina();
    const inputs = el.direita.querySelectorAll('.item-atividade .hora');
    inputs[inputs.length - 1]?.focus();
  }

  function removerItem(indice) {
    const dia = dias[indiceAtual];
    dia.atividades = coletarAtividadesDoDom();
    dia.atividades.splice(indice, 1);
    renderPagina();
  }

  async function irPara(i) {
    if (i < 0 || i >= dias.length) return;
    if (editando) {
      await salvarDiaAtual();
    }
    indiceAtual = i;
    renderPagina();
  }

  async function salvarDiaAtual() {
    const dia = dias[indiceAtual];
    dia.tema = el.esquerda.querySelector('.campo-tema').value.trim();
    dia.clima = el.esquerda.querySelector('.campo-clima').value.trim();
    dia.notas = document.getElementById('campo-notas').value;
    dia.atividades = coletarAtividadesDoDom().filter(a => a.hora || a.descricao || a.valor);

    try {
      const res = await fetch(`/api/dias/${dia.data}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema: dia.tema, clima: dia.clima, notas: dia.notas, atividades: dia.atividades
        }),
      });
      if (!res.ok) {
        const corpo = await res.text();
        throw new Error(`HTTP ${res.status}: ${corpo}`);
      }
      const salvo = await res.json();
      dias[indiceAtual] = salvo;
      mostrarAviso('Página salva ✓');
    } catch (e) {
      console.error('Erro ao salvar:', e);
      mostrarAviso('Não foi possível salvar — verifique sua conexão e tente de novo', true);
    }
  }

  function mostrarAviso(texto, erro) {
    el.aviso.textContent = texto;
    el.aviso.classList.toggle('aviso-salvo--erro', !!erro);
    el.aviso.classList.add('mostrar');
    clearTimeout(mostrarAviso._t);
    mostrarAviso._t = setTimeout(() => el.aviso.classList.remove('mostrar'), erro ? 4000 : 2200);
  }

  function escapeAttr(v) { return escapeHtml(v).replace(/"/g, '&quot;'); }
  function escapeHtml(v) {
    return String(v || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  el.btnEditar.addEventListener('click', async () => {
    if (editando) {
      await salvarDiaAtual();
    }
    editando = !editando;
    el.btnEditar.setAttribute('aria-pressed', String(editando));
    el.btnEditar.querySelector('span').textContent = editando ? 'Salvar' : 'Editar';
    renderPagina();
  });

  el.btnAnterior.addEventListener('click', () => irPara(indiceAtual - 1));
  el.btnProximo.addEventListener('click', () => irPara(indiceAtual + 1));

  document.addEventListener('keydown', (e) => {
    if (editando) return;
    if (e.key === 'ArrowLeft') irPara(indiceAtual - 1);
    if (e.key === 'ArrowRight') irPara(indiceAtual + 1);
  });

  carregar();
})();
