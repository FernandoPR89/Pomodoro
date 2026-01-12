document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const canvas = document.getElementById("statsChart");
    const ctx = canvas.getContext("2d");
    const exportBtn = document.getElementById("exportCsvBtn");
    const clearBtn = document.getElementById("clearStatsBtn");
    const yearSelect = document.getElementById("yearSelect");

    // Labels for Heatmap
    const monthsContainer = document.getElementById("heatmap-months");
    const heatmapContainer = document.getElementById("heatmap");

    // Utilities
    function getTodayKey() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    function parseDateKey(key) {
        const [Y, M, D] = key.split("-").map(Number);
        return new Date(Y, M - 1, D);
    }

    function formatDateLabel(key) {
        const d = parseDateKey(key);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}/${month}`;
    }

    function sortByDate(keys) {
        return keys.sort((a, b) => parseDateKey(a) - parseDateKey(b));
    }

    function lastNDays(keys, n) {
        const sorted = sortByDate(keys);
        return sorted.slice(Math.max(0, sorted.length - n));
    }

    function getWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.floor(((date - yearStart) / 86400000 + 1) / 7);
    }

    // Charting
    function drawChart(stats, yearFilter) {
        // Filter keys by year if provided
        let keys = Object.keys(stats || {});
        if (yearFilter) {
            keys = keys.filter(k => parseInt(k.split("-")[0]) === yearFilter);
        }

        if (keys.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#6b7280";
            ctx.font = "14px system-ui";
            ctx.fillText("Sin datos para este año.", 20, 30);
            return;
        }

        const sortedKeys = sortByDate(keys);
        const values = sortedKeys.map(k => stats[k] || 0);

        // Dimensions and style
        const padding = { top: 40, right: 20, bottom: 70, left: 60 };
        const chartW = canvas.width - padding.left - padding.right;
        const chartH = canvas.height - padding.top - padding.bottom;

        const maxVal = Math.max(...values, 1);
        const yTicks = 5;
        const yStep = Math.ceil(maxVal / yTicks);
        const yMax = yStep * yTicks || 5;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = "#ffffff";
        // Or transparent if preferred, but white ensures contrast
        // ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = "#111827";
        ctx.font = "bold 14px system-ui";
        ctx.fillText(`Ciclos en ${yearFilter || 'Total'}`, padding.left, padding.top - 20);

        // Axes
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;

        // Y axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.stroke();

        // X axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.stroke();

        // Grid + Y labels
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px system-ui";
        ctx.textAlign = "right";
        for (let i = 0; i <= yTicks; i++) {
            const val = i * yStep;
            const y = padding.top + chartH - (val / yMax) * chartH;

            // Grid line
            ctx.strokeStyle = "#f3f4f6";
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();

            // Label
            ctx.fillText(String(val), padding.left - 10, y + 4);
        }
        ctx.textAlign = "left";

        // Bars
        const barCount = sortedKeys.length;
        // Adjust bar width dynamically
        const maxBarWidth = 40;
        const minBarGap = 2;

        // Calculate available space per bar
        let barSpace = chartW / barCount;
        let barWidth = Math.min(maxBarWidth, barSpace - minBarGap);
        let barGap = barSpace - barWidth;

        // If bars are too thin, we might need to skip labels or scroll (canvas scrolling is hard, just fit for now)
        if (barWidth < 2) barWidth = 2;

        for (let i = 0; i < barCount; i++) {
            const x = padding.left + i * barSpace + barGap / 2;
            const val = values[i];
            const barH = (val / yMax) * chartH;
            const y = padding.top + chartH - barH;

            // Bar
            ctx.fillStyle = "#10b981";
            ctx.fillRect(x, y, barWidth, barH);

            // Value label on top (only if enough space)
            if (val > 0 && barWidth > 15) {
                ctx.fillStyle = "#111827";
                ctx.font = "10px system-ui";
                const text = String(val);
                const textW = ctx.measureText(text).width;
                ctx.fillText(text, x + barWidth / 2 - textW / 2, y - 5);
            }

            // Date label (rotated) - optimize to not crowd
            // Show every Nth label if too many
            const step = Math.ceil(barCount / 20);
            if (i % step === 0) {
                ctx.fillStyle = "#374151";
                const label = formatDateLabel(sortedKeys[i]);
                ctx.save();
                ctx.translate(x + barWidth / 2, padding.top + chartH + 15);
                ctx.rotate(-Math.PI / 4);
                ctx.font = "10px system-ui";
                ctx.fillText(label, 0, 0);
                ctx.restore();
            }
        }
    }

    function renderHeatmap(stats, year) {
        if (!year) year = new Date().getFullYear();

        monthsContainer.innerHTML = "";
        heatmapContainer.innerHTML = "";

        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        const max = Math.max(...Object.values(stats), 1);
        const colorScale = ["#e5e7eb", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"];

        function getColor(val) {
            if (!val || val <= 0) return colorScale[0];
            const idx = Math.min(colorScale.length - 1, Math.floor((val / max) * (colorScale.length - 1)));
            // Ensure even defined 1 gets a color
            if (val > 0 && idx === 0) return colorScale[1];
            return colorScale[idx];
        }

        const weeks = Array.from({ length: 54 }, () => Array(7).fill(null));

        days.forEach((date) => {
            const day = date.getDay(); // 0 = Sunday
            const week = getWeekNumber(date);
            const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
            const val = stats[key] || 0;

            const cell = document.createElement("div");
            cell.className = "heat-cell";
            cell.style.background = getColor(val);
            cell.title = `${date.toLocaleDateString()}: ${val} ciclo(s)`;

            // Adjust for Sunday start? The code used Monday start logic previously but Sunday labels.
            // Let's stick to standard JS GetDay (0=Sun)
            if (weeks[week]) weeks[week][day] = cell;
        });

        // Filter empty weeks at the end if necessary, but 54 covers all years

        weeks.forEach((week) => {
            // Only append if the week has days (sometimes week 53/54 are empty)
            if (week.some(d => d !== null)) {
                week.forEach((cell) => {
                    heatmapContainer.appendChild(cell || document.createElement("div"));
                });
            }
        });

        // Month labels
        const seen = new Set();
        days.forEach((d) => {
            const week = getWeekNumber(d);
            const month = d.toLocaleString("es-MX", { month: "short" });
            if (!seen.has(month)) {
                seen.add(month);
                const label = document.createElement("span");
                label.textContent = month;
                // Rough positioning based on week index
                label.style.gridColumn = `${week + 1}`;
                monthsContainer.appendChild(label);
            }
        });
    }

    function updateSummaries(stats) {
        const keys = Object.keys(stats || {});
        const values = keys.map(k => stats[k] || 0);
        const total = values.reduce((a, b) => a + b, 0);

        const todayKey = getTodayKey();
        const today = stats[todayKey] || 0;

        // Last 7 days
        const sortedKeys = sortByDate(keys);
        const last7Keys = lastNDays(sortedKeys, 7);
        // We need to actually check dates within last 7 days from NOW, not just last 7 entries
        // But for simplicity based on previous code:
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const last7Total = keys
            .filter(k => parseDateKey(k) >= lastWeekStart)
            .reduce((sum, k) => sum + (stats[k] || 0), 0);

        document.getElementById("summaryTotal").textContent = total;
        document.getElementById("summaryToday").textContent = today;
        document.getElementById("summaryLast7").textContent = last7Total;
    }

    function refresh(year) {
        chrome.storage.sync.get(["stats"], (data) => {
            const stats = data.stats || {};
            if (!year) year = new Date().getFullYear();

            drawChart(stats, year);
            renderHeatmap(stats, year);
            updateSummaries(stats);

            // Update year selector if empty
            if (yearSelect.options.length === 0) {
                const years = [...new Set(Object.keys(stats).map(k => k.split("-")[0]))];
                const currentYear = new Date().getFullYear();
                if (!years.includes(String(currentYear))) years.push(String(currentYear));
                years.sort();

                years.forEach(y => {
                    const opt = document.createElement("option");
                    opt.value = y;
                    opt.textContent = y;
                    if (parseInt(y) === currentYear) opt.selected = true;
                    yearSelect.appendChild(opt);
                });
            }
        });
    }

    function exportCSV() {
        chrome.storage.local.get(["stats"], (data) => {
            const stats = data.stats || {};
            const rows = [["Fecha", "Ciclos"]];

            sortByDate(Object.keys(stats)).forEach((k) => {
                rows.push([k, String(stats[k] || 0)]);
            });

            const csvContent = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "pomodoro_stats.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function clearStats() {
        if (!confirm("¿Seguro que quieres borrar todas las estadísticas?")) return;
        chrome.storage.local.set({ stats: {} }, () => refresh(parseInt(yearSelect.value)));
    }

    // Event Listeners
    exportBtn.addEventListener("click", exportCSV);
    clearBtn.addEventListener("click", clearStats);

    yearSelect.addEventListener("change", () => {
        refresh(parseInt(yearSelect.value));
    });

    // Initial Load
    refresh();
});