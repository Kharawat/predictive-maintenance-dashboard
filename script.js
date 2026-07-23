const SAMPLE_SOURCE_LABEL = "Built-in demo dataset";

const thresholds = {
  temperature: { caution: 68, warning: 76, critical: 86 },
  vibration: { caution: 2.6, warning: 4, critical: 5.5 },
  rpmDeviation: { caution: 0.06, warning: 0.1 },
  runtime: { caution: 3000, warning: 5000 },
};

const riskColors = {
  Normal: "#38bfa3",
  Attention: "#e99b33",
  Critical: "#d85b58",
};

const refs = {
  csvInput: document.querySelector("#csvInput"),
  loadSample: document.querySelector("#loadSample"),
  exportReport: document.querySelector("#exportReport"),
  sourceLabel: document.querySelector("#sourceLabel"),
  recordLabel: document.querySelector("#recordLabel"),
  statusMessage: document.querySelector("#statusMessage"),
  machineSelect: document.querySelector("#machineSelect"),
  trendCanvas: document.querySelector("#trendCanvas"),
  riskCanvas: document.querySelector("#riskCanvas"),
  riskLegend: document.querySelector("#riskLegend"),
  latestReading: document.querySelector("#latestReading"),
  assetRows: document.querySelector("#assetRows"),
  maintenanceList: document.querySelector("#maintenanceList"),
  metricAssets: document.querySelector("#metricAssets"),
  metricNormal: document.querySelector("#metricNormal"),
  metricAttention: document.querySelector("#metricAttention"),
  metricCritical: document.querySelector("#metricCritical"),
};

let readings = createDemoData();
let sourceLabel = SAMPLE_SOURCE_LABEL;
let selectedMachineId = "";

function createDemoData() {
  const profiles = [
    { id: "PUMP-01", temperature: 61, vibration: 1.5, rpm: 1450, runtime: 1240, tempStep: 0.5, vibrationStep: 0.06 },
    { id: "MOTOR-02", temperature: 65, vibration: 2.1, rpm: 1480, runtime: 2910, tempStep: 0.4, vibrationStep: 0.05 },
    { id: "FAN-03", temperature: 73, vibration: 3.3, rpm: 980, runtime: 3610, tempStep: 0.8, vibrationStep: 0.13 },
    { id: "CONVEYOR-01", temperature: 78, vibration: 4.1, rpm: 1200, runtime: 4260, tempStep: 0.7, vibrationStep: 0.16 },
    { id: "CHILLER-01", temperature: 90, vibration: 5.8, rpm: 1740, runtime: 5380, tempStep: 0.55, vibrationStep: 0.18 },
    { id: "COMPRESSOR-02", temperature: 85, vibration: 5.3, rpm: 1530, runtime: 4950, tempStep: 0.85, vibrationStep: 0.2 },
  ];

  const start = new Date("2026-07-15T08:00:00");
  const result = [];

  profiles.forEach((profile, profileIndex) => {
    for (let index = 0; index < 18; index += 1) {
      const timestamp = new Date(start.getTime() + index * 4 * 60 * 60 * 1000);
      const wave = Math.sin(index * 0.85 + profileIndex * 0.5);
      const rise = index * (profileIndex > 3 ? 0.32 : 0.08);
      const vibrationRise = index * (profileIndex > 3 ? 0.045 : 0.01);
      const rpmDrift = profileIndex > 3 ? index * 4 : index * 0.5;

      result.push({
        timestamp,
        machineId: profile.id,
        temperature: round(profile.temperature + rise + wave * profile.tempStep, 1),
        vibration: round(profile.vibration + vibrationRise + wave * profile.vibrationStep, 2),
        rpm: Math.round(profile.rpm - rpmDrift + wave * 8),
        runtimeHours: Math.round(profile.runtime + index * 4),
      });
    }
  });

  return result;
}

function analyzeMachines(data) {
  const groups = new Map();

  data.forEach((reading) => {
    if (!groups.has(reading.machineId)) groups.set(reading.machineId, []);
    groups.get(reading.machineId).push(reading);
  });

  return [...groups.entries()]
    .map(([machineId, values]) => {
      const sorted = [...values].sort((a, b) => a.timestamp - b.timestamp);
      const latest = sorted.at(-1);
      const baselineRpm = median(sorted.map((item) => item.rpm));
      const rpmDeviation = baselineRpm ? Math.abs(latest.rpm - baselineRpm) / baselineRpm : 0;
      const model = calculateHealth(latest, rpmDeviation);

      return {
        machineId,
        readings: sorted,
        latest,
        baselineRpm,
        rpmDeviation,
        ...model,
      };
    })
    .sort((a, b) => a.score - b.score || a.machineId.localeCompare(b.machineId));
}

function calculateHealth(reading, rpmDeviation) {
  let penalty = 0;
  const issues = [];

  if (reading.temperature >= thresholds.temperature.critical) {
    penalty += 42;
    issues.push("high temperature");
  } else if (reading.temperature >= thresholds.temperature.warning) {
    penalty += 25;
    issues.push("elevated temperature");
  } else if (reading.temperature >= thresholds.temperature.caution) {
    penalty += 10;
    issues.push("temperature trend");
  }

  if (reading.vibration >= thresholds.vibration.critical) {
    penalty += 42;
    issues.push("high vibration");
  } else if (reading.vibration >= thresholds.vibration.warning) {
    penalty += 26;
    issues.push("elevated vibration");
  } else if (reading.vibration >= thresholds.vibration.caution) {
    penalty += 10;
    issues.push("vibration trend");
  }

  if (rpmDeviation >= thresholds.rpmDeviation.warning) {
    penalty += 16;
    issues.push("RPM deviation");
  } else if (rpmDeviation >= thresholds.rpmDeviation.caution) {
    penalty += 8;
    issues.push("minor RPM deviation");
  }

  if (reading.runtimeHours >= thresholds.runtime.warning) {
    penalty += 10;
    issues.push("high service age");
  } else if (reading.runtimeHours >= thresholds.runtime.caution) {
    penalty += 5;
    issues.push("service age review");
  }

  const score = Math.max(0, Math.round(100 - penalty));
  const risk = score >= 85 ? "Normal" : score >= 60 ? "Attention" : "Critical";

  return {
    score,
    risk,
    issues,
    recommendation: makeRecommendation(reading, rpmDeviation, risk),
  };
}

function makeRecommendation(reading, rpmDeviation, risk) {
  const actions = [];

  if (reading.vibration >= thresholds.vibration.warning) {
    actions.push("Inspect bearings, mounting, and shaft alignment.");
  }
  if (reading.temperature >= thresholds.temperature.warning) {
    actions.push("Check cooling path, lubrication, and operating load.");
  }
  if (rpmDeviation >= thresholds.rpmDeviation.warning) {
    actions.push("Verify drive control, belt condition, and speed setpoint.");
  }
  if (reading.runtimeHours >= thresholds.runtime.warning) {
    actions.push("Plan a scheduled service inspection.");
  }

  if (actions.length) return actions[0];
  if (risk === "Attention") return "Review the next inspection interval and observe the sensor trend.";
  return "Continue normal monitoring at the current inspection interval.";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function normalizeHeader(value) {
  const cleaned = String(value).toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const aliases = {
    timestamp: "timestamp",
    datetime: "timestamp",
    date: "timestamp",
    machineid: "machineId",
    assetid: "machineId",
    machine: "machineId",
    asset: "machineId",
    temperaturec: "temperature",
    temperature: "temperature",
    temp: "temperature",
    vibrationmms: "vibration",
    vibration: "vibration",
    vibr: "vibration",
    rpm: "rpm",
    runtimehours: "runtimeHours",
    runtime: "runtimeHours",
    hours: "runtimeHours",
  };

  return aliases[cleaned] || cleaned;
}

function normalizeImportedRows(rows) {
  return rows
    .map((item) => {
      const timestamp = new Date(item.timestamp);
      return {
        timestamp,
        machineId: String(item.machineId || "").trim().toUpperCase(),
        temperature: Number(item.temperature),
        vibration: Number(item.vibration),
        rpm: Number(item.rpm),
        runtimeHours: Number(item.runtimeHours),
      };
    })
    .filter(
      (item) =>
        item.machineId &&
        !Number.isNaN(item.timestamp.getTime()) &&
        Number.isFinite(item.temperature) &&
        Number.isFinite(item.vibration) &&
        Number.isFinite(item.rpm) &&
        Number.isFinite(item.runtimeHours),
    );
}

function render() {
  const machines = analyzeMachines(readings);
  const machineIds = machines.map((machine) => machine.machineId);

  if (!machineIds.includes(selectedMachineId)) {
    selectedMachineId = machineIds[0] || "";
  }

  renderDatasetBar();
  renderMetrics(machines);
  renderMachineSelect(machineIds);
  renderAssets(machines);
  renderMaintenance(machines);
  renderRisk(machines);
  renderTrend(machines.find((machine) => machine.machineId === selectedMachineId));
}

function renderDatasetBar() {
  refs.sourceLabel.textContent = sourceLabel;
  refs.recordLabel.textContent = `${readings.length} sensor reading${readings.length === 1 ? "" : "s"}`;
}

function renderMetrics(machines) {
  const risks = countBy(machines, "risk");
  refs.metricAssets.textContent = machines.length;
  refs.metricNormal.textContent = risks.Normal || 0;
  refs.metricAttention.textContent = risks.Attention || 0;
  refs.metricCritical.textContent = risks.Critical || 0;
}

function renderMachineSelect(machineIds) {
  refs.machineSelect.innerHTML = machineIds
    .map((machineId) => `<option value="${escapeHtml(machineId)}">${escapeHtml(machineId)}</option>`)
    .join("");
  refs.machineSelect.value = selectedMachineId;
}

function renderAssets(machines) {
  if (!machines.length) {
    refs.assetRows.innerHTML = '<tr><td colspan="8" class="empty-row">No valid sensor readings found.</td></tr>';
    return;
  }

  refs.assetRows.innerHTML = machines
    .map(
      (machine) => `
        <tr>
          <td>
            <span class="asset-name">${escapeHtml(machine.machineId)}</span>
            <span class="asset-time">${formatDateTime(machine.latest.timestamp)}</span>
          </td>
          <td>
            <div class="score-block">
              <span class="score-number">${machine.score}</span>
              <span class="score-track"><i style="width:${machine.score}%;background:${riskColors[machine.risk]}"></i></span>
            </div>
          </td>
          <td><span class="risk-pill ${machine.risk}">${machine.risk}</span></td>
          <td>${machine.latest.temperature.toFixed(1)} C</td>
          <td>${machine.latest.vibration.toFixed(2)} mm/s</td>
          <td>${machine.latest.rpm.toLocaleString()} rpm</td>
          <td>${machine.latest.runtimeHours.toLocaleString()} h</td>
          <td><button class="inspect-button" type="button" data-machine="${escapeHtml(machine.machineId)}">Inspect</button></td>
        </tr>
      `,
    )
    .join("");
}

function renderMaintenance(machines) {
  const visible = machines.filter((machine) => machine.risk !== "Normal");
  const queue = visible.length ? visible : machines.slice(0, 3);

  refs.maintenanceList.innerHTML = queue
    .map(
      (machine) => `
        <article class="maintenance-item">
          <span class="maintenance-asset">${escapeHtml(machine.machineId)}</span>
          <div class="maintenance-copy">
            <strong>${machine.risk === "Normal" ? "Routine monitoring" : `${machine.risk} condition`}</strong>
            <span>${escapeHtml(machine.recommendation)}</span>
          </div>
          <span class="risk-pill ${machine.risk}">${machine.risk}</span>
        </article>
      `,
    )
    .join("");
}

function renderRisk(machines) {
  const counts = countBy(machines, "risk");
  const entries = ["Normal", "Attention", "Critical"].map((risk) => ({ risk, value: counts[risk] || 0 }));
  const canvas = refs.riskCanvas;
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 178;
  canvas.width = cssSize * ratio;
  canvas.height = cssSize * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssSize, cssSize);

  const center = cssSize / 2;
  const radius = cssSize * 0.42;
  let startAngle = -Math.PI / 2;
  const total = Math.max(machines.length, 1);

  entries.forEach((entry) => {
    const arc = (entry.value / total) * Math.PI * 2;
    context.beginPath();
    context.arc(center, center, radius, startAngle, startAngle + arc);
    context.strokeStyle = riskColors[entry.risk];
    context.lineWidth = cssSize * 0.16;
    context.stroke();
    startAngle += arc;
  });

  context.fillStyle = "#172126";
  context.font = `900 ${Math.round(cssSize * 0.18)}px Inter, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(machines.length), center, center - 8);
  context.fillStyle = "#617076";
  context.font = `700 ${Math.round(cssSize * 0.07)}px Inter, sans-serif`;
  context.fillText("ASSETS", center, center + 17);

  refs.riskLegend.innerHTML = entries
    .map(
      (entry) => `
        <div class="risk-item">
          <span class="risk-swatch" style="background:${riskColors[entry.risk]}"></span>
          <span>${entry.risk}</span>
          <strong>${entry.value}</strong>
        </div>
      `,
    )
    .join("");
}

function renderTrend(machine) {
  const canvas = refs.trendCanvas;
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 760;
  const height = 330;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!machine) {
    refs.latestReading.innerHTML = "";
    return;
  }

  const padding = { top: 24, right: 56, bottom: 44, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const temperatures = machine.readings.map((item) => item.temperature);
  const vibrations = machine.readings.map((item) => item.vibration);
  const tempRange = getRange(temperatures, 8, 4);
  const vibrationRange = getRange(vibrations, 0.8, 0.4);

  context.strokeStyle = "#dfe7e2";
  context.lineWidth = 1;
  context.font = "700 11px Inter, sans-serif";
  context.textBaseline = "middle";

  for (let line = 0; line <= 4; line += 1) {
    const y = padding.top + (chartHeight * line) / 4;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    const tempValue = tempRange.max - ((tempRange.max - tempRange.min) * line) / 4;
    const vibrationValue = vibrationRange.max - ((vibrationRange.max - vibrationRange.min) * line) / 4;
    context.fillStyle = "#2779d7";
    context.textAlign = "right";
    context.fillText(tempValue.toFixed(0), padding.left - 10, y);
    context.fillStyle = "#b96e0d";
    context.textAlign = "left";
    context.fillText(vibrationValue.toFixed(1), width - padding.right + 10, y);
  }

  const pointX = (index) => padding.left + (chartWidth * index) / Math.max(machine.readings.length - 1, 1);
  const pointY = (value, range) => padding.top + ((range.max - value) / (range.max - range.min)) * chartHeight;

  drawLine(context, machine.readings.map((item, index) => [pointX(index), pointY(item.temperature, tempRange)]), "#2779d7");
  drawLine(context, machine.readings.map((item, index) => [pointX(index), pointY(item.vibration, vibrationRange)]), "#e99b33");

  const labelIndices = [0, Math.floor((machine.readings.length - 1) / 2), machine.readings.length - 1];
  context.fillStyle = "#617076";
  context.font = "700 10px Inter, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  labelIndices.forEach((index) => {
    const reading = machine.readings[index];
    if (!reading) return;
    context.fillText(formatShortDate(reading.timestamp), pointX(index), height - 26);
  });

  refs.latestReading.innerHTML = `
    <div class="reading-cell"><span>Selected asset</span><strong>${escapeHtml(machine.machineId)}</strong><small>${formatDateTime(machine.latest.timestamp)}</small></div>
    <div class="reading-cell"><span>Health score</span><strong style="color:${riskColors[machine.risk]}">${machine.score} / 100</strong><small>${machine.risk}</small></div>
    <div class="reading-cell"><span>Latest temperature</span><strong>${machine.latest.temperature.toFixed(1)} C</strong><small>Threshold ${thresholds.temperature.warning} C</small></div>
    <div class="reading-cell"><span>Latest vibration</span><strong>${machine.latest.vibration.toFixed(2)} mm/s</strong><small>Threshold ${thresholds.vibration.warning} mm/s</small></div>
  `;
}

function drawLine(context, points, color) {
  if (!points.length) return;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = 2.4;
  context.stroke();

  const [lastX, lastY] = points.at(-1);
  context.beginPath();
  context.arc(lastX, lastY, 4, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function getRange(values, padding, minimumSpan) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, minimumSpan);
  return { min: min - padding, max: min - padding + span + padding * 2 };
}

function countBy(items, key) {
  return items.reduce((result, item) => {
    result[item[key]] = (result[item[key]] || 0) + 1;
    return result;
  }, {});
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportReport() {
  const machines = analyzeMachines(readings);
  const headers = [
    "Machine ID",
    "Health Score",
    "Risk",
    "Latest Temperature C",
    "Latest Vibration mm/s",
    "Latest RPM",
    "Runtime Hours",
    "Detected Conditions",
    "Recommended Action",
  ];
  const rows = machines.map((machine) => [
    machine.machineId,
    machine.score,
    machine.risk,
    machine.latest.temperature,
    machine.latest.vibration,
    machine.latest.rpm,
    machine.latest.runtimeHours,
    machine.issues.join("; ") || "none",
    machine.recommendation,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "machine-health-maintenance-report.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

refs.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const imported = normalizeImportedRows(parseCsv(await file.text()));
  if (!imported.length) {
    refs.statusMessage.textContent = "No valid rows found. Check the CSV field names and values.";
    event.target.value = "";
    return;
  }

  readings = imported;
  sourceLabel = file.name;
  selectedMachineId = "";
  refs.statusMessage.textContent = "";
  render();
  event.target.value = "";
});

refs.loadSample.addEventListener("click", () => {
  readings = createDemoData();
  sourceLabel = SAMPLE_SOURCE_LABEL;
  selectedMachineId = "";
  refs.statusMessage.textContent = "";
  render();
});

refs.exportReport.addEventListener("click", exportReport);

refs.machineSelect.addEventListener("change", (event) => {
  selectedMachineId = event.target.value;
  renderTrend(analyzeMachines(readings).find((machine) => machine.machineId === selectedMachineId));
});

refs.assetRows.addEventListener("click", (event) => {
  const machineId = event.target.dataset.machine;
  if (!machineId) return;
  selectedMachineId = machineId;
  refs.machineSelect.value = machineId;
  renderTrend(analyzeMachines(readings).find((machine) => machine.machineId === selectedMachineId));
  document.querySelector(".trend-panel").scrollIntoView({ behavior: "smooth", block: "center" });
});

window.addEventListener("resize", () => {
  const machines = analyzeMachines(readings);
  renderRisk(machines);
  renderTrend(machines.find((machine) => machine.machineId === selectedMachineId));
});

render();
