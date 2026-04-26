const WEEKLY_STORAGE_KEY = "station13-weekly-calendar";
const shiftConfigsWeekly = [
  { id: "a", title: "A - Shift 0000 - 0600", crew: "Staffed 1 Crew w/ Tower" },
  { id: "b", title: "B - Shift 0600 - 1200", crew: "Staffed 1 Crew w/ Tower" },
  { id: "c", title: "C - Shift 1200 - 1800", crew: "Staffed 2 Crews w/ Tower" },
  { id: "d", title: "D - Shift 1800 - 2400", crew: "Staffed 2 Crews w/ Tower" }
];
const weeklySlotCount = 15;

const crewStatusOptionsWeekly = [
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

const crewStatusColorsWeekly = {
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

const testHoursButton = document.getElementById("testHoursButton");
const weeklyStatus = document.getElementById("weeklyStatus");

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

function saveWeeklyAssignments(data) {
  if (window.storageService) {
    window.storageService.saveValue("weeklyAssignments", data);
    return;
  }
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(data));
}

function toDayKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showWeeklyStatus(message, isError = false) {
  if (!weeklyStatus) {
    return;
  }

  weeklyStatus.textContent = message;
  weeklyStatus.classList.toggle("save-status--error", isError);
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getWeeklyAnchorDate() {
  const overrideDateKey = window.storageService?.loadValue("systemMeta", {})?.displayDateKey;
  if (overrideDateKey) {
    return new Date(`${overrideDateKey}T00:00:00`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function appendWeeklyCalendarColGroup(table, includeSideColumn = true) {
  const colgroup = document.createElement("colgroup");

  if (includeSideColumn) {
    const sideCol = document.createElement("col");
    sideCol.className = "dc-col-side";
    colgroup.appendChild(sideCol);
  }

  shiftConfigsWeekly.forEach(() => {
    ["member", "time", "member", "time"].forEach((type) => {
      const col = document.createElement("col");
      col.className = type === "member" ? "dc-col-member" : "dc-col-time";
      colgroup.appendChild(col);
    });
  });

  table.appendChild(colgroup);
}

function applyCrewStatusColor(select) {
  if (select.dataset.kind !== "crew") {
    return;
  }
  const color = crewStatusColorsWeekly[select.value] || "rgba(12, 110, 61, 0.9)";
  const th = select.closest(".dc-crew-title");
  if (th) {
    th.style.background = color;
  }
  select.style.color = "#ffffff";
}

function applyWeeklyMemberFillColor(select, colorMap) {
  const fillColor = colorMap[select.value];
  const textColor = fillColor ? getReadableTextColor(fillColor) : "";
  select.style.backgroundColor = fillColor || "";
  select.style.color = textColor || "";
}

function createWeeklySelect(kind, key, selectedValue, activeMembers, command13Members, assignments, colorMap = {}) {
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
    options = crewStatusOptionsWeekly;
    if (selectedValue && !crewStatusOptionsWeekly.includes(selectedValue)) {
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
      saveWeeklyAssignments(assignments);
      applyCrewStatusColor(input);
      if (kind === "name" || kind === "command") {
        applyWeeklyMemberFillColor(input, colorMap);
      }
    }
  });

  if (kind === "crew") {
    field.input.dataset.kind = "crew";
  }

  applyCrewStatusColor(field.input);
  requestAnimationFrame(() => applyCrewStatusColor(field.input));
  if (kind === "name" || kind === "command") {
    applyWeeklyMemberFillColor(field.input, colorMap);
  }

  return field.root;
}

function renderDayBlock(dayDate, dayIndex, activeMembers, command13Members, activeMemberColors, command13Colors, assignments) {
  const card = document.createElement("section");
  card.className = "daily-calendar-card";

  const wrap = document.createElement("div");
  wrap.className = "daily-calendar-wrap";
  card.appendChild(wrap);

  const table = document.createElement("table");
  table.className = "daily-calendar-table";
  wrap.appendChild(table);
  appendWeeklyCalendarColGroup(table);

  const dayKey = toDayKey(dayDate);

  const headerShiftRow = document.createElement("tr");
  const sideHeader = document.createElement("th");
  sideHeader.className = "dc-side-header";
  sideHeader.rowSpan = 3;
  sideHeader.textContent = "";
  headerShiftRow.appendChild(sideHeader);

  shiftConfigsWeekly.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-shift-title";
    th.colSpan = 4;
    th.textContent = shift.title;
    headerShiftRow.appendChild(th);
  });
  table.appendChild(headerShiftRow);

  const headerColumnRow = document.createElement("tr");
  shiftConfigsWeekly.forEach(() => {
    ["Member", "In", "Member", "Out"].forEach((label) => {
      const th = document.createElement("th");
      th.className = "dc-column-title";
      th.textContent = label;
      headerColumnRow.appendChild(th);
    });
  });
  table.appendChild(headerColumnRow);

  const crewRow = document.createElement("tr");
  shiftConfigsWeekly.forEach((shift) => {
    const th = document.createElement("th");
    th.className = "dc-crew-title";
    th.colSpan = 4;
    const key = `weekly-${dayKey}-crew-${shift.id}`;
    const value = assignments[key] || "Not Staffed";
    th.appendChild(createWeeklySelect("crew", key, value, activeMembers, command13Members, assignments));
    crewRow.appendChild(th);
  });
  table.appendChild(crewRow);

  for (let row = 0; row < weeklySlotCount; row += 1) {
    const tr = document.createElement("tr");

    if (row === 0) {
      const sideCell = document.createElement("td");
      sideCell.className = "dc-side-cell";
      sideCell.rowSpan = weeklySlotCount + 1;

      const sideContent = document.createElement("div");
      sideContent.className = "dc-side-content";
      const title = document.createElement("div");
      title.className = "dc-side-cell--today";
      title.textContent = dayIndex === 0 ? "Today" : dayDate.toLocaleDateString("en-US", { weekday: "long" });
      const date = document.createElement("div");
      date.className = "dc-side-cell--date";
      date.textContent = formatDateLong(dayDate);
      sideContent.appendChild(title);
      sideContent.appendChild(date);
      sideCell.appendChild(sideContent);
      tr.appendChild(sideCell);
    }

    shiftConfigsWeekly.forEach((shift) => {
      const prefix = `weekly-${dayKey}-${shift.id}-${row}`;
      const cells = [
        { kind: "name", key: `${prefix}-member1` },
        { kind: "time", key: `${prefix}-in` },
        { kind: "name", key: `${prefix}-member2` },
        { kind: "time", key: `${prefix}-out` }
      ];

      cells.forEach((cellConfig) => {
        const td = document.createElement("td");
        td.appendChild(
          createWeeklySelect(
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
  shiftConfigsWeekly.forEach((shift) => {
    const labelCell = document.createElement("td");
    labelCell.className = "dc-command-label";
    labelCell.textContent = "Command 13";
    commandRow.appendChild(labelCell);

    const inKey = `weekly-${dayKey}-command-${shift.id}-in`;
    const inCell = document.createElement("td");
    inCell.appendChild(createWeeklySelect("time", inKey, assignments[inKey] || "", activeMembers, command13Members, assignments));
    commandRow.appendChild(inCell);

    const memberKey = `weekly-${dayKey}-command-${shift.id}-member`;
    const memberCell = document.createElement("td");
    memberCell.appendChild(createWeeklySelect("command", memberKey, assignments[memberKey] || "", activeMembers, command13Members, assignments, command13Colors));
    commandRow.appendChild(memberCell);

    const outKey = `weekly-${dayKey}-command-${shift.id}-out`;
    const outCell = document.createElement("td");
    outCell.appendChild(createWeeklySelect("time", outKey, assignments[outKey] || "", activeMembers, command13Members, assignments));
    commandRow.appendChild(outCell);
  });
  table.appendChild(commandRow);

  return card;
}

function renderWeeklyPage() {
  const stack = document.getElementById("weeklyStack");
  if (!stack) {
    return;
  }

  const boardData = loadBoardData();
  const activeMembers = boardData.activeMembers || [];
  const command13Members = boardData.command13Members || [];
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const command13Colors = boardData.colorRules?.command13 || {};
  const assignments = loadWeeklyAssignments();

  stack.innerHTML = "";
  const today = getWeeklyAnchorDate();

  for (let i = 0; i < 7; i += 1) {
    const day = addDays(today, i);
    stack.appendChild(renderDayBlock(day, i, activeMembers, command13Members, activeMemberColors, command13Colors, assignments));
  }
}

async function initWeeklyPage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }

  if (testHoursButton) {
    testHoursButton.addEventListener("click", async () => {
      const anchorDate = getWeeklyAnchorDate();
      const sourceDateKey = toDayKey(anchorDate);
      const targetDateKey = toDayKey(addDays(anchorDate, -1));

      testHoursButton.disabled = true;
      showWeeklyStatus("Calculating today's hours into Staffing Hours yesterday column...");

      try {
        const response = await fetch("/api/admin/calculate-hours", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sourceDateKey,
            targetDateKey,
            shiftYesterdayColumn: true
          })
        });

        if (!response.ok) {
          throw new Error("Could not calculate hours.");
        }

        const result = await response.json();
        const memberCount = Object.keys(result.calculatedHours || {}).length;
        showWeeklyStatus(`Shifted Staffing Hours yesterday column and calculated hours for ${memberCount} member${memberCount === 1 ? "" : "s"}.`);
      } catch (error) {
        showWeeklyStatus(error.message || "Could not calculate hours.", true);
      } finally {
        testHoursButton.disabled = false;
      }
    });
  }

  renderWeeklyPage();
}

initWeeklyPage();
