# Cobertura Vacinal e os Casos de Coqueluche na Região Sudeste do Brasil

Painel (dashboard) web que apresenta os resultados de um estudo epidemiológico
e ecológico sobre os casos de coqueluche e sua relação com a imunização na
Região Sudeste do Brasil (São Paulo, Rio de Janeiro, Minas Gerais e Espírito
Santo), no período de **2015 a 2025**.

## Páginas

- **Visão Geral** — resumo do estudo e mapa interativo dos estados da Região Sudeste.
- **Perfil Sociodemográfico** — distribuição dos casos por sexo, faixa etária, raça/cor, escolaridade, zona de residência, critério diagnóstico e evolução.
- **Análise Temporal** — taxas brutas observadas e modeladas e série histórica anual.
- **Cobertura Vacinal** — cobertura por indicador (Pentavalente, DTP, reforços e dTpa em gestantes) e distância da meta de 95%.
- **Análise Espacial** — distribuição das taxas (brutas e suavizadas), autocorrelação espacial (LISA) e associação bivariada de Moran com a cobertura vacinal.

## Tecnologias

- **HTML5** e **CSS3** (tema claro/escuro, layout responsivo para telas de notebook de 14").
- **JavaScript (vanilla)** — sem frameworks.
- **[Chart.js](https://www.chartjs.org/)** com o plugin **chartjs-datalabels** para os gráficos.
- **SVG** para o mapa interativo do Brasil.
- **Google Fonts** — Inter e Outfit.

Os dados são oriundos do **SINAN** (casos) e do **PNI** (coberturas vacinais).

## Estrutura

```
├── index.html                      # Visão Geral
├── perfil-sociodemografico.html
├── analise-temporal.html
├── cobertura-vacinal.html
├── analise-espacial.html
├── css/
│   └── style.css                   # Estilos e responsividade
├── js/
│   ├── data.js                     # Dados sociodemográficos e temporais
│   ├── estudo-data.js              # Taxas, cobertura vacinal e índices de Moran
│   ├── brasil-map.js               # Contorno dos estados (SVG) do mapa
│   └── script.js                   # Lógica, gráficos e interações
├── img/                            # Mapas das análises espaciais
└── material/                       # Planilhas e documentos de base do estudo
```

## Como executar

O projeto é totalmente estático — não há build nem dependências para instalar.

- Abra o arquivo `index.html` diretamente no navegador, **ou**
- Sirva a pasta com um servidor estático, por exemplo:

```bash
python -m http.server 8000
```

e acesse `http://localhost:8000`.
