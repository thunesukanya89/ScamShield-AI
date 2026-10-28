const form = document.getElementById("analysisForm");
const userInput = document.getElementById("userInput");
const analyzeButton = document.getElementById("analyzeButton");
const buttonText = document.getElementById("buttonText");
const result = document.getElementById("result");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");
const charCount = document.getElementById("charCount");

const STORAGE_KEY = "scamShieldHistory";

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getHistory() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return saved
            .filter(item => item && item.message)
            .map(item => ({
                message: item.message,
                risk: ["HIGH", "MEDIUM", "LOW"].includes(
                    String(item.risk || item.level || "").toUpperCase()
                )
                    ? String(item.risk || item.level).toUpperCase()
                    : "MEDIUM",
                time: item.time || item.date || ""
            }));
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, 10))
    );
}

function renderHistory() {
    const history = getHistory();

    if (!history.length) {
        historyList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🛡️</span>
                <h3>No scans yet</h3>
                <p>Analyze your first message to see it here.</p>
            </div>`;
        return;
    }

    historyList.innerHTML = history.map(item => `
        <article class="history-item">
            <div class="history-top">
                <span class="risk risk-${item.risk}">
                    ${item.risk} RISK
                </span>
                <span class="history-time">
                    ${escapeHTML(item.time)}
                </span>
            </div>
            <p class="history-message">
                ${escapeHTML(item.message)}
            </p>
        </article>
    `).join("");
}

function showResult(answer, risk) {
    result.classList.remove("hidden");
    result.innerHTML = `
        <h3>💜 Analysis Result</h3>
        <span class="risk risk-${risk}">${risk} RISK</span>
        <div class="result-body">${escapeHTML(answer)}</div>
    `;
}

userInput.addEventListener("input", () => {
    charCount.textContent = `${userInput.value.length} characters`;
});

form.addEventListener("submit", async event => {
    event.preventDefault();

    const message = userInput.value.trim();

    if (!message) {
        userInput.focus();
        return;
    }

    analyzeButton.disabled = true;
    buttonText.textContent = "Analyzing...";

    result.classList.remove("hidden");
    result.innerHTML = `
        <h3>✨ Checking your message...</h3>
        <p class="muted">Your AI assistant is looking for warning signs.</p>
    `;

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Analysis failed.");
        }

        const answer = data.response;

        if (!answer) {
            throw new Error("The AI returned an empty response.");
        }

        const risk = ["HIGH", "MEDIUM", "LOW"].includes(
            String(data.risk).toUpperCase()
        )
            ? String(data.risk).toUpperCase()
            : "MEDIUM";

        showResult(answer, risk);

        const history = getHistory();

        history.unshift({
            message,
            risk,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        });

        saveHistory(history);
        renderHistory();

    } catch (error) {
        result.classList.remove("hidden");
        result.innerHTML = `
            <h3>Oops! Something went wrong 💜</h3>
            <p class="error-text">${escapeHTML(error.message)}</p>
        `;
    } finally {
        analyzeButton.disabled = false;
        buttonText.textContent = "🔍 Analyze Message";
    }
});

clearHistoryButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
});

renderHistory();
