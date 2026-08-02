document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // TAB NAVEGATION LOGIC
    // ----------------------------------------------------
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Remove active classes
            menuItems.forEach(mi => mi.classList.remove("active"));
            tabContents.forEach(tc => tc.classList.remove("active"));
            
            // Add active classes
            item.classList.add("active");
            const tabId = item.getAttribute("data-tab");
            const targetSection = document.getElementById(tabId);
            if (targetSection) {
                targetSection.classList.add("active");
            }
            
            // Update page title
            const tabText = item.querySelector(".menu-text").textContent;
            pageTitle.textContent = tabText;
        });
    });

    // ----------------------------------------------------
    // THEME TOGGLE LOGIC
    // ----------------------------------------------------
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector(".theme-icon");

    themeToggle.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeIcon.textContent = "🌙";
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeIcon.textContent = "☀️";
        }
        // Update charts with new theme colors
        updateAllCharts();
    });

    // ----------------------------------------------------
    // DATA LOADERS & HELPERS
    // ----------------------------------------------------
    
    // Format numbers to pt-BR
    function formatNumber(num) {
        return num.toLocaleString('pt-BR');
    }

    function formatPercent(num) {
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }

    // Chart instances storage
    let chartInstanceGenero = null;
    let chartInstanceRaca = null;
    let chartInstanceDiag = null;
    let chartInstanceTempCasos = null;
    let chartInstanceTempTaxa = null;

    // Get color scheme depending on current theme
    function getThemeColors() {
        const isDark = document.body.classList.contains("dark-theme");
        return {
            text: isDark ? "#94a3b8" : "#475569",
            grid: isDark ? "#33415540" : "#e2e8f080",
            tooltipBg: isDark ? "#1e293b" : "#ffffff",
            tooltipText: isDark ? "#f8fafc" : "#0f172a",
            accentBlue: "#3b82f6",
            accentGreen: "#10b981",
            accentCyan: "#06b6d4",
            accentOrange: "#f59e0b",
            accentRed: "#ef4444",
            palette: ["#3b82f6", "#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"]
        };
    }

    // ----------------------------------------------------
    // SOCIOMODEMOGRAPHIC AB TAB LOADING
    // ----------------------------------------------------
    const stateSelector = document.getElementById("state-selector");
    const socioTableBody = document.getElementById("socio-table-body");

    // Define table sections and labels
    const sectionsConfig = [
        {
            key: "sexo",
            title: "Gênero (Sexo)",
            categories: ["Masculino", "Feminino", "Ignorado"]
        },
        {
            key: "raca",
            title: "Raça/Cor",
            categories: ["Branca", "Preta", "Parda", "Amarela", "Indigena", "Ignorado"]
        },
        {
            key: "faixa_etaria",
            title: "Faixa Etária",
            categories: ["<1 Ano", "1-4", "5-9", "10-14", "15-19", "20-39", "40-59", "60-64", "65-69", "70-79", "80 e +"]
        },
        {
            key: "zona",
            title: "Zona de Residência",
            categories: ["Urbana", "Rural", "Periurbana", "Ignorado"]
        },
        {
            key: "escolaridade",
            title: "Escolaridade",
            categories: ["Analfabeto", "1ª a 4ª série incompleta do EF", "4ª série completa do EF", "5ª a 8ª série incompleta do EF", "Ensino fundamental completo", "Ensino médio incompleto", "Ensino médio completo", "Educação superior incompleta", "Educação superior completa", "Não se aplica", "Ignorado"]
        },
        {
            key: "criterio_diagnostico",
            title: "Critério de Diagnóstico",
            categories: ["Laboratório", "Clínico-epidemiológico", "Clínico", "Ignorado"]
        },
        {
            key: "evolucao",
            title: "Evolução do Caso",
            categories: ["Cura", "Óbito pelo agravo notificado", "Óbito por outra causa", "Ignorado"]
        }
    ];

    function renderSocioData() {
        const selectedState = stateSelector.value;
        const sdData = COQUELUCHE_DATA.sociodemografico;
        let html = "";

        sectionsConfig.forEach(section => {
            // Section Title Header row
            html += `<tr class="table-section-row"><td colspan="3">${section.title}</td></tr>`;
            
            const stateData = sdData[section.key][selectedState];
            
            // In the data, Total is saved as a key, or we sum the categories
            let total = stateData["Total"] || stateData["TOTAL"] || 0;
            if (total === 0) {
                // Fallback sum
                section.categories.forEach(cat => {
                    total += (stateData[cat] || 0);
                });
            }

            section.categories.forEach(cat => {
                const count = stateData[cat] || 0;
                const percent = total > 0 ? (count / total) * 100 : 0;
                
                html += `
                    <tr>
                        <td style="padding-left: 2rem;">${cat}</td>
                        <td class="text-center">${formatNumber(count)}</td>
                        <td class="text-center">${formatPercent(percent)}</td>
                    </tr>
                `;
            });

            // Section Total row
            html += `
                <tr style="border-bottom: 2px solid var(--border-color);">
                    <td class="font-bold" style="padding-left: 2rem;">Total da Variável</td>
                    <td class="text-center font-bold">${formatNumber(total)}</td>
                    <td class="text-center font-bold">100,00%</td>
                </tr>
            `;
        });

        socioTableBody.innerHTML = html;
        
        // Update charts for this selected state
        renderSocioCharts(selectedState);
    }

    function renderSocioCharts(state) {
        const sdData = COQUELUCHE_DATA.sociodemografico;
        const colors = getThemeColors();

        // 1. Chart Gênero (Doughnut)
        const genData = sdData["sexo"][state];
        const genLabels = ["Masculino", "Feminino", "Ignorado"];
        const genValues = genLabels.map(l => genData[l] || 0);

        if (chartInstanceGenero) chartInstanceGenero.destroy();
        const ctxGen = document.getElementById("chart-genero").getContext("2d");
        chartInstanceGenero = new Chart(ctxGen, {
            type: 'doughnut',
            plugins: [ChartDataLabels],
            data: {
                labels: genLabels,
                datasets: [{
                    data: genValues,
                    backgroundColor: [colors.accentBlue, colors.accentRed, colors.textMuted || '#64748b'],
                    borderWidth: 1,
                    borderColor: colors.tooltipBg
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: colors.text }
                    },
                    datalabels: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 11,
                            family: 'Inter'
                        },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            if (sum === 0) return '';
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return value > 0 ? percentage : '';
                        }
                    }
                }
            }
        });

        // 2. Chart Raça/Cor (Bar)
        const racData = sdData["raca"][state];
        const racLabels = ["Branca", "Preta", "Parda", "Amarela", "Indigena", "Ignorado"];
        const racValues = racLabels.map(l => racData[l] || 0);

        if (chartInstanceRaca) chartInstanceRaca.destroy();
        const ctxRac = document.getElementById("chart-raca").getContext("2d");
        chartInstanceRaca = new Chart(ctxRac, {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: {
                labels: racLabels,
                datasets: [{
                    label: 'Casos por Raça',
                    data: racValues,
                    backgroundColor: colors.accentGreen,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: colors.text,
                        font: {
                            weight: 'bold',
                            size: 10,
                            family: 'Inter'
                        },
                        formatter: (value) => {
                            return value > 0 ? value.toLocaleString('pt-BR') : '';
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid }
                    },
                    y: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid },
                        grace: '10%'
                    }
                }
            }
        });

        // 3. Chart Diagnóstico (Pie/Doughnut)
        const diagData = sdData["criterio_diagnostico"][state];
        const diagLabels = ["Laboratório", "Clínico-epidemiológico", "Clínico", "Ignorado"];
        const diagValues = diagLabels.map(l => diagData[l] || 0);

        if (chartInstanceDiag) chartInstanceDiag.destroy();
        const ctxDiag = document.getElementById("chart-diagnostico").getContext("2d");
        chartInstanceDiag = new Chart(ctxDiag, {
            type: 'doughnut',
            plugins: [ChartDataLabels],
            data: {
                labels: diagLabels,
                datasets: [{
                    data: diagValues,
                    backgroundColor: [colors.accentCyan, colors.accentOrange, colors.accentBlue, '#64748b'],
                    borderWidth: 1,
                    borderColor: colors.tooltipBg
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: colors.text }
                    },
                    datalabels: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 11,
                            family: 'Inter'
                        },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            if (sum === 0) return '';
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return (value * 100 / sum) > 3 ? percentage : '';
                        }
                    }
                }
            }
        });
    }

    stateSelector.addEventListener("change", renderSocioData);

    // ----------------------------------------------------
    // TEMPORAL AB TAB LOADING
    // ----------------------------------------------------
    const temporalTableBody = document.getElementById("temporal-table-body");

    function renderTemporalData() {
        const tempData = COQUELUCHE_DATA.temporal;
        let html = "";

        tempData.forEach(row => {
            html += `
                <tr>
                    <td class="font-bold">${row.ANO}</td>
                    <td class="text-center">${formatNumber(row.COQUELUCHE)}</td>
                    <td class="text-center">${formatNumber(row.POPULACAO)}</td>
                    <td class="text-center font-bold" style="color: var(--color-primary-hover);">${row.TAXA.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                </tr>
            `;
        });

        temporalTableBody.innerHTML = html;
        renderTemporalCharts();
    }

    function renderTemporalCharts() {
        const tempData = COQUELUCHE_DATA.temporal;
        const labels = tempData.map(row => row.ANO);
        const casos = tempData.map(row => row.COQUELUCHE);
        const taxas = tempData.map(row => row.TAXA);
        const colors = getThemeColors();

        // 1. Cases Chart
        if (chartInstanceTempCasos) chartInstanceTempCasos.destroy();
        const ctxCasos = document.getElementById("chart-temporal-casos").getContext("2d");
        chartInstanceTempCasos = new Chart(ctxCasos, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Casos Confirmados',
                    data: casos,
                    borderColor: colors.accentBlue,
                    backgroundColor: colors.accentBlue + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: colors.accentBlue,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: colors.text } }
                },
                scales: {
                    x: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid }
                    },
                    y: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid }
                    }
                }
            }
        });

        // 2. Incidence Rate Chart
        if (chartInstanceTempTaxa) chartInstanceTempTaxa.destroy();
        const ctxTaxa = document.getElementById("chart-temporal-taxa").getContext("2d");
        chartInstanceTempTaxa = new Chart(ctxTaxa, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Taxa de Incidência (por 100 mil)',
                    data: taxas,
                    borderColor: colors.accentOrange,
                    backgroundColor: colors.accentOrange + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: colors.accentOrange,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: colors.text } }
                },
                scales: {
                    x: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid }
                    },
                    y: {
                        ticks: { color: colors.text },
                        grid: { color: colors.grid }
                    }
                }
            }
        });
    }

    // Helper to update all charts together when theme is toggled
    function updateAllCharts() {
        if (stateSelector) {
            renderSocioCharts(stateSelector.value);
        }
        renderTemporalCharts();
    }

    // ----------------------------------------------------
    // INITIALIZATION
    // ----------------------------------------------------
    renderSocioData();
    renderTemporalData();
});
