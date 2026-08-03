// ----------------------------------------------------
// THEME INITIALIZATION (Must run before DOMContentLoaded to prevent flash)
// ----------------------------------------------------
const savedTheme = localStorage.getItem("theme") || "dark-theme";
document.body.className = savedTheme;

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // THEME TOGGLE LOGIC
    // ----------------------------------------------------
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector(".theme-icon");
    
    // Set initial icon based on loaded theme
    themeIcon.textContent = savedTheme === "dark-theme" ? "☀️" : "🌙";

    themeToggle.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeIcon.textContent = "🌙";
            localStorage.setItem("theme", "light-theme");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeIcon.textContent = "☀️";
            localStorage.setItem("theme", "dark-theme");
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

    function formatPercent1(num) {
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    }

    // Chart instances storage
    let socioChartInstances = {};
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
            textMuted: "#64748b",
            palette: ["#3b82f6", "#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"]
        };
    }

    // Draws a dominant-category label in the hollow center of a doughnut chart
    const centerTextPlugin = {
        id: "centerText",
        afterDraw(chart) {
            const opts = chart.options.plugins && chart.options.plugins.centerText;
            if (!opts || !opts.value) return;
            const { ctx, chartArea: { width, height, left, top } } = chart;
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "700 20px 'Outfit', sans-serif";
            ctx.fillStyle = opts.color;
            ctx.fillText(opts.value, left + width / 2, top + height / 2 - 9);
            ctx.font = "500 10px 'Inter', sans-serif";
            ctx.fillStyle = opts.subColor;
            ctx.fillText(opts.label, left + width / 2, top + height / 2 + 12);
            ctx.restore();
        }
    };

    // ----------------------------------------------------
    // SOCIOMODEMOGRAPHIC TAB LOADING
    // ----------------------------------------------------
    const stateSelector = document.getElementById("state-selector");

    // Define section categories and the chart type used to represent each one
    const sectionsConfig = [
        {
            key: "sexo",
            categories: ["Masculino", "Feminino", "Ignorado"],
            chartType: "doughnut"
        },
        {
            key: "faixa_etaria",
            categories: ["<1 Ano", "1-4", "5-9", "10-14", "15-19", "20-39", "40-59", "60-64", "65-69", "70-79", "80 e +"],
            chartType: "bar"
        },
        {
            key: "raca",
            categories: ["Branca", "Preta", "Parda", "Amarela", "Indigena", "Ignorado"],
            chartType: "doughnut"
        },
        {
            key: "zona",
            categories: ["Urbana", "Rural", "Periurbana", "Ignorado"],
            chartType: "doughnut"
        },
        {
            key: "escolaridade",
            categories: ["Analfabeto", "1ª a 4ª série incompleta do EF", "4ª série completa do EF", "5ª a 8ª série incompleta do EF", "Ensino fundamental completo", "Ensino médio incompleto", "Ensino médio completo", "Educação superior incompleta", "Educação superior completa", "Não se aplica", "Ignorado"],
            chartType: "bar",
            // "Não se aplica" is mostly infants too young for school; at ~10x
            // every other category it flattens a linear bar chart, so it's
            // shown in the table but left out of the chart itself
            excludeFromChart: ["Não se aplica"]
        },
        {
            key: "criterio_diagnostico",
            categories: ["Laboratório", "Clínico-epidemiológico", "Clínico", "Ignorado"],
            chartType: "doughnut"
        },
        {
            key: "evolucao",
            categories: ["Cura", "Óbito pelo agravo notificado", "Óbito por outra causa", "Ignorado"],
            chartType: "doughnut"
        }
    ];

    // Resolve the color(s) used by a section's chart and table swatches
    function getSocioSectionColors(section, colors) {
        switch (section.key) {
            case "sexo": return [colors.accentBlue, "#ec4899", colors.textMuted];
            case "raca": return colors.palette;
            case "faixa_etaria": return colors.accentBlue;
            case "zona": return [colors.accentGreen, colors.accentOrange, colors.accentCyan, colors.textMuted];
            case "escolaridade": return colors.accentRed;
            case "criterio_diagnostico": return [colors.accentCyan, colors.accentOrange, colors.accentBlue, colors.textMuted];
            case "evolucao": return [colors.accentGreen, colors.accentRed, colors.accentOrange, colors.textMuted];
            default: return colors.palette;
        }
    }

    function renderSocioSection(section, state) {
        const sdData = COQUELUCHE_DATA.sociodemografico;
        const stateData = sdData[section.key][state];
        if (!stateData) return;

        let total = stateData["Total"] || stateData["TOTAL"] || 0;
        if (total === 0) {
            section.categories.forEach(cat => {
                total += (stateData[cat] || 0);
            });
        }

        const colors = getThemeColors();
        const sectionColors = getSocioSectionColors(section, colors);
        const isMultiColor = Array.isArray(sectionColors);

        // Dominant category (excluding non-informative buckets), reused by the
        // doughnut center label and by the insight callout below the card
        const ranked = section.categories
            .map(cat => ({ cat, count: stateData[cat] || 0 }))
            .filter(item => item.cat !== "Ignorado" && item.cat !== "Não se aplica")
            .sort((a, b) => b.count - a.count);

        // ---- Table ----
        const tbody = document.getElementById(`table-${section.key}`);
        if (tbody) {
            const maxCount = Math.max(...section.categories.map(cat => stateData[cat] || 0));
            let html = "";
            section.categories.forEach((cat, idx) => {
                const count = stateData[cat] || 0;
                const percent = total > 0 ? (count / total) * 100 : 0;
                const isMax = count === maxCount && count > 0;
                const swatch = section.chartType === "doughnut"
                    ? `<span class="socio-swatch" style="background-color: ${isMultiColor ? sectionColors[idx % sectionColors.length] : sectionColors};"></span>`
                    : "";
                html += `
                    <tr class="${isMax ? "row-highlight" : ""}">
                        <td>${swatch}${cat}</td>
                        <td class="text-center">${formatNumber(count)}</td>
                        <td class="text-center">${formatPercent(percent)}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        // ---- Chart ----
        const canvas = document.getElementById(`chart-${section.key}`);
        if (canvas) {
            if (socioChartInstances[section.key]) {
                socioChartInstances[section.key].destroy();
            }

            // Categories explicitly excluded from the chart (but not the table) —
            // used for outlier buckets that would otherwise flatten the scale
            const excludeSet = new Set(section.excludeFromChart || []);
            const chartCategories = section.categories.filter(cat => !excludeSet.has(cat));
            const chartValues = chartCategories.map(cat => stateData[cat] || 0);
            const chartColors = isMultiColor
                ? section.categories
                    .map((cat, idx) => ({ cat, color: sectionColors[idx % sectionColors.length] }))
                    .filter(item => !excludeSet.has(item.cat))
                    .map(item => item.color)
                : sectionColors;

            const ctx = canvas.getContext("2d");

            if (section.chartType === "doughnut") {
                const topCategory = ranked[0];
                const centerValue = topCategory && total > 0
                    ? formatPercent1((topCategory.count / total) * 100)
                    : "";

                socioChartInstances[section.key] = new Chart(ctx, {
                    type: "doughnut",
                    plugins: [ChartDataLabels, centerTextPlugin],
                    data: {
                        labels: chartCategories,
                        datasets: [{
                            data: chartValues,
                            backgroundColor: chartColors,
                            borderWidth: 1,
                            borderColor: colors.tooltipBg
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "68%",
                        plugins: {
                            legend: { display: false },
                            centerText: {
                                value: centerValue,
                                label: topCategory ? topCategory.cat : "",
                                color: colors.tooltipText,
                                subColor: colors.text
                            },
                            datalabels: {
                                color: "#ffffff",
                                font: { weight: "bold", size: 10, family: "Inter" },
                                formatter: (value, ctx) => {
                                    const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    if (sum === 0) return "";
                                    const pct = (value * 100 / sum);
                                    return pct > 4 ? pct.toFixed(1) + "%" : "";
                                }
                            }
                        }
                    }
                });
            } else {
                socioChartInstances[section.key] = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: chartCategories,
                        datasets: [{
                            data: chartValues,
                            backgroundColor: chartColors,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => " " + formatNumber(ctx.parsed.x)
                                }
                            }
                        },
                        scales: {
                            x: {
                                ticks: { color: colors.text },
                                grid: { color: colors.grid }
                            },
                            y: {
                                ticks: { color: colors.text, font: { size: 10 } },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        }

        // ---- Insight ----
        const insightEl = document.getElementById(`insight-${section.key}`);
        if (insightEl) {
            let html = "";
            // Only worth stating "top 2 concentrate X%" when there's a 3rd+
            // category left out — with exactly 2 (e.g. Sexo), they trivially
            // sum to ~100% and the sentence says nothing informative
            if (total > 0 && ranked.length >= 3) {
                const p1 = (ranked[0].count / total) * 100;
                const p2 = (ranked[1].count / total) * 100;
                html = `<strong>${ranked[0].cat}</strong> (${formatPercent1(p1)}) e <strong>${ranked[1].cat}</strong> (${formatPercent1(p2)}) concentram ${formatPercent1(p1 + p2)} dos casos.`;
            } else if (total > 0 && ranked.length === 1) {
                const p1 = (ranked[0].count / total) * 100;
                html = `<strong>${ranked[0].cat}</strong> concentra ${formatPercent1(p1)} dos casos.`;
            }

            if (section.excludeFromChart && total > 0) {
                section.excludeFromChart.forEach(cat => {
                    const count = stateData[cat] || 0;
                    if (count === 0) return;
                    const pct = formatPercent1((count / total) * 100);
                    html += `<br><span class="socio-note">"${cat}" (${formatNumber(count)} casos, ${pct}) foi omitido do gráfico para preservar a escala comparativa; consulte a tabela para o valor completo.</span>`;
                });
            }

            insightEl.innerHTML = html;
            insightEl.style.display = html ? "" : "none";
        }
    }

    function renderSocioSummary(state) {
        const list = document.getElementById("socio-summary-list");
        if (!list) return;
        const sdData = COQUELUCHE_DATA.sociodemografico;

        const sexoData = sdData.sexo[state];
        const totalCasos = sexoData.Total || sexoData.TOTAL || 0;
        const pctMasc = totalCasos > 0 ? (sexoData.Masculino / totalCasos) * 100 : 0;
        const pctFem = totalCasos > 0 ? (sexoData.Feminino / totalCasos) * 100 : 0;
        const predominantSexo = pctMasc >= pctFem
            ? { label: "masculino", pct: pctMasc }
            : { label: "feminino", pct: pctFem };

        const faixaData = sdData.faixa_etaria[state];
        const faixaCategories = ["<1 Ano", "1-4", "5-9", "10-14", "15-19", "20-39", "40-59", "60-64", "65-69", "70-79", "80 e +"];
        const faixaTotal = faixaData.Total || faixaCategories.reduce((sum, cat) => sum + (faixaData[cat] || 0), 0);
        const topFaixa = faixaCategories
            .map(cat => ({ cat, count: faixaData[cat] || 0 }))
            .sort((a, b) => b.count - a.count)[0];
        const pctFaixa = faixaTotal > 0 ? (topFaixa.count / faixaTotal) * 100 : 0;

        const racaData = sdData.raca[state];
        const racaCategories = ["Branca", "Preta", "Parda", "Amarela", "Indigena"];
        const racaTotal = racaData.Total || 0;
        const topRaca = racaCategories
            .map(cat => ({ cat, count: racaData[cat] || 0 }))
            .sort((a, b) => b.count - a.count)[0];
        const pctRaca = racaTotal > 0 ? (topRaca.count / racaTotal) * 100 : 0;

        const diagData = sdData.criterio_diagnostico[state];
        const diagTotal = diagData.Total || 0;
        const pctLab = diagTotal > 0 ? (diagData["Laboratório"] / diagTotal) * 100 : 0;

        const evolData = sdData.evolucao[state];
        const evolTotal = evolData.Total || 0;
        const obitosAgravo = evolData["Óbito pelo agravo notificado"] || 0;
        const obitosOutraCausa = evolData["Óbito por outra causa"] || 0;

        const zonaData = sdData.zona[state];
        const zonaTotal = zonaData.Total || 0;
        const pctIgnoradoZona = zonaTotal > 0 ? (zonaData.Ignorado / zonaTotal) * 100 : 0;

        const items = [
            `<li class="summary-item"><span class="summary-dot"></span><span>O recorte selecionado registrou <strong>${formatNumber(totalCasos)} casos</strong> de coqueluche, com predominância do sexo ${predominantSexo.label} (<strong>${formatPercent1(predominantSexo.pct)}</strong>).</span></li>`,
            `<li class="summary-item"><span class="summary-dot dot-purple"></span><span>A faixa etária <strong>${topFaixa.cat}</strong> concentrou <strong>${formatPercent1(pctFaixa)}</strong> dos casos notificados.</span></li>`,
            `<li class="summary-item"><span class="summary-dot dot-green"></span><span>O critério <strong>${pctLab >= 50 ? "laboratorial" : "clínico"}</strong> respondeu por <strong>${formatPercent1(pctLab)}</strong> dos diagnósticos confirmatórios.</span></li>`,
            `<li class="summary-item"><span class="summary-dot dot-orange"></span><span>Predomínio de casos em pessoas de raça/cor <strong>${topRaca.cat.toLowerCase()}</strong> (<strong>${formatPercent1(pctRaca)}</strong>), com proporção relevante de registros ignorados na variável zona de residência (<strong>${formatPercent1(pctIgnoradoZona)}</strong>).</span></li>`,
            `<li class="summary-item"><span class="summary-dot dot-red"></span><span>Foram registrados <strong>${formatNumber(obitosAgravo)} óbitos pelo agravo notificado</strong> e ${formatNumber(obitosOutraCausa)} óbitos por outra causa, em um total de ${formatNumber(evolTotal)} casos com evolução informada.</span></li>`
        ];

        list.innerHTML = items.join("");
    }

    function renderSocioKpis(state) {
        const totalEl = document.getElementById("kpi-total");
        if (!totalEl) return;
        const sexoData = COQUELUCHE_DATA.sociodemografico.sexo[state];
        const total = sexoData.Total || sexoData.TOTAL || 0;
        const masculino = sexoData.Masculino || 0;
        const feminino = sexoData.Feminino || 0;
        const ignorado = sexoData.Ignorado || 0;

        totalEl.textContent = formatNumber(total);
        document.getElementById("kpi-masculino").textContent = formatNumber(masculino);
        document.getElementById("kpi-feminino").textContent = formatNumber(feminino);
        document.getElementById("kpi-ignorado").textContent = formatNumber(ignorado);

        document.getElementById("kpi-masculino-pct").textContent = total > 0 ? `(${formatPercent1((masculino / total) * 100)})` : "";
        document.getElementById("kpi-feminino-pct").textContent = total > 0 ? `(${formatPercent1((feminino / total) * 100)})` : "";
        document.getElementById("kpi-ignorado-pct").textContent = total > 0 ? `(${formatPercent1((ignorado / total) * 100)})` : "";
    }

    function renderAllSocioSections(state) {
        renderSocioKpis(state);
        sectionsConfig.forEach(section => renderSocioSection(section, state));
        renderSocioSummary(state);
    }

    // ----------------------------------------------------
    // TEMPORAL TAB LOADING
    // ----------------------------------------------------
    const temporalTableBody = document.getElementById("temporal-table-body");

    function renderTemporalData() {
        if (!temporalTableBody) return;
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
        if (!document.getElementById("chart-temporal-casos")) return;
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
            renderAllSocioSections(stateSelector.value);
        }
        if (document.getElementById("chart-temporal-casos")) {
            renderTemporalCharts();
        }
    }

    // ----------------------------------------------------
    // INITIALIZATION
    // ----------------------------------------------------
    if (stateSelector) {
        stateSelector.addEventListener("change", () => renderAllSocioSections(stateSelector.value));
        renderAllSocioSections(stateSelector.value);
    }

    if (temporalTableBody) {
        renderTemporalData();
    }
});
