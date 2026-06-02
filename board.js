const seatPoolMap = {
  "engine-driver": "engineDriver",
  "tower-driver": "towerDriver",
  "rescue-driver": "rescueDriver",
  "engine-officer": "officer",
  "tower-officer": "officer",
  "rescue-officer": "officer",
  "engine-nozzle": "engine",
  "engine-backup": "engine",
  "engine-support": "engine",
  "tower-bar": "truck",
  "tower-ovm": "ovm",
  "tower-can": "truck",
  "tower-roof": "truck",
  "rescue-bar": "truck",
  "rescue-ovm": "ovm",
  "rescue-can": "truck",
  "rescue-roof": "truck",
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

const APPARATUS_BASE_TYPES = {
  engine132: {
    id: "engine132",
    title: "Engine 13-2",
    modifier: "apparatus-card--engine",
    positions: [
      { id: "driver", label: "Driver", poolKey: "engineDriver", fallback: "Kline, A." },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: "May, J." },
      { id: "nozzle", label: "Nozzle", poolKey: "engine", fallback: "Stamp, N." },
      { id: "layout", label: "Layout", poolKey: "engine", fallback: "Ryen, R." },
      { id: "backup", label: "Backup", poolKey: "engine", fallback: "Greipp, R." },
      { id: "support", label: "Support", poolKey: "engine", fallback: "Ride A Long" }
    ]
  },
  engine135: {
    id: "engine135",
    title: "Engine 13-5",
    modifier: "apparatus-card--engine",
    positions: [
      { id: "driver", label: "Driver", poolKey: "engineDriver", fallback: OPEN_ASSIGNMENT },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: OPEN_ASSIGNMENT },
      { id: "nozzle", label: "Nozzle", poolKey: "engine", fallback: OPEN_ASSIGNMENT },
      { id: "layout", label: "Layout", poolKey: "engine", fallback: OPEN_ASSIGNMENT },
      { id: "backup", label: "Backup", poolKey: "engine", fallback: OPEN_ASSIGNMENT },
      { id: "support", label: "Support", poolKey: "engine", fallback: OPEN_ASSIGNMENT }
    ]
  },
  tower13: {
    id: "tower13",
    title: "Tower 13",
    modifier: "apparatus-card--tower",
    positions: [
      { id: "driver", label: "Driver", poolKey: "towerDriver", fallback: "MacCormac, W." },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: "Tanler, K." },
      { id: "bar", label: "Bar", poolKey: "truck", fallback: "Delvalle, J." },
      { id: "ovm", label: "OVM", poolKey: "ovm", fallback: "Newton, C." },
      { id: "can", label: "Can", poolKey: "truck", fallback: OPEN_ASSIGNMENT },
      { id: "roof", label: "Roof", poolKey: "truck", fallback: OPEN_ASSIGNMENT }
    ]
  },
  rescue13: {
    id: "rescue13",
    title: "Rescue 13",
    modifier: "apparatus-card--rescue",
    positions: [
      { id: "driver", label: "Driver", poolKey: "rescueDriver", fallback: OPEN_ASSIGNMENT },
      { id: "officer", label: "Officer", poolKey: "officer", fallback: OPEN_ASSIGNMENT },
      { id: "bar", label: "Bar", poolKey: "truck", fallback: OPEN_ASSIGNMENT },
      { id: "ovm", label: "OVM", poolKey: "ovm", fallback: OPEN_ASSIGNMENT },
      { id: "can", label: "Can", poolKey: "truck", fallback: OPEN_ASSIGNMENT },
      { id: "roof", label: "Roof", poolKey: "truck", fallback: OPEN_ASSIGNMENT }
    ]
  }
};

const KNOWN_APPARATUS_LABEL_TO_ID = Object.fromEntries(
  Object.values(APPARATUS_BASE_TYPES).map((apparatus) => [apparatus.title.toLowerCase(), apparatus.id])
);

function slugApparatusTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferApparatusBaseId(title) {
  const normalized = String(title || "").toLowerCase();
  if (normalized.includes("tower") || normalized.includes("truck") || normalized.includes("ladder")) {
    return "tower13";
  }
  if (normalized.includes("rescue") || normalized.includes("squad")) {
    return "rescue13";
  }
  return "engine132";
}

function getManagedApparatusTypes(boardData) {
  const colors = getApparatusColors(boardData);
  const managedTypes = {};

  getApparatusOptions(boardData).forEach((title) => {
    const knownId = KNOWN_APPARATUS_LABEL_TO_ID[String(title).toLowerCase()];
    const baseId = knownId || inferApparatusBaseId(title);
    const id = knownId || `${baseId}-custom-${slugApparatusTitle(title)}`;
    managedTypes[id] = {
      ...APPARATUS_BASE_TYPES[baseId],
      id,
      title,
      color: colors[title] || colors[APPARATUS_BASE_TYPES[baseId].title]
    };
  });

  Object.entries(APPARATUS_BASE_TYPES).forEach(([id, apparatus]) => {
    if (!managedTypes[id]) {
      managedTypes[id] = {
        ...apparatus,
        color: colors[apparatus.title]
      };
    }
  });

  return managedTypes;
}

function getApparatusLabelToId(apparatusTypes) {
  return Object.fromEntries(
    Object.values(apparatusTypes).map((apparatus) => [apparatus.title.toLowerCase(), apparatus.id])
  );
}

const slotCount = 15;
const outOfServiceSlotCount = 10;
const DAILY_BLANK_VERSION = "1";
const WEEKLY_STORAGE_KEY = "station13-weekly-calendar";
let activeOutServiceDateMenu = null;

const defaultDailyAssignments = {};

function getPoolForSeat(boardData, seatId) {
  if (seatId.startsWith("rig-")) {
    const [, slotId, positionId] = seatId.split("-");
    const apparatusSlots = getApparatusSlots(boardData);
    const apparatusTypes = getManagedApparatusTypes(boardData);
    const apparatusType = apparatusTypes[apparatusSlots[slotId]] || apparatusTypes.engine132;
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
    const apparatusTypes = getManagedApparatusTypes(boardData);
    const apparatusType = apparatusTypes[apparatusSlots[slotId]] || apparatusTypes.engine132;
    const position = apparatusType?.positions.find((item) => item.id === positionId);
    return position?.poolKey || "activeMembers";
  }

  return seatPoolMap[seatId] || "activeMembers";
}

function getFallbackForSeat(boardData, seatId, fallbackValue = OPEN_ASSIGNMENT) {
  if (seatId.startsWith("rig-")) {
    const [, slotId, positionId] = seatId.split("-");
    const apparatusSlots = getApparatusSlots(boardData);
    const apparatusTypes = getManagedApparatusTypes(boardData);
    const apparatusType = apparatusTypes[apparatusSlots[slotId]] || apparatusTypes.engine132;
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

  const color = getShiftStatusColors()[select.value] || "rgba(12, 110, 61, 0.9)";
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

  return {
    ...boardData,
    assignments: savedAssignments
  };
}

function renderApparatusCards() {
  const grid = document.getElementById("assignmentGrid");
  if (!grid) {
    return;
  }

  const boardData = migrateLegacyApparatusAssignments(loadBoardData());
  const apparatusSlots = getApparatusSlots(boardData);
  const apparatusTypes = getManagedApparatusTypes(boardData);
  const apparatusOptions = getApparatusOptions(boardData);
  const apparatusLabelToId = getApparatusLabelToId(apparatusTypes);

  grid.innerHTML = "";

  APPARATUS_SLOT_IDS.forEach((slotId) => {
    const apparatusId = apparatusSlots[slotId];
    const apparatus = apparatusTypes[apparatusId] || apparatusTypes.engine132;

    const card = document.createElement("article");
    card.className = `apparatus-card ${apparatus.modifier}`;

    const header = document.createElement("header");
    header.className = "apparatus-header";
    if (apparatus.color) {
      header.style.background = apparatus.color;
    }
    const headerField = createSearchCombobox({
      className: "apparatus-header-input",
      options: apparatusOptions,
      value: apparatus.title,
      ariaLabel: `${slotId} apparatus`,
      onCommit: (value, input) => {
        const chosenId = apparatusLabelToId[String(value || "").toLowerCase()];
        const nextId = chosenId || apparatus.id;
        const nextApparatus = apparatusTypes[nextId] || apparatusTypes[apparatusId] || apparatusTypes.engine132 || apparatus;
        input.value = nextApparatus.title;
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

function addDays(date, offsetDays) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return nextDate;
}

function stripCommandRoleLabel(value) {
  return String(value || "").replace(/\s+-\s+.+$/, "").trim();
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

function renderOutOfServiceCard() {
  const table = document.getElementById("outServiceTable");
  if (!table) {
    return;
  }

  const boardData = loadBoardData();
  const rows = boardData.outOfService || [];
  const activeMembers = boardData.activeMembers || [];

  table.innerHTML = "";

  const headerRow = document.createElement("div");
  headerRow.className = "out-service-row out-service-row--header";
  ["Member", "Start", "Finish"].forEach((label) => {
    const cell = document.createElement("span");
    cell.textContent = label;
    headerRow.appendChild(cell);
  });
  table.appendChild(headerRow);

  function saveOutOfServiceValue(rowIndex, fieldName, value) {
    const latestData = loadBoardData();
    const nextRows = Array.from({ length: outOfServiceSlotCount }, (_, index) => ({
      member: latestData.outOfService?.[index]?.member || "",
      start: latestData.outOfService?.[index]?.start || "",
      finish: latestData.outOfService?.[index]?.finish || ""
    }));

    nextRows[rowIndex][fieldName] = value;
    saveBoardData({
      ...latestData,
      outOfService: nextRows
    });
  }

  function toDateInputValue(value) {
    const rawValue = String(value || "").trim();
    if (rawValue.toUpperCase() === "UFN") {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      return rawValue;
    }

    const match = rawValue.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!match) {
      return "";
    }

    const currentYear = new Date().getFullYear();
    const rawYear = match[3] ? Number(match[3]) : currentYear;
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const month = String(Number(match[1])).padStart(2, "0");
    const day = String(Number(match[2])).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatOutServiceDate(value) {
    const rawValue = String(value || "").trim();
    if (rawValue.toUpperCase() === "UFN") {
      return "UFN";
    }

    const dateValue = toDateInputValue(rawValue);
    if (!dateValue) {
      return "";
    }

    const [, year, month, day] = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    return year && month && day ? `${month}/${day}/${year.slice(-2)}` : "";
  }

  function normalizeOutServiceDate(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
      return "";
    }

    if (rawValue.toUpperCase() === "UFN") {
      return "UFN";
    }

    return toDateInputValue(rawValue);
  }

  function closeOutServiceDateMenu() {
    if (activeOutServiceDateMenu) {
      activeOutServiceDateMenu();
    }
  }

  function openOutServiceDateMenu(anchor, rowIndex, fieldName, currentValue, onDisplayChange) {
    closeOutServiceDateMenu();

    const menu = document.createElement("div");
    menu.className = "out-service-date-menu";

    const picker = document.createElement("input");
    picker.type = "date";
    picker.className = "out-service-date-picker";
    picker.value = toDateInputValue(currentValue);
    menu.appendChild(picker);

    const ufnButton = document.createElement("button");
    ufnButton.type = "button";
    ufnButton.className = "out-service-date-menu-option";
    ufnButton.textContent = "UFN";
    menu.appendChild(ufnButton);

    document.body.appendChild(menu);

    const rect = anchor.getBoundingClientRect();
    const menuWidth = Math.max(170, rect.width + 58);
    menu.style.left = `${Math.min(window.innerWidth - menuWidth - 4, Math.max(4, rect.left))}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.width = `${menuWidth}px`;

    function closeMenu() {
      menu.remove();
      document.removeEventListener("mousedown", handleOutsideClick, true);
      activeOutServiceDateMenu = null;
    }

    function handleOutsideClick(event) {
      if (menu.contains(event.target) || anchor === event.target) {
        return;
      }
      closeMenu();
    }

    activeOutServiceDateMenu = closeMenu;
    document.addEventListener("mousedown", handleOutsideClick, true);

    ufnButton.addEventListener("click", () => {
      saveOutOfServiceValue(rowIndex, fieldName, "UFN");
      onDisplayChange("UFN");
      closeMenu();
    });

    picker.addEventListener("change", () => {
      saveOutOfServiceValue(rowIndex, fieldName, picker.value);
      onDisplayChange(formatOutServiceDate(picker.value));
      closeMenu();
    });

    window.setTimeout(() => {
      anchor.focus();
      anchor.select();
    }, 0);
  }

  for (let index = 0; index < outOfServiceSlotCount; index += 1) {
    const rowData = rows[index] || {};
    const row = document.createElement("div");
    row.className = "out-service-row";

    const memberCell = document.createElement("div");
    const memberField = createSearchCombobox({
      className: "out-service-input out-service-input--member",
      options: activeMembers,
      value: rowData.member || "",
      ariaLabel: `out of service member ${index + 1}`,
      onCommit: (value) => saveOutOfServiceValue(index, "member", value)
    });
    memberCell.appendChild(memberField.root);
    row.appendChild(memberCell);

    ["start", "finish"].forEach((fieldName) => {
      const cell = document.createElement("div");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "out-service-input out-service-input--date";
      input.value = formatOutServiceDate(rowData[fieldName] || "");
      input.placeholder = "";
      input.setAttribute("aria-label", `out of service ${fieldName} ${index + 1}`);
      input.addEventListener("click", () => {
        input.select();
        openOutServiceDateMenu(input, index, fieldName, rowData[fieldName] || "", (displayValue) => {
          input.value = displayValue;
          rowData[fieldName] = displayValue === "UFN" ? "UFN" : input.value;
        });
      });
      input.addEventListener("focus", () => input.select());
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          saveOutOfServiceValue(index, fieldName, "");
          input.value = "";
          rowData[fieldName] = "";
          closeOutServiceDateMenu();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openOutServiceDateMenu(input, index, fieldName, rowData[fieldName] || "", (displayValue) => {
            input.value = displayValue;
            rowData[fieldName] = displayValue === "UFN" ? "UFN" : input.value;
          });
        } else if (event.key.toLowerCase() === "u") {
          event.preventDefault();
          saveOutOfServiceValue(index, fieldName, "UFN");
          input.value = "UFN";
          rowData[fieldName] = "UFN";
          closeOutServiceDateMenu();
        }
      });
      input.addEventListener("blur", () => {
        const normalizedValue = normalizeOutServiceDate(input.value);
        saveOutOfServiceValue(index, fieldName, normalizedValue);
        rowData[fieldName] = normalizedValue;
        input.value = formatOutServiceDate(normalizedValue);
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });

    table.appendChild(row);
  }
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
    const crewOptions = getShiftStatusOptions();
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

  return {
    ...boardData,
    assignments: cleanedAssignments
  };
}

function formatDisplayDate(date = new Date()) {
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric"
  }).format(date).replace(" ", ", ");
  return `${monthDay}\n${date.getFullYear()}`;
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

function renderDailyCalendarBlock(dayDate, dayLabel, boardData, weeklyAssignments) {
  const card = document.createElement("section");
  card.className = "daily-calendar-card";

  const wrap = document.createElement("div");
  wrap.className = "daily-calendar-wrap";
  card.appendChild(wrap);

  const table = document.createElement("table");
  table.className = "daily-calendar-table";
  wrap.appendChild(table);

  const activeMembers = boardData.activeMembers || [];
  const command13Members = boardData.command13Members || [];
  const command13CalendarMembers = uniqueNames(command13Members.map(stripCommandRoleLabel));
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const command13Colors = boardData.colorRules?.command13 || {};
  const dayKey = getDateKey(dayDate);

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
    const crewKey = `weekly-${dayKey}-crew-${shift.id}`;
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

      const contentWrap = createCalendarSideContent(dayKey, dayLabel, formatDisplayDate(dayDate), boardData);
      sideCell.appendChild(contentWrap);
      tr.appendChild(sideCell);
    }

    shiftConfigs.forEach((shift) => {
      const prefix = `weekly-${dayKey}-${shift.id}-${row}`;
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
    const commandInKey = `weekly-${dayKey}-command-${shift.id}-in`;
    inCell.appendChild(createDailySelect("time", commandInKey, activeMembers, weeklyAssignments[commandInKey] || "", weeklyAssignments));
    commandRow.appendChild(inCell);

    const memberCell = document.createElement("td");
    const commandKey = `weekly-${dayKey}-command-${shift.id}-member`;
    const commandValue = stripCommandRoleLabel(weeklyAssignments[commandKey] || "");
    memberCell.appendChild(createDailySelect("name", commandKey, activeMembers, commandValue, weeklyAssignments, command13CalendarMembers, command13Colors));
    commandRow.appendChild(memberCell);

    const outCell = document.createElement("td");
    const commandOutKey = `weekly-${dayKey}-command-${shift.id}-out`;
    outCell.appendChild(createDailySelect("time", commandOutKey, activeMembers, weeklyAssignments[commandOutKey] || "", weeklyAssignments));
    commandRow.appendChild(outCell);
  });

  table.appendChild(commandRow);
  return card;
}

function renderDailyCalendar() {
  const stack = document.getElementById("boardCalendarStack");
  if (!stack) {
    return;
  }

  const boardData = ensureDailyCalendarStartsBlank(loadBoardData());
  const weeklyAssignments = loadWeeklyAssignments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  stack.innerHTML = "";
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(today, offset);
    const label = day.toLocaleDateString("en-US", { weekday: "long" });
    stack.appendChild(renderDailyCalendarBlock(day, label, boardData, weeklyAssignments));
  }
}

async function initBoardPage() {
  refreshBoardFromPersistence();

  if (window.storageService) {
    try {
      await window.storageService.initializePersistence();
      refreshBoardFromPersistence();
    } catch (error) {
      console.warn("Station 13 persistence failed to initialize; using local board data.", error);
    }
    return;
  }
}

function isBoardFieldActive() {
  const activeElement = document.activeElement;
  return activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
}

let boardRefreshPending = false;

function refreshBoardFromPersistence() {
  renderApparatusCards();
  populateBoardDropdowns();
  renderOutOfServiceCard();
  renderDailyCalendar();
}

window.addEventListener("station13:persistence-updated", (event) => {
  const changedKeys = event.detail?.changedKeys || [];
  const shouldRefresh = changedKeys.some((key) => ["boardData", "weeklyAssignments", "systemMeta"].includes(key));

  if (!shouldRefresh) {
    return;
  }

  if (isBoardFieldActive()) {
    boardRefreshPending = true;
    return;
  }

  refreshBoardFromPersistence();
});

document.addEventListener("focusout", () => {
  if (!boardRefreshPending) {
    return;
  }

  boardRefreshPending = false;
  window.setTimeout(refreshBoardFromPersistence, 0);
});

initBoardPage();
