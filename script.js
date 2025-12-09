// Simple in-browser simulation to support the UI.
// This is a conceptual demo, not a real file system.

// --- Elements ---
const diskGrid = document.getElementById("diskGrid");
const diskSizeInput = document.getElementById("diskSizeInput");
const corruptionInput = document.getElementById("corruptionInput");
const strategySelect = document.getElementById("strategySelect");
const crashBtn = document.getElementById("crashBtn");
const recoverBtn = document.getElementById("recoverBtn");
const logOutput = document.getElementById("logOutput");
const indicator = document.getElementById("simStatusIndicator");
const readTimeEl = document.getElementById("readTime");
const writeTimeEl = document.getElementById("writeTime");
const fragEl = document.getElementById("fragmentation");
const startSimulationBtn = document.getElementById("startSimulationBtn");
const viewReportBtn = document.getElementById("viewReportBtn");

let disk = [];
let lastReport = null;
let chart = null; // Chart.js instance (optional)

// --- Disk initialization ---
function initDisk(size) {
    disk = [];
    diskGrid.innerHTML = "";

    for (let i = 0; i < size; i++) {
        const used = Math.random() < 0.5;
        disk.push({ state: used ? "used" : "free" });

        // create DOM block
        const block = document.createElement("div");
        block.className = `disk-block ${used ? "used" : "free"}`;
        block.dataset.index = i;
        diskGrid.appendChild(block);
    }
}

// --- Update DOM grid to reflect disk[] states ---
function updateGrid() {
    const blocks = diskGrid.querySelectorAll(".disk-block");
    blocks.forEach((block, index) => {
        const state = disk[index] ? disk[index].state : "free";
        block.className = `disk-block ${state}`;
    });
}

// --- Logging helper ---
function log(message) {
    const time = new Date().toLocaleTimeString();
    // add newline before each log entry for readability
    logOutput.textContent += `\n[${time}] ${message}`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// --- Status indicator ---
function setStatus(text) {
    if (indicator) indicator.textContent = text;
}

// --- Crash simulation ---
function simulateCrash() {
    const size = parseInt(diskSizeInput.value, 10) || 64;
    const corruptionPercent = parseInt(corruptionInput.value, 10) || 20;

    initDisk(size);

    const blocksToCorrupt = Math.max(1, Math.round((corruptionPercent / 100) * size));
    const usedIndices = disk
        .map((b, idx) => (b.state === "used" ? idx : null))
        .filter(x => x !== null);

    for (let i = 0; i < blocksToCorrupt && usedIndices.length; i++) {
        const pos = Math.floor(Math.random() * usedIndices.length);
        const idx = usedIndices.splice(pos, 1)[0];
        disk[idx].state = "corrupted";
    }

    updateGrid();
    log("Simulated power loss: directory and metadata partially corrupted.");
    log(`Corrupted ${blocksToCorrupt} blocks.`);
    setStatus("Crashed");
}

// --- Metrics analysis ---
function analyzeMetrics() {
    const size = disk.length;
    if (!size) return { read: 0, write: 0, frag: 0 };

    let usedBlocks = 0;
    let freeBlocks = 0;
    let corruptedBlocks = 0;
    let fragments = 0;
    let lastUsed = null;

    for (let i = 0; i < size; i++) {
        const state = disk[i].state;
        if (state === "used" || state === "corrupted" || state === "recovered") {
            usedBlocks++;
            if (lastUsed !== null && i !== lastUsed + 1) {
                fragments++;
            } else if (lastUsed === null) {
                fragments++;
            }
            lastUsed = i;
        } else if (state === "free") {
            freeBlocks++;
        }
        if (state === "corrupted") corruptedBlocks++;
    }

    const fragPercent = usedBlocks ? Math.round((fragments / usedBlocks) * 100) : 0;
    const baseRead = 4;  // ms (conceptual)
    const baseWrite = 5; // ms
    const read = baseRead + fragPercent * 0.05 + corruptedBlocks * 0.1;
    const write = baseWrite + fragPercent * 0.04 + corruptedBlocks * 0.12;

    return {
        read: read.toFixed(2),
        write: write.toFixed(2),
        frag: fragPercent
    };
}

// --- Chart update (optional) ---
// If you want Chart.js bars, include Chart.js via CDN in your HTML.
// If it's not present, this function quietly returns.
function updateChart(metrics) {
    const canvas = document.getElementById("metricsChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    const data = {
        labels: ["Read (ms)", "Write (ms)", "Fragmentation (%)"],
        datasets: [{
            label: "Performance Metrics",
            data: [
                parseFloat(metrics.read),
                parseFloat(metrics.write),
                parseFloat(metrics.frag)
            ],
            backgroundColor: ["#38bdf8", "#4ade80", "#f97373"]
        }]
    };

    if (chart) {
        chart.data = data;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: "bar",
        data,
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#e5e7eb" }
                },
                x: {
                    ticks: { color: "#e5e7eb" }
                }
            }
        }
    });
}

// --- Recovery routine ---
function runRecovery() {
    if (!disk.length) {
        log("No disk loaded. Run a crash simulation first.");
        return;
    }

    const strategy = strategySelect.value;
    setStatus("Recovering...");
    log(`Starting recovery using ${strategy.toUpperCase()} allocation strategy...`);

    let recoveredBlocks = 0;
    let lostBlocks = 0;

    disk.forEach((block, idx) => {
        if (block.state === "corrupted") {
            if (Math.random() < 0.7) {
                block.state = "recovered";
                recoveredBlocks++;
            } else {
                block.state = "free";
                lostBlocks++;
            }
        }
    });

    // Conceptual optimization: reduce fragmentation by grouping free blocks
    // based on selected strategy (visual effect only).
    if (strategy === "best") {
        disk.sort((a, b) => {
            const score = s => (s.state === "free" ? 0 : s.state === "recovered" ? 1 : 2);
            return score(a) - score(b);
        });
    } else if (strategy === "next") {
        disk.reverse();
    }

    updateGrid();

    const metrics = analyzeMetrics();
    readTimeEl.textContent = metrics.read + " ms";
    writeTimeEl.textContent = metrics.write + " ms";
    fragEl.textContent = metrics.frag + " %";

    // Update the graph (if present)
    updateChart(metrics);

    log(`Recovered blocks: ${recoveredBlocks}, unrecoverable: ${lostBlocks}.`);
    log(`Post-recovery metrics -> Avg Read: ${metrics.read} ms, Avg Write: ${metrics.write} ms, Fragmentation: ${metrics.frag}%.`);

    lastReport = {
        time: new Date().toLocaleString(),
        read: metrics.read,
        write: metrics.write,
        frag: metrics.frag,
        recoveredBlocks,
        lostBlocks,
        strategy
    };

    setStatus("Recovered");
}

// --- Quick helper ---
function quickSimulation() {
    initDisk(64);
    simulateCrash();
    runRecovery();
}

// --- Show last report (uses alert if no modal) ---
function showLastReport() {
    if (!lastReport) {
        alert("No report yet. Run a simulation first.");
        return;
    }
    const r = lastReport;
    alert(
        "Last Recovery Report\n\n" +
        `Time: ${r.time}\n` +
        `Strategy: ${r.strategy.toUpperCase()}\n` +
        `Recovered blocks: ${r.recoveredBlocks}\n` +
        `Lost blocks: ${r.lostBlocks}\n` +
        `Avg Read Time: ${r.read} ms\n` +
        `Avg Write Time: ${r.write} ms\n` +
        `Fragmentation: ${r.frag} %`
    );
}

// --- Initial setup ---
initDisk(64);
log("FS-RO initialized. Disk loaded with random used/free blocks.");

crashBtn.addEventListener("click", simulateCrash);
recoverBtn.addEventListener("click", runRecovery);
startSimulationBtn.addEventListener("click", quickSimulation);
viewReportBtn.addEventListener("click", showLastReport);
