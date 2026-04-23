const ARCHIVED_STORAGE_KEY = "station13-archived-calendar";
const shiftConfigsArchived = [
  { id: "a", title: "A - Shift 0000 - 0600", crew: "Staffed 1 Crew w/ Tower" },
  { id: "b", title: "B - Shift 0600 - 1200", crew: "Staffed 1 Crew w/ Tower" },
  { id: "c", title: "C - Shift 1200 - 1800", crew: "Staffed 2 Crews w/ Tower" },
  { id: "d", title: "D - Shift 1800 - 2400", crew: "Staffed 2 Crews w/ Tower" }
];
const archivedSlotCount = 15;

const crewStatusOptionsArchived = [
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

const crewStatusColorsArchived = {
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

function loadArchivedAssignments() {
  try {
    const raw = localStorage.getItem(ARCHIVED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveArchivedAssignments(data) {
  localStorage.setItem(ARCHIVED_STORAGE_KEY, JSON.stringify(data));
}

function toArchivedDayKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addArchivedDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function formatArchivedDateLong(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function applyArchivedCrewStatusColor(select) {
  if (select.dataset.kind !== "crew") {
    return;
  }
  const color = crewStatusColorsArchived[select.value] || "rgba(12, 110, 61, 0.9)";
  const th = select.closest(".dc-crew-title");
  if (th) {
    th.style.background = color;
  }
  select.style.color = "#ffffff";
}

function applyArchivedMemberFillColor(select, colorMap) {
  const fillColor = colorMap[select.value];
  const textColor = fillColor ? getReadableTextColor(fillColor) : "";
  select.style.backgroundColor = fillColor || "";
  select.style.color = textColor || "";
}

function appendArchivedCalendarColGroup(table, includeSideColumn = true) {
  const colgroup = document.createElement("colgroup");

  if (includeSideColumn) {
    const sideCol = document.createElement("col");
    sideCol.className = "dc-col-side";
    colgroup.appendChild(sideCol);
  }

  shiftConfigsArchived.forEach(() => {
    ["member", "time", "member", "time"].forEach((type) => {
      const col = document.createElement("col");
      col.className = type === "member" ? "dc-col-member" : "dc-col-time";
      colgroup.appendChild(col);
    });
  });

  table.appendChild(colgroup);
}

function createArchivedSelect(kind, key, selectedValue, activeMembers, command13Members, assignments, colorMap = {}) {
  let options = [];

  if (kind === "name") {
    const memberOptions = uniqueNames(activeMembers);
    options = memberOptions;
    if (selectedValue && !memberOptions.includes(selectedValue)) {
      selectedValue = "";
    }
  } else if (kind === "command") {
    const commandOptions = uniqueNames(command13Members);
    options = commandOptions;
    if (selectedValue && !commandOptions.includes(selectedValue)) {
      selectedValue = "";
    }
  } else if (kind === "time") {
    const times = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, "0"));
    options = times;
    if (selectedValue && !times.includes(selectedValue)) {
      selectedValue = "";
    }
  } else if (kind === "crew") {
    options = crewStatusOptionsArchived;
    if (selectedValue && !crewStatusOptionsArchived.includes(selectedValue)) {
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
        assignments[key] = value;
      } else {
        delete assignments[key];
      }
      saveArchivedAssignments(assignments);
      applyArchivedCrewStatusColor(input);
      if (kind === "name" || kind === "command") {
        applyArchivedMemberFillColor(input, colorMap);
      }
    }
  });

  if (kind === "crew") {
    field.input.dataset.kind = "crew";
  }

  applyArchivedCrewStatusColor(field.input);
  requestAnimationFrame(() => applyArchivedCrewStatusColor(field.input));
  if (kind === "name" || kind === "command") {
    applyArchivedMemberFillColor(field.input, colorMap);
  }

  return field.root;
}

function renderArchivedDayBlock(dayDate, dayIndex, activeMembers, command13Members, activeMemberColors, command13Colors, assignments) {
  const card = document.createElement("section");
  card.className = "daily-calendar-card";

  const wrap = document.createElement("div");
  wrap.className = "daily-calendar-wrap";
  card.appendChild(wrap);

  const table = document.createElement("table");
  table.className = "daily-calendar-table";
  wrap.appendChild(table);
  appendArchivedCalendarColGroup(table);

  const dayKey = toArchivedDayKey(dayDate);

  const headerShiftRow = document.createElement("tr");
  const sideHeader = document.createElement("th");
  sideHeader.className = "dc-side-header";
  sideHeader.rowSpan = 3;
  sideHeader.textContent = "";
  headerShiftRow.appendChild(sideHeader);

  shiftConfigsArchived.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-shift-title";
    th.colSpan = 4;
    th.textContent = shift.title;
    headerShiftRow.appendChild(th);
  });
  table.appendChild(headerShiftRow);

  const headerColumnRow = document.createElement("tr");
  shiftConfigsArchived.forEach(() => {
    ["Member", "In", "Member", "Out"].forEach((label) => {
      const th = document.createElement("th");
      th.className = "dc-column-title";
      th.textContent = label;
      headerColumnRow.appendChild(th);
    });
  });
  table.appendChild(headerColumnRow);

  const crewRow = document.createElement("tr");
  shiftConfigsArchived.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-crew-title";
    th.colSpan = 4;
    const key = `archived-${dayKey}-crew-${shift.id}`;
    const value = assignments[key] || "Not Staffed";
    th.appendChild(createArchivedSelect("crew", key, value, activeMembers, command13Members, assignments));
    crewRow.appendChild(th);
  });
  table.appendChild(crewRow);

  for (let row = 0; row < archivedSlotCount; row += 1) {
    const tr = document.createElement("tr");

    if (row === 0) {
      const sideCell = document.createElement("td");
      sideCell.className = "dc-side-cell";
      sideCell.rowSpan = archivedSlotCount + 1;

      const sideContent = document.createElement("div");
      sideContent.className = "dc-side-content";
      const title = document.createElement("div");
      title.className = "dc-side-cell--today";
      title.textContent = dayIndex === 0 ? "Yesterday" : dayDate.toLocaleDateString("en-US", { weekday: "long" });
      const date = document.createElement("div");
      date.className = "dc-side-cell--date";
      date.textContent = formatArchivedDateLong(dayDate);
      sideContent.appendChild(title);
      sideContent.appendChild(date);
      sideCell.appendChild(sideContent);
      tr.appendChild(sideCell);
    }

    shiftConfigsArchived.forEach((shift) => {
      const prefix = `archived-${dayKey}-${shift.id}-${row}`;
      const cells = [
        { kind: "name", key: `${prefix}-member1` },
        { kind: "time", key: `${prefix}-in` },
        { kind: "name", key: `${prefix}-member2` },
        { kind: "time", key: `${prefix}-out` }
      ];

      cells.forEach((cellConfig) => {
        const td = document.createElement("td");
        td.appendChild(
          createArchivedSelect(
            cellConfig.kind,
            cellConfig.key,
            assignments[cellConfig.key] || "",
            activeMembers,
            command13Members,
            assignments,
            activeMemberColors
          )
        );
        tr.appendChild(td);
      });
    });

    table.appendChild(tr);
  }

  const commandRow = document.createElement("tr");
  commandRow.className = "dc-command-row";
  shiftConfigsArchived.forEach((shift) => {
    const labelCell = document.createElement("td");
    labelCell.className = "dc-command-label";
    labelCell.textContent = "Command 13";
    commandRow.appendChild(labelCell);

    const inKey = `archived-${dayKey}-command-${shift.id}-in`;
    const inCell = document.createElement("td");
    inCell.appendChild(createArchivedSelect("time", inKey, assignments[inKey] || "", activeMembers, command13Members, assignments));
    commandRow.appendChild(inCell);

    const memberKey = `archived-${dayKey}-command-${shift.id}-member`;
    const memberCell = document.createElement("td");
    memberCell.appendChild(createArchivedSelect("command", memberKey, assignments[memberKey] || "", activeMembers, command13Members, assignments, command13Colors));
    commandRow.appendChild(memberCell);

    const outKey = `archived-${dayKey}-command-${shift.id}-out`;
    const outCell = document.createElement("td");
    outCell.appendChild(createArchivedSelect("time", outKey, assignments[outKey] || "", activeMembers, command13Members, assignments));
    commandRow.appendChild(outCell);
  });
  table.appendChild(commandRow);

  return card;
}

function renderArchivedPage() {
  const stack = document.getElementById("archivedStack");
  if (!stack) {
    return;
  }

  const boardData = loadBoardData();
  const activeMembers = boardData.activeMembers || [];
  const command13Members = boardData.command13Members || [];
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const command13Colors = boardData.colorRules?.command13 || {};
  const assignments = loadArchivedAssignments();

  stack.innerHTML = "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 7; i += 1) {
    const day = addArchivedDays(today, -i);
    stack.appendChild(renderArchivedDayBlock(day, i - 1, activeMembers, command13Members, activeMemberColors, command13Colors, assignments));
  }
}

renderArchivedPage();
