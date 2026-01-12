document.addEventListener("DOMContentLoaded", () => {
    // Timer inputs
    const workInput = document.getElementById("work");
    const shortBreakInput = document.getElementById("shortBreak");
    const longBreakInput = document.getElementById("longBreak");
    const cyclesInput = document.getElementById("cycles");

    // Goal inputs
    const dailyGoalInput = document.getElementById("dailyGoal");
    const weeklyGoalInput = document.getElementById("weeklyGoal");

    // Preferences
    const soundCheckbox = document.getElementById("soundEnabled");

    // Actions
    const saveBtn = document.getElementById("save");
    const statusEl = document.getElementById("status");

    // Cargar valores guardados
    chrome.storage.sync.get(
        [
            "workMinutes",
            "shortBreakMinutes",
            "longBreakMinutes",
            "cycles",
            "soundEnabled",
            "dailyGoal",
            "weeklyGoal"
        ],
        (data) => {
            // Timer defaults
            workInput.value = data.workMinutes || 25;
            shortBreakInput.value = data.shortBreakMinutes || 5;
            longBreakInput.value = data.longBreakMinutes || 15;
            cyclesInput.value = data.cycles || 4;

            // Goal defaults
            dailyGoalInput.value = data.dailyGoal || 4;
            weeklyGoalInput.value = data.weeklyGoal || 20;

            // Checkbox default true if undefined
            soundCheckbox.checked = data.soundEnabled !== false;
        }
    );

    saveBtn.addEventListener("click", () => {
        const settings = {
            workMinutes: parseInt(workInput.value, 10),
            shortBreakMinutes: parseInt(shortBreakInput.value, 10),
            longBreakMinutes: parseInt(longBreakInput.value, 10),
            cycles: parseInt(cyclesInput.value, 10),
            dailyGoal: parseInt(dailyGoalInput.value, 10),
            weeklyGoal: parseInt(weeklyGoalInput.value, 10),
            soundEnabled: soundCheckbox.checked
        };

        chrome.storage.sync.set(settings, () => {
            statusEl.textContent = "Opciones guardadas ✅";
            statusEl.classList.add("show");

            setTimeout(() => {
                statusEl.textContent = "";
                statusEl.classList.remove("show");
            }, 2000);
        });
    });
});
