chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cycles: 4
    });
    chrome.storage.local.set({
        isRunning: false,
        isWorkPhase: true,
        durationMinutes: 25,
        startTime: null,
        completedCycles: 0
    });
});

function getTodayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`; // "2026-01-12"
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.markSession) {
        const todayKey = getTodayKey();
        chrome.storage.sync.get(["stats", "sessions"], (data) => {
            const stats = data.stats || {};
            const sessions = data.sessions || {};
            stats[todayKey] = (stats[todayKey] || 0) + 1;
            if (!sessions[todayKey]) sessions[todayKey] = [];
            sessions[todayKey].push(msg.markSession);
            chrome.storage.sync.set({ stats, sessions });
        });
    }
});

// Alarma para verificar metas
function checkGoals() {
    const todayKey = getTodayKey();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // domingo inicio

    chrome.storage.sync.get(["stats"], (data) => {
        const stats = data.stats || {};
        chrome.storage.sync.get(["dailyGoal", "weeklyGoal"], (config) => {
            const todayCycles = stats[todayKey] || 0;
            const weekCycles = Object.keys(stats)
                .filter(k => new Date(k) >= weekStart)
                .reduce((sum, k) => sum + stats[k], 0);

            if (todayCycles < config.dailyGoal) {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: chrome.runtime.getURL("icons/icon.png"),
                    title: "Meta diaria no cumplida",
                    message: `Hoy llevas ${todayCycles}/${config.dailyGoal} ciclos.`
                });
            }
            if (weekCycles < config.weeklyGoal) {
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: chrome.runtime.getURL("icons/icon.png"),
                    title: "Meta semanal no cumplida",
                    message: `Esta semana llevas ${weekCycles}/${config.weeklyGoal} ciclos.`
                });
            }
        });
    });
}

// Revisar metas cada hora
chrome.alarms.create("checkGoals", { periodInMinutes: 60 });
// Alarma centralizada
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkGoals") {
        checkGoals();
    } else if (alarm.name === "pomodoro") {
        handlePomodoroAlarm();
    }
});

function handlePomodoroAlarm() {
    chrome.storage.local.get(["isWorkPhase", "completedCycles"], (localData) => {
        chrome.storage.sync.get(["workMinutes", "shortBreakMinutes", "longBreakMinutes", "cycles"], (config) => {
            let nextPhase, nextMinutes;
            let cyclesDone = localData.completedCycles || 0;

            if (localData.isWorkPhase) {
                cyclesDone++;

                const todayKey = getTodayKey();
                chrome.storage.local.get(["stats"], (data) => {
                    const stats = data.stats || {};
                    stats[todayKey] = (stats[todayKey] || 0) + 1;
                    chrome.storage.local.set({ stats });
                });


                nextPhase = false;
                nextMinutes = (cyclesDone % config.cycles === 0)
                    ? config.longBreakMinutes
                    : config.shortBreakMinutes;
            } else {
                nextPhase = true;
                nextMinutes = config.workMinutes;
            }

            chrome.storage.local.set({
                isRunning: false,
                isWorkPhase: nextPhase,
                durationMinutes: nextMinutes,
                startTime: null,
                completedCycles: cyclesDone
            });

            chrome.notifications.create({
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/icon.png"),
                title: nextPhase ? "¡Descanso terminado!" : "¡Trabajo terminado!",
                message: nextPhase ? "Volvemos al enfoque." : "Tómate un descanso."
            });

            try {
                chrome.runtime.sendMessage({ playSound: true });
            } catch (e) {
                console.warn("No hay popup abierto para reproducir sonido");
            }
        });
    });
}