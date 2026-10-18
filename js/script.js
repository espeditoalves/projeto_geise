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
            // Table-only card — the bar chart was removed, so every category
            // (including "Não se aplica") is shown in the table
            chartType: "table"
        },
        {
            key: "criterio_diagnostico",
            categories: ["Laboratório", "Clínico", "Clínico-epidemiológico", "Ignorado"],
            chartType: "bars"
        },
        {
            key: "evolucao",
            categories: ["Cura", "Óbito pelo agravo notificado", "Óbito por outra causa", "Ignorado"],
            chartType: "bars"
        }
    ];

    // Icon + color for each row of the bar-list cards (Critério / Evolução)
    const BAR_ICONS = {
        flask: '<path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>',
        stethoscope: '<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        dots: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
        check: '<polyline points="20 6 9 17 4 12"/>',
        cross: '<line x1="12" y1="4" x2="12" y2="20"/><line x1="7" y1="9" x2="17" y2="9"/>',
        question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    };
    const BAR_STYLES = {
        "Laboratório": { icon: "flask", color: "#06b6d4" },
        "Clínico": { icon: "stethoscope", color: "#3b82f6" },
        "Clínico-epidemiológico": { icon: "users", color: "#f59e0b" },
        "Cura": { icon: "check", color: "#10b981" },
        "Óbito pelo agravo notificado": { icon: "cross", color: "#ef4444" },
        "Óbito por outra causa": { icon: "cross", color: "#f59e0b" },
        "Ignorado": { icon: "question", color: "#94a3b8" }
    };

    function renderBarList(section, stateData) {
        const list = document.getElementById(`bars-${section.key}`);
        if (!list) return;
        const total = stateData.Total || section.categories.reduce((sum, cat) => sum + (stateData[cat] || 0), 0);
        list.innerHTML = section.categories.map(cat => {
            const count = stateData[cat] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const style = BAR_STYLES[cat] || BAR_STYLES.Ignorado;
            const icon = section.key === "criterio_diagnostico" && cat === "Ignorado" ? BAR_ICONS.dots : BAR_ICONS[style.icon];
            return `
                <li class="bar-row" style="--bar-color: ${style.color};">
                    <span class="bar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>
                    <span class="bar-label"><strong>${cat}</strong><span>${formatNumber(count)} casos</span></span>
                    <span class="bar-track"><span class="bar-fill" style="width: ${pct.toFixed(2)}%;"></span></span>
                    <span class="bar-pct">${formatPercent(pct)}</span>
                </li>`;
        }).join("");
    }

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
        if (section.chartType === "bars") {
            renderBarList(section, stateData);
            return;
        }

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
        if (!document.getElementById("chart-taxa-observada")) return;
        const taxas = ESTUDO_DATA.taxas;
        const labels = taxas.map(row => row.ano);
        const colors = getThemeColors();

        function rateChart(canvasId, label, values, color) {
            return new Chart(document.getElementById(canvasId).getContext("2d"), {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: values,
                        borderColor: color,
                        backgroundColor: color + "20",
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: color,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: colors.text } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: colors.text },
                            grid: { color: colors.grid }
                        },
                        y: {
                            beginAtZero: true,
                            suggestedMax: 3.5,
                            title: { display: true, text: "por 100.000 hab.", color: colors.text },
                            ticks: { color: colors.text },
                            grid: { color: colors.grid }
                        }
                    }
                }
            });
        }

        if (chartInstanceTempCasos) chartInstanceTempCasos.destroy();
        chartInstanceTempCasos = rateChart("chart-taxa-observada", "Taxa Bruta Observada", taxas.map(r => r.observada), colors.accentOrange);

        if (chartInstanceTempTaxa) chartInstanceTempTaxa.destroy();
        chartInstanceTempTaxa = rateChart("chart-taxa-modelada", "Taxa Bruta Modelada", taxas.map(r => r.modelada), colors.accentBlue);
    }

    // ----------------------------------------------------
    // VISÃO GERAL: MAPA INTERATIVO DOS ESTADOS
    // ----------------------------------------------------
    const brasilMap = document.getElementById("brasil-map");

    function selectState(uf) {
        const state = ESTUDO_DATA.casosUF.find(s => s.uf === uf);
        if (!state) return;
        document.getElementById("state-detail-uf").textContent = state.uf;
        document.getElementById("state-detail-name").textContent = state.nome;
        document.getElementById("state-detail-casos").textContent = formatNumber(state.casos);
        document.getElementById("state-detail-pct").textContent = formatPercent1(state.pct);
        document.getElementById("state-detail-text").textContent =
            `${state.nome} concentrou ${formatNumber(state.casos)} casos de coqueluche no período analisado, representando ${formatPercent1(state.pct)} do total de casos da Região Sudeste.`;
        brasilMap.querySelectorAll(".uf-sudeste").forEach(p => p.classList.toggle("selected", p.dataset.uf === uf));
        document.querySelectorAll(".state-btn").forEach(b => {
            b.classList.toggle("active", b.dataset.uf === uf);
            b.setAttribute("aria-pressed", b.dataset.uf === uf);
        });
    }

    function renderBrasilMap() {
        const ns = "http://www.w3.org/2000/svg";
        const sudeste = new Set(ESTUDO_DATA.casosUF.map(s => s.uf));
        brasilMap.setAttribute("viewBox", `0 0 ${BRASIL_MAP.w} ${BRASIL_MAP.h}`);

        BRASIL_MAP.states.forEach(s => {
            const path = document.createElementNS(ns, "path");
            path.setAttribute("d", s.d);
            path.dataset.uf = s.uf;
            if (sudeste.has(s.uf)) {
                path.classList.add("uf-sudeste", `uf-${s.uf.toLowerCase()}`);
                path.setAttribute("tabindex", "0");
                path.setAttribute("role", "button");
                path.setAttribute("aria-label", s.name);
                const title = document.createElementNS(ns, "title");
                title.textContent = s.name;
                path.appendChild(title);
                path.addEventListener("click", () => selectState(s.uf));
                path.addEventListener("keydown", e => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectState(s.uf); }
                });
            } else {
                path.classList.add("uf-outro");
            }
            brasilMap.appendChild(path);
        });

        // UF labels placed at each Sudeste state's bounding-box center
        ESTUDO_DATA.casosUF.forEach(s => {
            const path = brasilMap.querySelector(`[data-uf="${s.uf}"]`);
            const box = path.getBBox();
            const offsets = { ES: [6, 0], RJ: [4, 6], SP: [0, 4], MG: [0, -4] };
            const [dx, dy] = offsets[s.uf] || [0, 0];
            const label = document.createElementNS(ns, "text");
            label.setAttribute("x", box.x + box.width / 2 + dx);
            label.setAttribute("y", box.y + box.height / 2 + dy);
            label.setAttribute("class", "uf-label");
            label.textContent = s.uf;
            brasilMap.appendChild(label);
        });

        document.getElementById("state-buttons").innerHTML = ESTUDO_DATA.casosUF.map(s => `
            <button class="state-btn" data-uf="${s.uf}" aria-pressed="false">
                <span class="state-uf-badge">${s.uf}</span>
                <span class="state-btn-text">
                    <span>${s.nome}</span>
                    <strong>${formatNumber(s.casos)}</strong>
                    <small>casos (${formatPercent1(s.pct)})</small>
                </span>
            </button>`).join("");
        document.querySelectorAll(".state-btn").forEach(b => b.addEventListener("click", () => selectState(b.dataset.uf)));

        selectState("SP");
    }

    // ----------------------------------------------------
    // COBERTURA VACINAL: PAINEL INTERATIVO
    // ----------------------------------------------------
    const vaccineSteps = document.getElementById("vaccine-steps");

    function formatCoverage(num) {
        return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    }

    function coverageBar(label, value, extraClass) {
        const meta = ESTUDO_DATA.metaVacinal;
        return `
            <div class="coverage-row ${extraClass || ""}">
                <div class="coverage-row-head"><span>${label}</span><strong>${formatCoverage(value)}</strong></div>
                <div class="coverage-track">
                    <span class="coverage-fill" style="width: ${value}%;"></span>
                    <span class="coverage-meta" style="left: ${meta}%;" title="Meta ${meta}%"></span>
                </div>
            </div>`;
    }

    function selectVaccine(key) {
        const vacina = ESTUDO_DATA.vacinas.find(v => v.key === key);
        const cobertura = ESTUDO_DATA.cobertura;
        const states = Object.keys(cobertura).filter(uf => uf !== "Total (Sudeste)");
        const media = cobertura["Total (Sudeste)"][key];
        const meta = ESTUDO_DATA.metaVacinal;

        document.getElementById("vaccine-selected-name").textContent = vacina.nome;
        document.getElementById("coverage-bars").innerHTML = states.map(uf => coverageBar(uf, cobertura[uf][key])).join("");
        document.getElementById("coverage-total").innerHTML =
            coverageBar("Média da Região Sudeste", media, "coverage-row--total") +
            `<div class="coverage-scale"><span>0%</span><span style="left: ${meta}%;">Meta ${meta}%</span><span>100%</span></div>`;

        const lowest = states.reduce((min, uf) => cobertura[uf][key] < cobertura[min][key] ? uf : min, states[0]);
        const gap = media - meta;
        document.getElementById("gap-value").textContent = (gap < 0 ? "−" : "+") + Math.abs(gap).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById("gap-text").innerHTML =
            `<strong>${lowest}</strong> apresenta a menor cobertura neste indicador: <strong>${formatCoverage(cobertura[lowest][key])}</strong>.`;

        vaccineSteps.querySelectorAll(".vaccine-step").forEach(b => {
            const active = b.dataset.key === key;
            b.classList.toggle("active", active);
            b.setAttribute("aria-selected", active);
        });
    }

    function renderVaccinePanel() {
        const media = ESTUDO_DATA.cobertura["Total (Sudeste)"];
        vaccineSteps.innerHTML = ESTUDO_DATA.vacinas.map((v, i) => `
            <button class="vaccine-step" role="tab" aria-selected="false" data-key="${v.key}">
                <span class="vaccine-step-num">${i + 1}</span>
                <span class="vaccine-step-name">${v.nome}</span>
                <strong>${formatCoverage(media[v.key])}</strong>
            </button>`).join("");
        vaccineSteps.querySelectorAll(".vaccine-step").forEach(b => b.addEventListener("click", () => selectVaccine(b.dataset.key)));
        selectVaccine("penta");
    }

    // ----------------------------------------------------
    // ANÁLISE ESPACIAL: ETAPAS E MAPAS
    // ----------------------------------------------------
    const spatialSteps = document.querySelectorAll(".spatial-step");

    const RATE_VIEWS = {
        bruta: {
            src: "img/taxa-bruta.png",
            alt: "Mapa das taxas brutas de incidência de coqueluche por município da Região Sudeste",
            caption: "A: Taxas brutas de incidência por 100.000 habitantes, por município de notificação.",
            finding: "A análise espacial das taxas revelou heterogeneidade entre os municípios da Região Sudeste. As taxas brutas apresentaram ampla variação, com ocorrência de valores bastante elevados em localidades pontuais, com destaque para áreas do centro-leste de Minas Gerais."
        },
        suavizada: {
            src: "img/taxa-suavizada.png",
            alt: "Mapa das taxas suavizadas de coqueluche por município da Região Sudeste",
            caption: "B: Taxas suavizadas pelo método bayesiano empírico local.",
            finding: "A aplicação das taxas suavizadas reduziu essa heterogeneidade, atenuando as flutuações decorrentes de pequenos denominadores populacionais e revelando um padrão regional mais difuso de áreas com taxas intermediárias, distribuídas em porções de Minas Gerais, do litoral e do interior paulista e do Rio de Janeiro."
        }
    };

    function selectRate(rate) {
        const view = RATE_VIEWS[rate];
        const img = document.getElementById("rate-map");
        img.src = view.src;
        img.alt = view.alt;
        document.getElementById("rate-caption").textContent = view.caption;
        document.getElementById("rate-finding").textContent = view.finding;
        document.querySelectorAll("#rate-toggle .segmented-btn").forEach(b => b.classList.toggle("active", b.dataset.rate === rate));
    }

    function selectBivariate(key) {
        const vacina = ESTUDO_DATA.vacinas.find(v => v.key === key);
        const moran = ESTUDO_DATA.moranBivariado[key];
        document.getElementById("bivar-map").src = `img/bivariado-${moran.painel}.png`;
        document.getElementById("bivar-label").textContent = `Índice de Moran Bivariado (${vacina.curto})`;
        document.getElementById("bivar-value").textContent = moran.valor.toLocaleString("pt-BR", { minimumFractionDigits: 3 });
        document.getElementById("bivar-caption").textContent =
            `Figura 4${moran.painel}. Autocorrelação espacial bivariada entre a cobertura vacinal e as taxas de coqueluche na Região Sudeste do Brasil, 2015–2025. ${moran.painel}: ${moran.descricao}. Passe o mouse sobre a legenda para ver a interpretação.`;
        document.querySelectorAll("#bivar-toggle .segmented-btn").forEach(b => b.classList.toggle("active", b.dataset.key === key));
    }

    function initSpatial() {
        spatialSteps.forEach(btn => btn.addEventListener("click", () => {
            spatialSteps.forEach(b => {
                const active = b === btn;
                b.classList.toggle("active", active);
                b.setAttribute("aria-selected", active);
            });
            document.querySelectorAll(".spatial-panel").forEach(p => p.classList.toggle("active", p.id === `step-${btn.dataset.step}`));
        }));

        document.querySelectorAll("#rate-toggle .segmented-btn").forEach(b => b.addEventListener("click", () => selectRate(b.dataset.rate)));

        const toggle = document.getElementById("bivar-toggle");
        toggle.innerHTML = ESTUDO_DATA.vacinas.map(v => `<button class="segmented-btn" data-key="${v.key}">${v.nome}</button>`).join("");
        toggle.querySelectorAll(".segmented-btn").forEach(b => b.addEventListener("click", () => selectBivariate(b.dataset.key)));
        selectBivariate("penta");
    }

    // Helper to update all charts together when theme is toggled
    function updateAllCharts() {
        if (stateSelector) {
            renderAllSocioSections(stateSelector.value);
        }
        if (document.getElementById("chart-taxa-observada")) {
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

    if (brasilMap) renderBrasilMap();
    if (vaccineSteps) renderVaccinePanel();
    if (spatialSteps.length) initSpatial();
});
