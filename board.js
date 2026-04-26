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
  "tower-bar": "barCan",
  "tower-ovm": "ovm",
  "tower-can": "barCan",
  "tower-roof": "roof",
  "rescue-bar": "barCan",
  "rescue-ovm": "ovm",
  "rescue-can": "barCan",
  "rescue-roof": "roof",
  "command-vehicle": "command13",
  "command-2": "command13"
};

const shiftConfigs = [
  { id: "a", title: "A - Shift 0000 - 0600", crew: "Staffed 1 Crew w/ Tower" },
  { id: "b", title: "B - Shift 0600 - 1200", crew: "Staffed 1 Crew w/ Tower" },
  { id: "c", title: "C - Shift 1200 - 1800", crew: "Staffed 2 Crews w/ Tower" },
  { id: "d", title: "D - Shift 1800 - 2400", crew: "Staffed 2 Crews w/ Tower" }
];

const APPARATUS_SLOT_IDS = ["slot1", "slot2", "slot3"];

const APPARATUS_TYPES = {
  engine132: {
    id: "engine132",
    title: "Engine 13-2",
    modifier: "apparatus-card--engine",
    positions: [
      { id: "driver", label: "Driver", poolKey: "engineDriver", fallback: "Kline, A." },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: "May, J." },
      { id: "nozzle", label: "Nozzle", poolKey: "nozzleBackupSupport", fallback: "Stamp, N." },
      { id: "layout", label: "Layout", poolKey: "activeMembers", fallback: "Ryen, R." },
      { id: "backup", label: "Backup", poolKey: "nozzleBackupSupport", fallback: "Greipp, R." },
      { id: "support", label: "Support", poolKey: "nozzleBackupSupport", fallback: "Ride A Long" }
    ]
  },
  engine135: {
    id: "engine135",
    title: "Engine 13-5",
    modifier: "apparatus-card--engine",
    positions: [
      { id: "driver", label: "Driver", poolKey: "engineDriver", fallback: OPEN_ASSIGNMENT },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: OPEN_ASSIGNMENT },
      { id: "nozzle", label: "Nozzle", poolKey: "nozzleBackupSupport", fallback: OPEN_ASSIGNMENT },
      { id: "layout", label: "Layout", poolKey: "activeMembers", fallback: OPEN_ASSIGNMENT },
      { id: "backup", label: "Backup", poolKey: "nozzleBackupSupport", fallback: OPEN_ASSIGNMENT },
      { id: "support", label: "Support", poolKey: "nozzleBackupSupport", fallback: OPEN_ASSIGNMENT }
    ]
  },
  tower13: {
    id: "tower13",
    title: "Tower 13",
    modifier: "apparatus-card--tower",
    positions: [
      { id: "driver", label: "Driver", poolKey: "towerDriver", fallback: "MacCormac, W." },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: "Tanler, K." },
      { id: "bar", label: "Bar", poolKey: "barCan", fallback: "Delvalle, J." },
      { id: "ovm", label: "OVM", poolKey: "ovm", fallback: "Newton, C." },
      { id: "can", label: "Can", poolKey: "barCan", fallback: OPEN_ASSIGNMENT },
      { id: "roof", label: "Roof", poolKey: "roof", fallback: OPEN_ASSIGNMENT }
    ]
  },
  rescue13: {
    id: "rescue13",
    title: "Rescue 13",
    modifier: "apparatus-card--rescue",
    positions: [
      { id: "driver", label: "Driver", poolKey: "rescueDriver", fallback: OPEN_ASSIGNMENT },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: OPEN_ASSIGNMENT },
      { id: "bar", label: "Bar", poolKey: "barCan", fallback: OPEN_ASSIGNMENT },
      { id: "ovm", label: "OVM", poolKey: "ovm", fallback: OPEN_ASSIGNMENT },
      { id: "can", label: "Can", poolKey: "barCan", fallback: OPEN_ASSIGNMENT },
      { id: "roof", label: "Roof", poolKey: "roof", fallback: OPEN_ASSIGNMENT }
    ]
  }
};

const APPARATUS_OPTIONS = Object.values(APPARATUS_TYPES).map((apparatus) => apparatus.title);
const APPARATUS_LABEL_TO_ID = Object.fromEntries(
  Object.values(APPARATUS_TYPES).map((apparatus) => [apparatus.title.toLowerCase(), apparatus.id])
);

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
  if (seatId.startsWith("rig-")) {
    const [, slotId, positionId] = seatId.split("-");
    const apparatusSlots = getApparatusSlots(boardData);
    const apparatusType = APPARATUS_TYPES[apparatusSlots[slotId]];
    const position = apparatusType?.positions.find((item) => item.id === positionId);
    const poolKey = position?.poolKey;

    if (!poolKey || poolKey === "activeMembers") {
      return boardData.activeMembers || [];
    }

    return boardData.rolePools[poolKey] || [];
  }

  const poolKey = seatPoolMap[seatId];
  if (poolKey) {
    if (poolKey === "command13") {
      return boardData.command13Members || [];
    }
    return boardData.rolePools[poolKey] || [];
  }
  return boardData.activeMembers || [];
}

function getApparatusSlots(boardData) {
  return {
    slot1: boardData.assignments?.__apparatus_slots?.slot1 || "engine132",
    slot2: boardData.assignments?.__apparatus_slots?.slot2 || "tower13",
    slot3: boardData.assignments?.__apparatus_slots?.slot3 || "rescue13"
  };
}

function getSeatPoolKey(boardData, seatId) {
  if (seatId.startsWith("rig-")) {
    const [, slotId, positionId] = seatId.split("-");
    const apparatusSlots = getApparatusSlots(boardData);
    const apparatusType = APPARATUS_TYPES[apparatusSlots[slotId]];
    const position = apparatusType?.positions.find((item) => item.id === positionId);
    return position?.poolKey || "activeMembers";
  }

  return seatPoolMap[seatId] || "activeMembers";
}

function getFallbackForSeat(boardData, seatId, fallbackValue = OPEN_ASSIGNMENT) {
  if (seatId.startsWith("rig-")) {
    const [, slotId, positionId] = seatId.split("-");
    const apparatusSlots = getApparatusSlots(boardData);
    const apparatusType = APPARATUS_TYPES[apparatusSlots[slotId]];
    const position = apparatusType?.positions.find((item) => item.id === positionId);
    return position?.fallback || OPEN_ASSIGNMENT;
  }

  return fallbackValue;
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
  return boardData?.colorRules?.[poolKey] || boardData?.colorRules?.activeMembers || {};
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

function migrateLegacyApparatusAssignments(boardData) {
  const savedAssignments = { ...(boardData.assignments || {}) };
  if (savedAssignments.__apparatus_layout_version === "2") {
    return boardData;
  }

  const legacyMap = {
    slot1: {
      type: "engine132",
      seats: {
        driver: "engine-driver",
        officer: "engine-officer",
        nozzle: "engine-nozzle",
        layout: "engine-layout",
        backup: "engine-backup",
        support: "engine-support"
      }
    },
    slot2: {
      type: "tower13",
      seats: {
        driver: "tower-driver",
        officer: "tower-officer",
        bar: "tower-bar",
        ovm: "tower-ovm",
        can: "tower-can",
        roof: "tower-roof"
      }
    },
    slot3: {
      type: "rescue13",
      seats: {
        driver: "rescue-driver",
        officer: "rescue-officer",
        bar: "rescue-bar",
        ovm: "rescue-ovm",
        can: "rescue-can",
        roof: "rescue-roof"
      }
    }
  };

  const nextSlots = getApparatusSlots(boardData);
  APPARATUS_SLOT_IDS.forEach((slotId) => {
    const legacyConfig = legacyMap[slotId];
    if (!savedAssignments.__apparatus_slots?.[slotId]) {
      nextSlots[slotId] = legacyConfig.type;
    }

    Object.entries(legacyConfig.seats).forEach(([positionId, legacySeatId]) => {
      const slotSeatId = `rig-${slotId}-${positionId}`;
      if (savedAssignments[slotSeatId] === undefined && savedAssignments[legacySeatId] !== undefined) {
        savedAssignments[slotSeatId] = savedAssignments[legacySeatId];
      }
    });
  });

  savedAssignments.__apparatus_slots = nextSlots;
  savedAssignments.__apparatus_layout_version = "2";

  return saveBoardData({
    ...boardData,
    assignments: savedAssignments
  });
}

function renderApparatusCards() {
  const grid = document.getElementById("assignmentGrid");
  if (!grid) {
    return;
  }

  const boardData = migrateLegacyApparatusAssignments(loadBoardData());
  const apparatusSlots = getApparatusSlots(boardData);

  grid.innerHTML = "";

  APPARATUS_SLOT_IDS.forEach((slotId) => {
    const apparatusId = apparatusSlots[slotId];
    const apparatus = APPARATUS_TYPES[apparatusId] || APPARATUS_TYPES.engine132;

    const card = document.createElement("article");
    card.className = `apparatus-card ${apparatus.modifier}`;

    const header = document.createElement("header");
    header.className = "apparatus-header";
    const headerField = createSearchCombobox({
      className: "apparatus-header-input",
      options: APPARATUS_OPTIONS,
      value: apparatus.title,
      ariaLabel: `${slotId} apparatus`,
      onCommit: (value, input) => {
        const chosenId = APPARATUS_LABEL_TO_ID[String(value || "").toLowerCase()];
        const nextId = chosenId || apparatusId;
        input.value = APPARATUS_TYPES[nextId].title;
        if (nextId === apparatusId) {
          return;
        }

        const latestData = loadBoardData();
        const latestAssignments = { ...(latestData.assignments || {}) };
        latestAssignments.__apparatus_slots = {
          ...getApparatusSlots(latestData),
          [slotId]: nextId
        };
        saveBoardData({
          ...latestData,
          assignments: latestAssignments
        });
        renderApparatusCards();
        populateBoardDropdowns();
      }
    });
    header.appendChild(headerField.root);
    card.appendChild(header);

    const seatList = document.createElement("div");
    seatList.className = "seat-list";

    apparatus.positions.forEach((position) => {
      const row = document.createElement("div");
      row.className = "seat-row";

      const role = document.createElement("span");
      role.className = "seat-role";
      role.textContent = position.label;
      row.appendChild(role);

      const select = document.createElement("select");
      select.className = position.fallback === OPEN_ASSIGNMENT ? "seat-input seat-input--empty" : "seat-input";
      select.dataset.seat = `rig-${slotId}-${position.id}`;
      select.dataset.default = position.fallback;
      row.appendChild(select);

      seatList.appendChild(row);
    });

    card.appendChild(seatList);
    grid.appendChild(card);
  });
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
    const fallbackValue = getFallbackForSeat(boardData, seatId, select.dataset.default || OPEN_ASSIGNMENT);
    const selectedValue = boardData.assignments[seatId] || fallbackValue;
    const normalizedValue = selectedValue === OPEN_ASSIGNMENT ? "" : selectedValue;
    const poolKey = getSeatPoolKey(boardData, seatId);
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
  renderApparatusCards();
  populateBoardDropdowns();
  renderDailyCalendar();
}

initBoardPage();
