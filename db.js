const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'dados.json');

const DIAS_SEMANA = {
  0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
  4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
};

function criarDadosIniciais() {
  const inicio = new Date(2026, 7, 11); // 11 de agosto de 2026
  const dias = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    dias.push({
      data: iso,
      diaSemana: DIAS_SEMANA[d.getDay()],
      numeroDia: i + 1,
      tema: '',
      clima: '',
      notas: '',
      atividades: []
    });
  }
  return dias;
}

function garantirArquivo() {
  if (!fs.existsSync(DATA_PATH)) {
    salvarTudo(criarDadosIniciais());
  }
}

function lerTudo() {
  garantirArquivo();
  const conteudo = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(conteudo);
}

function salvarTudo(dias) {
  const tmpPath = DATA_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(dias, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DATA_PATH);
}

function listarDias() {
  return lerTudo();
}

function atualizarDia(data, campos) {
  const dias = lerTudo();
  const dia = dias.find(d => d.data === data);
  if (!dia) return null;

  if (campos.tema !== undefined) dia.tema = campos.tema;
  if (campos.clima !== undefined) dia.clima = campos.clima;
  if (campos.notas !== undefined) dia.notas = campos.notas;
  if (campos.atividades !== undefined) dia.atividades = campos.atividades;

  salvarTudo(dias);
  return dia;
}

module.exports = { listarDias, atualizarDia };
