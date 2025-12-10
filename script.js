// Simple in-browser simulation to support the UI.

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
let chart = null;

// =======================================================
function initDisk(size) {
    disk = [];
    diskGrid.innerHTML = "";
    for (let i = 0; i < size; i++) {
        const used = Math.random() < 0.5;
        disk.push({ state: used ? "used" : "free" });
        const block = document.createElement("div");
        block.className = `disk-block ${used ? "used" : "free"}`;
        block.dataset.index = i;
        diskGrid.appendChild(block);
    }
}

function updateGrid() {
    const blocks = diskGrid.querySelectorAll(".disk-block");
    blocks.forEach((block, index) => {
        block.className = `disk-block ${disk[index].state}`;
    });
}

function log(message) {
    const time = new Date().toLocaleTimeString();
    logOutput.textContent += `\n[${time}] ${message}`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

function setStatus(text) {
    indicator.textContent = text;
}

// =======================================================
function simulateCrash() {
    const size = parseInt(diskSizeInput.value) || 64;
    const corruptionPercent = parseInt(corruptionInput.value) || 20;

    initDisk(size);

    const blocksToCorrupt = Math.round((corruptionPercent / 100) * size);
    const usedIndices = disk.map((b, i) => b.state === "used" ? i : null).filter(x => x !== null);

    for (let i = 0; i < blocksToCorrupt && usedIndices.length; i++) {
        const pos = Math.floor(Math.random() * usedIndices.length);
        const idx = usedIndices.splice(pos, 1)[0];
        disk[idx].state = "corrupted";
    }

    updateGrid();
    log(`Simulated crash → ${blocksToCorrupt} blocks corrupted.`);
    setStatus("Crashed");

    document.getElementById("unrecoveredList").innerHTML = "<h4>No unrecovered files</h4>";
}

// =======================================================
function analyzeMetrics() {
    let used = 0, corrupted = 0, fragments = 0, lastUsed = null;

    for (let i = 0; i < disk.length; i++) {
        const state = disk[i].state;

        if (["used", "corrupted", "recovered"].includes(state)) {
            used++;
            if (lastUsed !== null && i !== lastUsed + 1) fragments++;
            else if (lastUsed === null) fragments++;
            lastUsed = i;
        }

        if (state === "corrupted") corrupted++;
    }

    const fragPercent = used ? Math.round((fragments / used) * 100) : 0;

    return {
        read: (4 + fragPercent * 0.05 + corrupted * 0.1).toFixed(2),
        write: (5 + fragPercent * 0.04 + corrupted * 0.12).toFixed(2),
        frag: fragPercent
    };
}

// =======================================================
function updateChart(metrics) {
    const canvas = document.getElementById("metricsChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    const data = {
        labels: ["Read", "Write", "Fragmentation"],
        datasets: [{
            data: [metrics.read, metrics.write, metrics.frag],
            backgroundColor: ["#38bdf8", "#4ade80", "#f87171"]
        }]
    };

    if (chart) {
        chart.data = data;
        chart.update();
    } else {
        chart = new Chart(ctx, { type: "bar", data });
    }
}

// =======================================================
function runRecovery() {
    if (!disk.length) return;

    const strategy = strategySelect.value;
    log(`Starting recovery (${strategy.toUpperCase()})...`);
    setStatus("Recovering...");

    let recovered = 0, lost = 0;

    disk.forEach((block, i) => {
        if (block.state === "corrupted") {
            if (Math.random() < 0.7) {
                block.state = "recovered";
                recovered++;
            } else {
                block.state = "free";
                lost++;
            }
        }
    });

    if (strategy === "best") {
        disk.sort((a, b) => a.state.localeCompare(b.state));
    } else if (strategy === "next") {
        disk.reverse();
    }

    updateGrid();

    // ============================================================
    // ★ ADDING UNRECOVERED FILE LIST (SCROLLABLE)
    // ============================================================
    const lostBox = document.getElementById("unrecoveredList");
    let fileHTML = "<h4>Unrecovered Files</h4>";

    function makeFilename(i) {
        const names = ["file", "data", "image", "report", "video"];
        const ext = ["txt", "dat", "bin", "cfg", "jpg"];
        return `${names[i % names.length]}_${i}.${ext[i % ext.length]}`;
    }

    let lostFiles = [];

    disk.forEach((block, index) => {
        if (block.state === "free") {
            lostFiles.push({
                name: makeFilename(index),
                block: index,
                reason: "Corruption exceeded recovery threshold"
            });
        }
    });

    if (lostFiles.length === 0) {
        lostBox.innerHTML = "<h4>No unrecovered files 🎉</h4>";
    } else {
        lostFiles.forEach(f => {
            fileHTML += `<div class="unrecovered-item">
                            <strong>${f.name}</strong> (Block ${f.block}) — ${f.reason}
                          </div>`;
        });
        lostBox.innerHTML = fileHTML;
    }

    // ============================================================

    const metrics = analyzeMetrics();
    readTimeEl.textContent = metrics.read + " ms";
    writeTimeEl.textContent = metrics.write + " ms";
    fragEl.textContent = metrics.frag + " %";

    updateChart(metrics);
    setStatus("Recovered");

    log(`Recovery completed: ${recovered} recovered, ${lost} lost.`);
}

// =======================================================
function quickSimulation() {
    simulateCrash();
    runRecovery();
}

// =======================================================
initDisk(64);
log("FS-RO initialized. Ready.");

crashBtn.onclick = simulateCrash;
recoverBtn.onclick = runRecovery;
startSimulationBtn.onclick = quickSimulation;
viewReportBtn.onclick = () => alert("Report coming soon!");
