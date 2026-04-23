const seatPoolMap = {
  "engine-driver": "engineDriver",
  "tower-driver": "towerDriver",
  "rescue-driver": "rescueDriver",
  "engine-officer": "officer",
  "tower-officer": "officer",
  "rescue-officer": "officer",
  "engine-nozzle": "nozzleBackupSupport",
  "engine-backup": "nozzleBackupSupport",
  "engine-support": "nozzleBackupSupport",
  "tower-bar": "barOvmCanRoof",
  "tower-ovm": "barOvmCanRoof",
  "tower-can": "barOvmCanRoof",
  "tower-roof": "barOvmCanRoof",
  "rescue-bar": "barOvmCanRoof",
  "rescue-ovm": "barOvmCanRoof",
  "rescue-can": "barOvmCanRoof",
  "rescue-roof": "barOvmCanRoof",
  "command-vehicle": "command13",
  "command-2": "command13"
};

const shiftConfigs = [
  { id: "a", title: "A - Shift 0000 - 0600", crew: "Staffed 1 Crew w/ Tower" },
  { id: "b", title: "B - Shift 0600 - 1200", crew: "Staffed 1 Crew w/ Tower" },
  { id: "c", title: "C - Shift 1200 - 1800", crew: "Staffed 2 Crews w/ Tower" },
  { id: "d", title: "D - Shift 1800 - 2400", crew: "Staffed 2 Crews w/ Tower" }
];

const slotCount = 15;
const DAILY_BLANK_VERSION = "1";
const WEEKLY_STORAGE_KEY = "station13-weekly-calendar";

const crewStatusOptions = [
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

const crewStatusColors = {
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

const defaultDailyAssignments = {};

function getPoolForSeat(boardData, seatId) {
  const poolKey = seatPoolMap[seatId];
  if (poolKey) {
    if (poolKey === "command13") {
      return boardData.command13Members || [];
    }
    return boardData.rolePools[poolKey] || [];
  }
  return boardData.activeMembers || [];
}

function buildOptions(pool, selectedValue, includeOpenAssignment = true) {
  const options = uniqueNames([selectedValue, ...pool].filter((value) => value && value !== OPEN_ASSIGNMENT));
  if (includeOpenAssignment && !options.includes(OPEN_ASSIGNMENT)) {
    options.push(OPEN_ASSIGNMENT);
  }
  return options;
}

function updateEmptyStyling(select) {
  if (!select.value || select.value === OPEN_ASSIGNMENT) {
    select.classList.add("seat-input--empty");
  } else {
    select.classList.remove("seat-input--empty");
  }
}

function applyCrewStatusColor(select) {
  if (select.dataset.kind !== "crew") {
    return;
  }

  const color = crewStatusColors[select.value] || "rgba(12, 110, 61, 0.9)";
  const th = select.closest(".dc-crew-title");
  if (th) {
    th.style.background = color;
  }
  select.style.color = "#ffffff";
}

function getColorRuleMap(boardData, poolKey) {
  if (poolKey === "command13") {
    return boardData?.colorRules?.command13 || {};
  }
  if (poolKey === "engineDriver") {
    return boardData?.colorRules?.engineDriver || {};
  }
  if (poolKey === "rescueDriver") {
    return boardData?.colorRules?.rescueDriver || {};
  }
  if (poolKey === "towerDriver") {
    return boardData?.colorRules?.towerDriver || {};
  }
  if (poolKey === "officer") {
    return boardData?.colorRules?.officer || {};
  }
  if (poolKey === "nozzleBackupSupport") {
    return boardData?.colorRules?.nozzleBackupSupport || {};
  }
  if (poolKey === "barOvmCanRoof") {
    return boardData?.colorRules?.barOvmCanRoof || {};
  }
  return boardData?.colorRules?.activeMembers || {};
}

function applyMemberFillColor(select, colorMap) {
  const selectedValue = select.value === OPEN_ASSIGNMENT ? "" : select.value;
  const fillColor = colorMap[selectedValue];
  const textColor = fillColor ? getReadableTextColor(fillColor) : "";
  const singleRow = select.closest(".seat-row--single");

  if (singleRow) {
    singleRow.style.background = fillColor || "";
    singleRow.style.borderColor = fillColor || "";
  }

  select.style.backgroundColor = fillColor || "";
  select.style.color = textColor || "";
}

function loadWeeklyAssignments() {
  if (window.storageService) {
    return window.storageService.loadValue("weeklyAssignments", {}) || {};
  }
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveWeeklyAssignments(assignments) {
  if (window.storageService) {
    window.storageService.saveValue("weeklyAssignments", assignments);
    return;
  }
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(assignments));
}

function getDateKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function populateBoardDropdowns() {
  const boardData = loadBoardData();
  const selects = document.querySelectorAll("select[data-seat]");

  selects.forEach((select) => {
    const seatId = select.dataset.seat;
    const fallbackValue = select.dataset.default || OPEN_ASSIGNMENT;
    const selectedValue = boardData.assignments[seatId] || fallbackValue;
    const normalizedValue = selectedValue === OPEN_ASSIGNMENT ? "" : selectedValue;
    const poolKey = seatPoolMap[seatId] || "activeMembers";
    const pool = getPoolForSeat(boardData, seatId);
    const options = buildOptions(pool, normalizedValue, false);
    const colorMap = getColorRuleMap(boardData, poolKey);
    const className = Array.from(select.classList)
      .filter((token) => token !== "seat-input--empty")
      .join(" ") || "seat-input";

    const field = createSearchCombobox({
      className,
      options,
      value: normalizedValue,
      ariaLabel: seatId.replace(/-/g, " "),
      onCommit: (value, input) => {
        const latestData = loadBoardData();
        latestData.assignments[seatId] = value || OPEN_ASSIGNMENT;
        saveBoardData(latestData);
        updateEmptyStyling(input);
        applyMemberFillColor(input, getColorRuleMap(latestData, poolKey));
      }
    });

    field.input.dataset.seat = seatId;
    field.input.dataset.default = fallbackValue;
    field.input.addEventListener("input", () => {
      if (field.input.value.trim()) {
        field.input.classList.remove("seat-input--empty");
      } else {
        field.input.classList.add("seat-input--empty");
      }
    });
    updateEmptyStyling(field.input);
    applyMemberFillColor(field.input, colorMap);
    select.replaceWith(field.root);
  });
}

function createDailySelect(kind, key, activeMembers, selectedValue, weeklyAssignments, allowedNames = null, colorMap = {}) {
  let options = [];
  if (kind === "name") {
    const sourceNames = Array.isArray(allowedNames) ? allowedNames : activeMembers;
    const memberOptions = uniqueNames(sourceNames);
    options = memberOptions;
    if (selectedValue && !memberOptions.includes(selectedValue)) {
      selectedValue = "";
    }
  } else if (kind === "time") {
    const timeOptions = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, "0"));
    options = timeOptions;
    if (selectedValue && !timeOptions.includes(selectedValue)) {
      selectedValue = "";
    }
  } else if (kind === "crew") {
    const crewOptions = crewStatusOptions;
    options = crewOptions;
    if (selectedValue && !crewOptions.includes(selectedValue)) {
      selectedValue = "";
    }
  }

  const field = createSearchCombobox({
    className: "daily-select",
    options,
    value: selectedValue,
    ariaLabel: key,
    onCommit: (value, input) => {
      if (value) {
        weeklyAssignments[key] = value;
      } else {
        delete weeklyAssignments[key];
      }
      saveWeeklyAssignments(weeklyAssignments);
      applyCrewStatusColor(input);
      if (kind === "name") {
        applyMemberFillColor(input, colorMap);
      }
    }
  });

  if (kind === "crew") {
    field.input.dataset.kind = "crew";
  }

  applyCrewStatusColor(field.input);
  requestAnimationFrame(() => applyCrewStatusColor(field.input));
  if (kind === "name") {
    applyMemberFillColor(field.input, colorMap);
  }

  return field.root;
}

function ensureDailyCalendarStartsBlank(boardData) {
  if (boardData.assignments.__daily_blank_version === DAILY_BLANK_VERSION) {
    return boardData;
  }

  const cleanedAssignments = {};
  Object.entries(boardData.assignments || {}).forEach(([key, value]) => {
    if (!key.startsWith("daily-")) {
      cleanedAssignments[key] = value;
    }
  });
  cleanedAssignments.__daily_blank_version = DAILY_BLANK_VERSION;

  return saveBoardData({
    ...boardData,
    assignments: cleanedAssignments
  });
}

function formatDisplayDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

function appendCalendarColGroup(table, includeSideColumn = true) {
  const colgroup = document.createElement("colgroup");

  if (includeSideColumn) {
    const sideCol = document.createElement("col");
    sideCol.className = "dc-col-side";
    colgroup.appendChild(sideCol);
  }

  shiftConfigs.forEach(() => {
    ["member", "time", "member", "time"].forEach((type) => {
      const col = document.createElement("col");
      col.className = type === "member" ? "dc-col-member" : "dc-col-time";
      colgroup.appendChild(col);
    });
  });

  table.appendChild(colgroup);
}

function renderDailyCalendar() {
  const table = document.getElementById("dailyCalendarTable");
  if (!table) {
    return;
  }

  const boardData = ensureDailyCalendarStartsBlank(loadBoardData());
  const activeMembers = boardData.activeMembers || [];
  const command13Members = boardData.command13Members || [];
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const command13Colors = boardData.colorRules?.command13 || {};
  const weeklyAssignments = loadWeeklyAssignments();
  const todayKey = getDateKey(new Date());

  table.innerHTML = "";
  appendCalendarColGroup(table);

  const headerShiftRow = document.createElement("tr");
  const sideHeader = document.createElement("th");
  sideHeader.className = "dc-side-header";
  sideHeader.rowSpan = 3;
  sideHeader.textContent = "";
  headerShiftRow.appendChild(sideHeader);

  shiftConfigs.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-shift-title";
    th.colSpan = 4;
    th.textContent = shift.title;
    headerShiftRow.appendChild(th);
  });
  table.appendChild(headerShiftRow);

  const headerColumnRow = document.createElement("tr");
  shiftConfigs.forEach(() => {
    ["Member", "In", "Member", "Out"].forEach((label) => {
      const th = document.createElement("th");
      th.className = "dc-column-title";
      th.textContent = label;
      headerColumnRow.appendChild(th);
    });
  });
  table.appendChild(headerColumnRow);

  const crewRow = document.createElement("tr");
  shiftConfigs.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-crew-title";
    th.colSpan = 4;
    const crewKey = `weekly-${todayKey}-crew-${shift.id}`;
    const crewValue = weeklyAssignments[crewKey] || "Not Staffed";
    th.appendChild(createDailySelect("crew", crewKey, activeMembers, crewValue, weeklyAssignments));
    crewRow.appendChild(th);
  });
  table.appendChild(crewRow);

  for (let row = 0; row < slotCount; row += 1) {
    const tr = document.createElement("tr");
    if (row === 0) {
      const sideCell = document.createElement("td");
      sideCell.className = "dc-side-cell";
      sideCell.rowSpan = slotCount + 1;

      const contentWrap = document.createElement("div");
      contentWrap.className = "dc-side-content";

      const today = document.createElement("div");
      today.className = "dc-side-cell--today";
      today.textContent = "Today";
      contentWrap.appendChild(today);

      const date = document.createElement("div");
      date.className = "dc-side-cell--date";
      date.textContent = formatDisplayDate();
      contentWrap.appendChild(date);

      sideCell.appendChild(contentWrap);
      tr.appendChild(sideCell);
    }

    shiftConfigs.forEach((shift) => {
      const prefix = `weekly-${todayKey}-${shift.id}-${row}`;
      const cells = [
        { kind: "name", key: `${prefix}-member1` },
        { kind: "time", key: `${prefix}-in` },
        { kind: "name", key: `${prefix}-member2` },
        { kind: "time", key: `${prefix}-out` }
      ];

      cells.forEach((cellConfig) => {
        const key = cellConfig.key;
        const value = weeklyAssignments[key] || "";
        const td = document.createElement("td");
        const select = createDailySelect(cellConfig.kind, key, activeMembers, value, weeklyAssignments, null, activeMemberColors);
        td.appendChild(select);
        tr.appendChild(td);
      });
    });

    table.appendChild(tr);
  }

  const commandRow = document.createElement("tr");
  commandRow.className = "dc-command-row";
  shiftConfigs.forEach((shift) => {
    const labelCell = document.createElement("td");
    labelCell.className = "dc-command-label";
    labelCell.textContent = "Command 13";
    commandRow.appendChild(labelCell);

    const inCell = document.createElement("td");
    const commandInKey = `weekly-${todayKey}-command-${shift.id}-in`;
    inCell.appendChild(createDailySelect("time", commandInKey, activeMembers, weeklyAssignments[commandInKey] || "", weeklyAssignments));
    commandRow.appendChild(inCell);

    const memberCell = document.createElement("td");
    const commandKey = `weekly-${todayKey}-command-${shift.id}-member`;
    const commandValue = weeklyAssignments[commandKey] || "";
    memberCell.appendChild(createDailySelect("name", commandKey, activeMembers, commandValue, weeklyAssignments, command13Members, command13Colors));
    commandRow.appendChild(memberCell);

    const outCell = document.createElement("td");
    const commandOutKey = `weekly-${todayKey}-command-${shift.id}-out`;
    outCell.appendChild(createDailySelect("time", commandOutKey, activeMembers, weeklyAssignments[commandOutKey] || "", weeklyAssignments));
    commandRow.appendChild(outCell);
  });

  table.appendChild(commandRow);
}

async function initBoardPage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }
  populateBoardDropdowns();
  renderDailyCalendar();
}

initBoardPage();
