const STAFFING_STORAGE_KEY = "station13-staffing-hours";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getSunday(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / MS_PER_DAY) + 1) / 7);
}

function formatColumnLabel(date, isYesterday = false) {
  if (isYesterday) {
    return "Yesterday";
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function loadHoursData() {
  if (window.storageService) {
    return window.storageService.loadValue("staffingHours", {}) || {};
  }
  try {
    const raw = localStorage.getItem(STAFFING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function saveHoursData(data) {
  if (window.storageService) {
    window.storageService.saveValue("staffingHours", data);
    return;
  }
  localStorage.setItem(STAFFING_STORAGE_KEY, JSON.stringify(data));
}

function getDisplayDates() {
  const today = startOfDay(new Date());
  const yesterday = new Date(today.getTime() - MS_PER_DAY);
  const dates = [];

  for (let i = 0; i < 7; i += 1) {
    dates.push(new Date(yesterday.getTime() - (i * MS_PER_DAY)));
  }

  return dates;
}

function getWeekTotal(memberName, memberHours, currentSunday, yesterday) {
  let total = 0;
  Object.entries(memberHours || {}).forEach(([dateKey, value]) => {
    const date = startOfDay(new Date(`${dateKey}T00:00:00`));
    if (date >= currentSunday && date <= yesterday) {
      total += Number(value) || 0;
    }
  });
  return total;
}

function createHoursInput(member, dateKey, value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "hours-input";
  input.min = "0";
  input.step = "1";
  input.value = value > 0 ? String(value) : "";
  input.placeholder = "";
  input.addEventListener("change", () => {
    const parsed = Number(input.value);
    onChange(member, dateKey, Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  });
  return input;
}

function renderStaffingTable() {
  const boardData = loadBoardData();
  const activeMembers = boardData.activeMembers || [];
  const hoursData = loadHoursData();
  const head = document.getElementById("staffingHead");
  const body = document.getElementById("staffingBody");
  const displayDates = getDisplayDates();
  const yesterday = displayDates[0];
  const currentSunday = getSunday(new Date());
  const weekNumber = getISOWeekNumber(currentSunday);

  head.innerHTML = "";
  body.innerHTML = "";

  const headerRow = document.createElement("tr");
  const memberHeader = document.createElement("th");
  memberHeader.textContent = "Member";
  headerRow.appendChild(memberHeader);

  displayDates.forEach((date, index) => {
    const th = document.createElement("th");
    th.textContent = formatColumnLabel(date, index === 0);
    headerRow.appendChild(th);
  });

  const totalHeader = document.createElement("th");
  totalHeader.textContent = `Total for Week # ${weekNumber}`;
  headerRow.appendChild(totalHeader);
  head.appendChild(headerRow);

  function handleHoursChange(member, dateKey, value) {
    if (!hoursData[member]) {
      hoursData[member] = {};
    }
    if (value <= 0) {
      delete hoursData[member][dateKey];
    } else {
      hoursData[member][dateKey] = value;
    }
    saveHoursData(hoursData);
    renderStaffingTable();
  }

  activeMembers.forEach((member) => {
    const row = document.createElement("tr");

    const memberCell = document.createElement("td");
    memberCell.textContent = member;
    memberCell.className = "member-cell";
    row.appendChild(memberCell);

    displayDates.forEach((date) => {
      const dateKey = toDateKey(date);
      const value = Number(hoursData[member]?.[dateKey] || 0);
      const cell = document.createElement("td");
      cell.appendChild(createHoursInput(member, dateKey, value, handleHoursChange));
      row.appendChild(cell);
    });

    const weekTotalCell = document.createElement("td");
    weekTotalCell.className = "week-total-cell";
    weekTotalCell.textContent = String(getWeekTotal(member, hoursData[member], currentSunday, yesterday));
    row.appendChild(weekTotalCell);

    body.appendChild(row);
  });
}

async function initStaffingPage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }
  renderStaffingTable();
}

initStaffingPage();
