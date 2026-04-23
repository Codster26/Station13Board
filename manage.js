const fields = {
  activeMembers: document.getElementById("activeMembersInput"),
  engineDriver: document.getElementById("engineDriverInput"),
  rescueDriver: document.getElementById("rescueDriverInput"),
  towerDriver: document.getElementById("towerDriverInput"),
  officer: document.getElementById("officerInput"),
  nozzleBackupSupport: document.getElementById("nozzleBackupSupportInput"),
  barOvmCanRoof: document.getElementById("barOvmCanRoofInput"),
  command13: document.getElementById("command13Input")
};

const saveButton = document.getElementById("saveSettingsButton");
const resetButton = document.getElementById("resetSettingsButton");
const previewRolloverButton = document.getElementById("previewRolloverButton");
const runRolloverButton = document.getElementById("runRolloverButton");
const saveStatus = document.getElementById("saveStatus");

function writeListsToForm(boardData) {
  const colorRules = boardData.colorRules || {};
  fields.activeMembers.value = formatNameColorList(boardData.activeMembers, colorRules.activeMembers || {});
  fields.engineDriver.value = formatNameColorList(boardData.rolePools.engineDriver, colorRules.engineDriver || {});
  fields.rescueDriver.value = formatNameColorList(boardData.rolePools.rescueDriver, colorRules.rescueDriver || {});
  fields.towerDriver.value = formatNameColorList(boardData.rolePools.towerDriver, colorRules.towerDriver || {});
  fields.officer.value = formatNameColorList(boardData.rolePools.officer, colorRules.officer || {});
  fields.nozzleBackupSupport.value = formatNameColorList(boardData.rolePools.nozzleBackupSupport, colorRules.nozzleBackupSupport || {});
  fields.barOvmCanRoof.value = formatNameColorList(boardData.rolePools.barOvmCanRoof, colorRules.barOvmCanRoof || {});
  fields.command13.value = formatNameColorList(boardData.command13Members || [], colorRules.command13 || {});
}

function readListsFromForm() {
  const activeMemberData = parseNameColorList(fields.activeMembers.value);
  const engineDriverData = parseNameColorList(fields.engineDriver.value);
  const rescueDriverData = parseNameColorList(fields.rescueDriver.value);
  const towerDriverData = parseNameColorList(fields.towerDriver.value);
  const officerData = parseNameColorList(fields.officer.value);
  const nozzleData = parseNameColorList(fields.nozzleBackupSupport.value);
  const barData = parseNameColorList(fields.barOvmCanRoof.value);
  const command13Data = parseNameColorList(fields.command13.value);
  return {
    activeMembers: activeMemberData.names,
    rolePools: {
      engineDriver: engineDriverData.names,
      rescueDriver: rescueDriverData.names,
      towerDriver: towerDriverData.names,
      officer: officerData.names,
      nozzleBackupSupport: nozzleData.names,
      barOvmCanRoof: barData.names
    },
    command13Members: command13Data.names,
    colorRules: {
      activeMembers: activeMemberData.colors,
      engineDriver: engineDriverData.colors,
      rescueDriver: rescueDriverData.colors,
      towerDriver: towerDriverData.colors,
      officer: officerData.colors,
      nozzleBackupSupport: nozzleData.colors,
      barOvmCanRoof: barData.colors,
      command13: command13Data.colors
    }
  };
}

function showStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("save-status--error", isError);
}

function getLocalDateKey(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

saveButton.addEventListener("click", () => {
  const currentData = loadBoardData();
  const updatedLists = readListsFromForm();
  const saved = saveBoardData({
    ...currentData,
    ...updatedLists
  });
  writeListsToForm(saved);
  showStatus("Saved. Riding board dropdowns now use these lists.");
});

resetButton.addEventListener("click", () => {
  const currentData = loadBoardData();
  const resetData = saveBoardData({
    ...DEFAULT_BOARD_DATA,
    assignments: currentData.assignments
  });
  writeListsToForm(resetData);
  showStatus("Lists reset to defaults. Current seat assignments were kept.");
});

previewRolloverButton?.addEventListener("click", async () => {
  showStatus("Checking midnight rollover preview...");

  try {
    const response = await fetch("/api/admin/rollover-preview", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Preview failed");
    }

    const summary = await response.json();
    showStatus(`Preview: ${summary.copiedEntries} entries from ${summary.sourceDateKey} will move into Archived Hours. Weekly dates advance automatically because they are stored by actual day.`);
  } catch (error) {
    showStatus("Could not preview rollover. Make sure you are running through Wrangler/Cloudflare.", true);
  }
});

runRolloverButton?.addEventListener("click", async () => {
  showStatus("Running midnight rollover test...");

  try {
    const todayKey = getLocalDateKey(0);
    const yesterdayKey = getLocalDateKey(-1);
    const response = await fetch("/api/admin/rollover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sourceDateKey: todayKey,
        archiveDateKey: yesterdayKey,
        clearSourceWeekly: false,
        pruneArchived: false
      })
    });

    if (!response.ok) {
      throw new Error("Rollover failed");
    }

    const result = await response.json();
    const summary = result.summary || {};
    showStatus(`Rollover test ran. Copied ${summary.copiedEntries || 0} entries from today's weekly board into the visible Archived Yesterday slot without clearing Weekly Staffing.`);
  } catch (error) {
    showStatus("Could not run rollover test. Make sure you are running through Wrangler/Cloudflare.", true);
  }
});

async function initManagePage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }
  writeListsToForm(loadBoardData());
}

initManagePage();
