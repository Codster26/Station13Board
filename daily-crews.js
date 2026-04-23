const DAILY_CREWS_STORAGE_KEY = "station13-daily-crews";
const DAILY_CREWS_WEEKLY_STORAGE_KEY = "station13-weekly-calendar";
const dailyCrewsSlotCount = 15;

const dailyCrewStatusOptions = [
  "Not Staffed",
  "Staffed Engine Only",
  "Staffed 1 Crew",
  "Staffed 1 Crew w/ Tower",
  "Staffed 2 Crews",
  "Staffed 2 Crews w/ Tower",
  "Staffed 3 Crews",
  "Live Burn",
  "Cover"
];

const dailyCrewStatusColors = {
  "Not Staffed": "#b10202",
  "Staffed Engine Only": "#ffcfc9",
  "Staffed 1 Crew": "#c6dbe1",
  "Staffed 1 Crew w/ Tower": "#11734b",
  "Staffed 2 Crews w/ Tower": "#11734b",
  "Staffed 3 Crews": "#11734b",
  "Staffed 2 Crews": "#bfe1f6",
  "Live Burn": "#753800",
  "Cover": "#0a53a8"
};

const dailyCrewShifts = [
  { id: "a", label: "A Shift", rangeLabel: "0000 - 0600", hours: ["0000", "0100", "0200", "0300", "0400", "0500"] },
  { id: "b", label: "B Shift", rangeLabel: "0600 - 1200", hours: ["0600", "0700", "0800", "0900", "1000", "1100"] },
  { id: "c", label: "C Shift", rangeLabel: "1200 - 1800", hours: ["1200", "1300", "1400", "1500", "1600", "1700"] },
  { id: "d", label: "D Shift", rangeLabel: "1800 - 0000", hours: ["1800", "1900", "2000", "2100", "2200", "2300"] }
];

const dailyCrewApparatus = [
  {
    id: "engine",
    title: "Engine 13",
    modifier: "daily-crews-unit--engine",
    positions: [
      { id: "driver", label: "Driver", pool: "engineDriver" },
      { id: "officer", label: "Officer", pool: "officer" },
      { id: "nozzle", label: "Nozzle", pool: "nozzleBackupSupport" },
      { id: "layout", label: "Layout", pool: "activeMembers" },
      { id: "backup", label: "Backup", pool: "nozzleBackupSupport" },
      { id: "support", label: "Support", pool: "nozzleBackupSupport" }
    ]
  },
  {
    id: "tower",
    title: "Tower 13",
    modifier: "daily-crews-unit--tower",
    positions: [
      { id: "driver", label: "Driver", pool: "towerDriver" },
      { id: "officer", label: "Officer", pool: "officer" },
      { id: "bar", label: "Bar", pool: "barOvmCanRoof" },
      { id: "ovm", label: "OVM", pool: "barOvmCanRoof" },
      { id: "can", label: "Can", pool: "barOvmCanRoof" },
      { id: "roof", label: "Roof", pool: "barOvmCanRoof" }
    ]
  },
  {
    id: "rescue",
    title: "Rescue 13",
    modifier: "daily-crews-unit--rescue",
    positions: [
      { id: "driver", label: "Driver", pool: "rescueDriver" },
      { id: "officer", label: "Officer", pool: "officer" },
      { id: "bar", label: "Bar", pool: "barOvmCanRoof" },
      { id: "ovm", label: "OVM", pool: "barOvmCanRoof" },
      { id: "can", label: "Can", pool: "barOvmCanRoof" },
      { id: "roof", label: "Roof", pool: "barOvmCanRoof" }
    ]
  }
];

function loadDailyCrewsData() {
  try {
    const raw = localStorage.getItem(DAILY_CREWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveDailyCrewsData(data) {
  localStorage.setItem(DAILY_CREWS_STORAGE_KEY, JSON.stringify(data));
}

function loadDailyCrewsShiftAssignments() {
  try {
    const raw = localStorage.getItem(DAILY_CREWS_WEEKLY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveDailyCrewsShiftAssignments(data) {
  localStorage.setItem(DAILY_CREWS_WEEKLY_STORAGE_KEY, JSON.stringify(data));
}

function getDailyCrewsTodayKey() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyCrewsDateKey(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDailyCrewsDate(dateKey) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getDailyCrewPool(boardData, poolKey) {
  if (poolKey === "activeMembers") {
    return boardData.activeMembers || [];
  }
  return boardData.rolePools?.[poolKey] || [];
}

function getDailyCrewColorMap(boardData, poolKey) {
  if (poolKey === "activeMembers") {
    return boardData.colorRules?.activeMembers || {};
  }
  return boardData.colorRules?.[poolKey] || {};
}

function applyDailyCrewFill(select, colorMap) {
  const fillColor = colorMap[select.value];
  const textColor = fillColor ? getReadableTextColor(fillColor) : "";
  select.style.backgroundColor = fillColor || "";
  select.style.color = textColor || "";
}

function applyDailyCrewsStatusColor(select) {
  if (select.dataset.kind !== "crew") {
    return;
  }
  const color = dailyCrewStatusColors[select.value] || "#11734b";
  const cell = select.closest(".daily-crews-summary-crew");
  if (cell) {
    cell.style.background = color;
  }
  select.style.color = "#ffffff";
}

function createDailyCrewsMirrorValue(kind, rawValue, colorMap = {}) {
  const value = rawValue || (kind === "crew" ? "Not Staffed" : "");
  const node = document.createElement("div");
  node.className = "daily-crews-readonly";
  node.textContent = value;

  if (kind === "crew") {
    node.classList.add("daily-crews-readonly--crew");
    node.style.background = dailyCrewStatusColors[value] || "#b10202";
    node.style.color = "#ffffff";
  } else if (kind === "command") {
    node.classList.add("daily-crews-readonly--command");
    const fillColor = colorMap[value];
    if (fillColor) {
      node.style.backgroundColor = fillColor;
      node.style.color = getReadableTextColor(fillColor);
    }
  } else if (kind === "name") {
    const fillColor = colorMap[value];
    if (fillColor) {
      node.style.backgroundColor = fillColor;
      node.style.color = getReadableTextColor(fillColor);
    }
  }

  return node;
}

function buildDailyCrewCell(boardData, savedData, shiftId, hour, apparatus, position) {
  const row = document.createElement("div");
  row.className = "daily-crews-row";

  const label = document.createElement("span");
  label.className = "daily-crews-role";
  label.textContent = position.label;
  row.appendChild(label);

  const key = `${shiftId}-${hour}-${apparatus.id}-${position.id}`;
  const pool = uniqueNames(getDailyCrewPool(boardData, position.pool));
  const colorMap = getDailyCrewColorMap(boardData, position.pool);
  const selectedValue = pool.includes(savedData[key]) ? savedData[key] : "";
  const field = createSearchCombobox({
    className: "daily-crews-select",
    options: pool,
    value: selectedValue,
    ariaLabel: key,
    onCommit: (value, input) => {
      if (value) {
        savedData[key] = value;
      } else {
        delete savedData[key];
      }
      saveDailyCrewsData(savedData);
      applyDailyCrewFill(input, colorMap);
    }
  });

  applyDailyCrewFill(field.input, colorMap);
  row.appendChild(field.root);
  return row;
}

function buildDailyCrewUnit(boardData, savedData, shiftId, hour, apparatus) {
  const unit = document.createElement("article");
  unit.className = `daily-crews-unit ${apparatus.modifier}`;

  const header = document.createElement("div");
  header.className = "daily-crews-unit-header";
  header.textContent = apparatus.title;
  unit.appendChild(header);

  const body = document.createElement("div");
  body.className = "daily-crews-unit-body";
  apparatus.positions.forEach((position) => {
    body.appendChild(buildDailyCrewCell(boardData, savedData, shiftId, hour, apparatus, position));
  });
  unit.appendChild(body);

  return unit;
}

function buildDailyCrewHour(boardData, savedData, shiftId, hour) {
  const column = document.createElement("section");
  column.className = "daily-crews-hour";

  const time = document.createElement("div");
  time.className = "daily-crews-time";
  time.textContent = hour;
  column.appendChild(time);

  dailyCrewApparatus.forEach((apparatus) => {
    column.appendChild(buildDailyCrewUnit(boardData, savedData, shiftId, hour, apparatus));
  });

  return column;
}

function buildDailyCrewsShiftMirrorPanel(boardData, shift, assignments, dateKey, dayLabel) {
  const shell = document.createElement("div");
  shell.className = "daily-crews-summary-shell";

  const title = document.createElement("div");
  title.className = "daily-crews-summary-title";
  title.textContent = `${dayLabel} | ${formatDailyCrewsDate(dateKey)} | ${shift.id.toUpperCase()} - Shift ${shift.rangeLabel}`;
  shell.appendChild(title);

  const table = document.createElement("table");
  table.className = "daily-crews-summary-table";
  shell.appendChild(table);

  const activeMembers = boardData.activeMembers || [];
  const command13Members = boardData.command13Members || [];
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const command13Colors = boardData.colorRules?.command13 || {};

  const headerRow = document.createElement("tr");
  ["Member", "In", "Member", "Out"].forEach((label) => {
    const th = document.createElement("th");
    th.className = "daily-crews-summary-column";
    th.textContent = label;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const crewRow = document.createElement("tr");
  const crewCell = document.createElement("th");
  crewCell.className = "daily-crews-summary-crew";
  crewCell.colSpan = 4;
  const crewKey = `weekly-${dateKey}-crew-${shift.id}`;
  const crewValue = assignments[crewKey] || "Not Staffed";
  crewCell.appendChild(createDailyCrewsMirrorValue("crew", crewValue));
  crewRow.appendChild(crewCell);
  table.appendChild(crewRow);

  for (let row = 0; row < dailyCrewsSlotCount; row += 1) {
    const tr = document.createElement("tr");
    const prefix = `weekly-${dateKey}-${shift.id}-${row}`;
    const cells = [
      { kind: "name", key: `${prefix}-member1`, colorMap: activeMemberColors },
      { kind: "time", key: `${prefix}-in` },
      { kind: "name", key: `${prefix}-member2`, colorMap: activeMemberColors },
      { kind: "time", key: `${prefix}-out` }
    ];

    cells.forEach((cellConfig) => {
      const td = document.createElement("td");
      td.className = "daily-crews-summary-cell";
      td.appendChild(createDailyCrewsMirrorValue(cellConfig.kind, assignments[cellConfig.key] || "", cellConfig.colorMap || {}));
      tr.appendChild(td);
    });

    table.appendChild(tr);
  }

  const commandRow = document.createElement("tr");
  commandRow.className = "daily-crews-summary-command";

  const commandLabel = document.createElement("td");
  commandLabel.className = "daily-crews-summary-command-label";
  commandLabel.textContent = "Command 13";
  commandRow.appendChild(commandLabel);

  const commandInKey = `weekly-${dateKey}-command-${shift.id}-in`;
  const commandInCell = document.createElement("td");
  commandInCell.className = "daily-crews-summary-command-cell";
  commandInCell.appendChild(createDailyCrewsMirrorValue("time", assignments[commandInKey] || ""));
  commandRow.appendChild(commandInCell);

  const commandMemberKey = `weekly-${dateKey}-command-${shift.id}-member`;
  const commandMemberCell = document.createElement("td");
  commandMemberCell.className = "daily-crews-summary-command-cell";
  commandMemberCell.appendChild(createDailyCrewsMirrorValue("command", assignments[commandMemberKey] || "", command13Colors));
  commandRow.appendChild(commandMemberCell);

  const commandOutKey = `weekly-${dateKey}-command-${shift.id}-out`;
  const commandOutCell = document.createElement("td");
  commandOutCell.className = "daily-crews-summary-command-cell";
  commandOutCell.appendChild(createDailyCrewsMirrorValue("time", assignments[commandOutKey] || ""));
  commandRow.appendChild(commandOutCell);

  table.appendChild(commandRow);

  return shell;
}

function buildDailyCrewsShiftMirror(boardData, shift, assignments) {
  const wrap = document.createElement("div");
  wrap.className = "daily-crews-summary-grid";

  wrap.appendChild(buildDailyCrewsShiftMirrorPanel(boardData, shift, assignments, getDailyCrewsDateKey(0), "Today"));
  wrap.appendChild(buildDailyCrewsShiftMirrorPanel(boardData, shift, assignments, getDailyCrewsDateKey(1), "+1 Day"));

  return wrap;
}

function buildDailyCrewShift(boardData, savedData, shift) {
  const section = document.createElement("section");
  section.className = "daily-crews-shift";

  const rail = document.createElement("div");
  rail.className = "daily-crews-shift-rail";

  const badge = document.createElement("div");
  badge.className = "daily-crews-shift-badge";
  badge.textContent = shift.id.toUpperCase();
  rail.appendChild(badge);

  const content = document.createElement("div");
  content.className = "daily-crews-shift-stack";

  const hourGrid = document.createElement("div");
  hourGrid.className = "daily-crews-shift-content";
  shift.hours.forEach((hour) => {
    hourGrid.appendChild(buildDailyCrewHour(boardData, savedData, shift.id, hour));
  });
  content.appendChild(hourGrid);

  const shiftAssignments = loadDailyCrewsShiftAssignments();
  content.appendChild(buildDailyCrewsShiftMirror(boardData, shift, shiftAssignments));

  rail.appendChild(content);

  section.appendChild(rail);
  return section;
}

function renderDailyCrewsPage() {
  const wrap = document.getElementById("dailyCrewsWrap");
  if (!wrap) {
    return;
  }

  const boardData = loadBoardData();
  const savedData = loadDailyCrewsData();

  wrap.innerHTML = "";
  dailyCrewShifts.forEach((shift) => {
    wrap.appendChild(buildDailyCrewShift(boardData, savedData, shift));
  });
}

renderDailyCrewsPage();
