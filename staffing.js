const STAFFING_STORAGE_KEY = "station13-staffing-hours";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const exportWeeklyRecordsButton = document.getElementById("exportWeeklyRecordsButton");
const staffingExportStatus = document.getElementById("staffingExportStatus");

function toDateKey(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function showStaffingExportStatus(message, isError = false) {
  if (!staffingExportStatus) {
    return;
  }

  staffingExportStatus.textContent = message;
  staffingExportStatus.classList.toggle("save-status--error", isError);
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
  const activeMemberColors = boardData.colorRules?.activeMembers || {};
  const hoursData = loadHoursData();
  const head = document.getElementById("staffingHead");
  const body = document.getElementById("staffingBody");
  const displayDates = getDisplayDates();
  const yesterday = displayDates[0];
  const currentSunday = getSunday(yesterday);
  const weekNumber = getISOWeekNumber(yesterday);

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
    const fillColor = activeMemberColors[member] || "";
    const textColor = fillColor ? getReadableTextColor(fillColor) : "";

    const memberCell = document.createElement("td");
    memberCell.textContent = member;
    memberCell.className = "member-cell";
    if (fillColor) {
      memberCell.style.backgroundColor = fillColor;
      memberCell.style.color = textColor;
    }
    row.appendChild(memberCell);

    displayDates.forEach((date) => {
      const dateKey = toDateKey(date);
      const value = Number(hoursData[member]?.[dateKey] || 0);
      const cell = document.createElement("td");
      const input = createHoursInput(member, dateKey, value, handleHoursChange);
      if (fillColor) {
        cell.style.backgroundColor = fillColor;
        cell.style.color = textColor;
        input.style.color = textColor;
      }
      cell.appendChild(input);
      row.appendChild(cell);
    });

    const weekTotalCell = document.createElement("td");
    weekTotalCell.className = "week-total-cell";
    weekTotalCell.textContent = String(getWeekTotal(member, hoursData[member], currentSunday, yesterday));
    if (fillColor) {
      weekTotalCell.style.backgroundColor = fillColor;
      weekTotalCell.style.color = textColor;
    }
    row.appendChild(weekTotalCell);

    body.appendChild(row);
  });
}

async function initStaffingPage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }

  if (exportWeeklyRecordsButton) {
    exportWeeklyRecordsButton.addEventListener("click", async () => {
      const referenceDateKey = window.storageService?.loadValue("systemMeta", {})?.displayDateKey || toDateKey(startOfDay(new Date()));
      exportWeeklyRecordsButton.disabled = true;
      showStaffingExportStatus("Saving Staffing Hours and Weekly Staffing PDFs to Google Drive...");

      try {
        const response = await fetch("/api/admin/export-weekly-records", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ referenceDateKey })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Could not save PDFs to Google Drive.");
        }

        const result = await response.json();
        const fileNames = (result.files || []).map((file) => file.name).join(" and ");
        showStaffingExportStatus(`Saved ${fileNames} to Google Drive.`);
      } catch (error) {
        showStaffingExportStatus(error.message || "Could not save PDFs to Google Drive.", true);
      } finally {
        exportWeeklyRecordsButton.disabled = false;
      }
    });
  }

  renderStaffingTable();
}

initStaffingPage();
