// Resultados do estudo (valores informados no documento de revisão do site)
const ESTUDO_DATA = {
  // Casos confirmados por UF, 2015–2025
  casosUF: [
    { uf: "SP", nome: "São Paulo", casos: 4144, pct: 51.6 },
    { uf: "MG", nome: "Minas Gerais", casos: 2363, pct: 29.4 },
    { uf: "RJ", nome: "Rio de Janeiro", casos: 1051, pct: 13.1 },
    { uf: "ES", nome: "Espírito Santo", casos: 476, pct: 5.9 }
  ],

  // Taxas brutas (por 100.000 hab.) observadas e modeladas
  taxas: [
    { ano: 2015, observada: 1.23, modelada: 0.73 },
    { ano: 2016, observada: 0.64, modelada: 0.82 },
    { ano: 2017, observada: 0.83, modelada: 0.92 },
    { ano: 2018, observada: 0.93, modelada: 1.03 },
    { ano: 2019, observada: 0.49, modelada: 1.16 },
    { ano: 2020, observada: 0.09, modelada: 1.30 },
    { ano: 2021, observada: 0.05, modelada: 1.46 },
    { ano: 2022, observada: 0.04, modelada: 1.64 },
    { ano: 2023, observada: 0.08, modelada: 1.85 },
    { ano: 2024, observada: 3.45, modelada: 2.07 },
    { ano: 2025, observada: 1.06, modelada: 2.33 }
  ],

  // Cobertura vacinal média (%) por UF, 2015–2025
  metaVacinal: 95,
  vacinas: [
    { key: "penta", nome: "Pentavalente", curto: "Penta (3ª dose)" },
    { key: "dtp", nome: "DTP", curto: "DTP" },
    { key: "dtp1", nome: "DTP 1º reforço", curto: "DTP 1º ref." },
    { key: "dtp2", nome: "DTP 2º reforço", curto: "DTP 2º ref." },
    { key: "dtpa", nome: "dTpa em gestantes", curto: "dTpa gest." }
  ],
  cobertura: {
    "Minas Gerais":    { penta: 87.88, dtp: 88.19, dtp1: 80.63, dtp2: 57.19, dtpa: 48.72 },
    "Espírito Santo":  { penta: 84.27, dtp: 84.70, dtp1: 72.26, dtp2: 56.17, dtpa: 60.54 },
    "Rio de Janeiro":  { penta: 76.13, dtp: 76.23, dtp1: 58.11, dtp2: 39.93, dtpa: 47.82 },
    "São Paulo":       { penta: 84.97, dtp: 85.41, dtp1: 73.05, dtp2: 55.82, dtpa: 41.40 },
    "Total (Sudeste)": { penta: 83.89, dtp: 84.23, dtp1: 71.84, dtp2: 53.10, dtpa: 45.24 }
  },

  // Índice de Moran bivariado (taxa de coqueluche × cobertura vacinal)
  moranBivariado: {
    penta: { valor: 0.007, painel: "A", descricao: "Penta (3ª dose da vacina pentavalente)" },
    dtp:   { valor: 0.007, painel: "B", descricao: "DTP (vacina adsorvida difteria, tétano e pertussis)" },
    dtp1:  { valor: 0.016, painel: "C", descricao: "1º reforço da DTP" },
    dtp2:  { valor: 0.026, painel: "D", descricao: "2º reforço da DTP" },
    dtpa:  { valor: 0.010, painel: "E", descricao: "dTpa em gestantes (vacina adsorvida difteria, tétano e pertussis acelular do tipo adulto)" }
  }
};
