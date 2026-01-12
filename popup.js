const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const phaseLabelEl = document.getElementById("phase-label");
const statusMsgEl = document.getElementById("status-msg");

let uiInterval = null;

function updateUI() {
    chrome.storage.local.get(["isRunning", "startTime", "durationMinutes", "isWorkPhase"], (data) => {
        if (data.isRunning && data.startTime && data.durationMinutes) {
            const now = Date.now();
            const elapsedMs = now - data.startTime;
            const remainingMs = Math.max(0, data.durationMinutes * 60 * 1000 - elapsedMs);
            const mins = Math.floor(remainingMs / 60000);
            const secs = Math.floor((remainingMs % 60000) / 1000);

            minutesEl.textContent = String(mins).padStart(2, "0");
            secondsEl.textContent = String(secs).padStart(2, "0");
            phaseLabelEl.textContent = data.isWorkPhase ? "Trabajo" : "Descanso";
            if (data.isWorkPhase) {
                phaseLabelEl.classList.remove("break");
            } else {
                phaseLabelEl.classList.add("break");
            }
            // phaseLabelEl.style.color removed in favor of CSS class

            // Only update text content if strictly needed to avoid layout shift, but here it's fine.
            statusMsgEl.textContent = "En curso...";
        } else {
            minutesEl.textContent = String(data.durationMinutes || 25).padStart(2, "0");
            secondsEl.textContent = "00";
            phaseLabelEl.textContent = data.isWorkPhase ? "Trabajo" : "Descanso";

            if (data.isWorkPhase) {
                phaseLabelEl.classList.remove("break");
            } else {
                phaseLabelEl.classList.add("break");
            }
            // phaseLabelEl.style.color removed
            statusMsgEl.textContent = "Detenido.";
        }

        startBtn.disabled = data.isRunning;
        pauseBtn.disabled = !data.isRunning;
    });
}

startBtn.addEventListener("click", () => {
    chrome.storage.local.get(["isWorkPhase"], (localData) => {
        chrome.storage.sync.get(["workMinutes", "shortBreakMinutes"], (config) => {
            const duration = localData.isWorkPhase ? config.workMinutes : config.shortBreakMinutes;
            const now = Date.now();

            chrome.storage.local.set({
                isRunning: true,
                startTime: now,
                durationMinutes: duration
            });

            chrome.alarms.create("pomodoro", { delayInMinutes: duration });
            updateUI();
        });
    });
});

pauseBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoro");

    chrome.storage.local.get(["startTime", "durationMinutes"], (data) => {
        const now = Date.now();
        const elapsedMs = now - data.startTime;
        const remainingMs = Math.max(0, data.durationMinutes * 60 * 1000 - elapsedMs);
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        chrome.storage.local.set({
            isRunning: false,
            durationMinutes: remainingMinutes,
            startTime: null
        });

        updateUI();
    });
});

resetBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoro");

    chrome.storage.sync.get(["workMinutes"], (config) => {
        chrome.storage.local.set({
            isRunning: false,
            isWorkPhase: true,
            durationMinutes: config.workMinutes,
            startTime: null,
            completedCycles: 0
        });

        updateUI();
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.playSound) {
        const audio = new Audio(chrome.runtime.getURL("sounds/alert.mp3"));
        audio.play();
    }
});

// Actualizar cada segundo
if (uiInterval) clearInterval(uiInterval);
uiInterval = setInterval(updateUI, 1000);

// Render inicial
updateUI();

document.getElementById("stats-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
});

document.getElementById("productive-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ markSession: "productive" });
});

document.getElementById("interrupted-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ markSession: "interrupted" });
});
