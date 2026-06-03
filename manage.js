const fields = {
  activeMembers: document.getElementById("activeMembersInput"),
  apparatus: document.getElementById("apparatusInput"),
  engineDriver: document.getElementById("engineDriverInput"),
  rescueDriver: document.getElementById("rescueDriverInput"),
  towerDriver: document.getElementById("towerDriverInput"),
  officer: document.getElementById("officerInput"),
  engine: document.getElementById("engineInput"),
  truck: document.getElementById("truckInput"),
  ovm: document.getElementById("ovmInput"),
  command13: document.getElementById("command13Input"),
  colorTags: document.getElementById("colorTagsInput"),
  calendarTags: document.getElementById("calendarTagsInput"),
  shiftStatus: document.getElementById("shiftStatusInput"),
  liveIns: document.getElementById("liveInsInput")
};

const saveButton = document.getElementById("saveSettingsButton");
const resetButton = document.getElementById("resetSettingsButton");
const saveStatus = document.getElementById("saveStatus");

function writeListsToForm(boardData) {
  const colorRules = boardData.colorRules || {};
  const tagRules = boardData.tagRules || {};
  fields.activeMembers.value = formatNameColorList(boardData.activeMembers, colorRules.activeMembers || {}, tagRules.activeMembers || {});
  fields.apparatus.value = formatApparatusList(getApparatusOptions(boardData), getApparatusColors(boardData));
  fields.engineDriver.value = formatNameColorList(boardData.rolePools.engineDriver, colorRules.engineDriver || {}, tagRules.engineDriver || {});
  fields.rescueDriver.value = formatNameColorList(boardData.rolePools.rescueDriver, colorRules.rescueDriver || {}, tagRules.rescueDriver || {});
  fields.towerDriver.value = formatNameColorList(boardData.rolePools.towerDriver, colorRules.towerDriver || {}, tagRules.towerDriver || {});
  fields.officer.value = formatNameColorList(boardData.rolePools.officer, colorRules.officer || {}, tagRules.officer || {});
  fields.engine.value = formatNameColorList(boardData.rolePools.engine, colorRules.engine || {}, tagRules.engine || {});
  fields.truck.value = formatNameColorList(boardData.rolePools.truck, colorRules.truck || {}, tagRules.truck || {});
  fields.ovm.value = formatNameColorList(boardData.rolePools.ovm, colorRules.ovm || {}, tagRules.ovm || {});
  fields.command13.value = formatNameColorList(boardData.command13Members || [], colorRules.command13 || {}, tagRules.command13 || {});
  fields.colorTags.value = formatColorTagList(boardData.colorTags || {});
  fields.calendarTags.value = formatColorTagList(boardData.calendarTags || {});
  fields.shiftStatus.value = formatShiftStatusList(getShiftStatusOptions(boardData), getShiftStatusColors(boardData));
  fields.liveIns.value = (boardData.liveIns || []).join("\n");
}

function readListsFromForm() {
  const colorTags = parseColorTagList(fields.colorTags.value);
  const calendarTags = parseColorTagList(fields.calendarTags.value);
  const apparatusData = parseApparatusList(fields.apparatus.value);
  const shiftStatusData = parseShiftStatusList(fields.shiftStatus.value);
  const activeMemberData = parseNameColorList(fields.activeMembers.value, colorTags);
  const engineDriverData = parseNameColorList(fields.engineDriver.value, colorTags);
  const rescueDriverData = parseNameColorList(fields.rescueDriver.value, colorTags);
  const towerDriverData = parseNameColorList(fields.towerDriver.value, colorTags);
  const officerData = parseNameColorList(fields.officer.value, colorTags);
  const engineData = parseNameColorList(fields.engine.value, colorTags);
  const truckData = parseNameColorList(fields.truck.value, colorTags);
  const ovmData = parseNameColorList(fields.ovm.value, colorTags);
  const command13Data = parseNameColorList(fields.command13.value, colorTags);
  const liveInsData = parseNameList(fields.liveIns.value);
  return {
    activeMembers: activeMemberData.names,
    colorTags,
    calendarTags,
    apparatusOptions: apparatusData.options,
    apparatusColors: apparatusData.colors,
    shiftStatuses: shiftStatusData.statuses,
    shiftStatusColors: shiftStatusData.colors,
    rolePools: {
      engineDriver: engineDriverData.names,
      rescueDriver: rescueDriverData.names,
      towerDriver: towerDriverData.names,
      officer: officerData.names,
      engine: engineData.names,
      truck: truckData.names,
      nozzleBackupSupport: engineData.names,
      barCan: truckData.names,
      ovm: ovmData.names,
      roof: truckData.names
    },
    command13Members: command13Data.names,
    liveIns: liveInsData,
    colorRules: {
      activeMembers: activeMemberData.colors,
      engineDriver: engineDriverData.colors,
      rescueDriver: rescueDriverData.colors,
      towerDriver: towerDriverData.colors,
      officer: officerData.colors,
      engine: engineData.colors,
      truck: truckData.colors,
      nozzleBackupSupport: engineData.colors,
      barCan: truckData.colors,
      ovm: ovmData.colors,
      roof: truckData.colors,
      command13: command13Data.colors
    },
    tagRules: {
      activeMembers: activeMemberData.tags,
      engineDriver: engineDriverData.tags,
      rescueDriver: rescueDriverData.tags,
      towerDriver: towerDriverData.tags,
      officer: officerData.tags,
      engine: engineData.tags,
      truck: truckData.tags,
      nozzleBackupSupport: engineData.tags,
      barCan: truckData.tags,
      ovm: ovmData.tags,
      roof: truckData.tags,
      command13: command13Data.tags
    }
  };
}

function showStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("save-status--error", isError);
}

function canEditManageSite() {
  return Boolean(window.station13EditLock?.canEdit());
}

saveButton.addEventListener("click", () => {
  if (!canEditManageSite()) {
    showStatus("Admin unlock required to save Manage Site changes.", true);
    return;
  }

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
  if (!canEditManageSite()) {
    showStatus("Admin unlock required to reset Manage Site.", true);
    return;
  }

  const currentData = loadBoardData();
  const resetData = saveBoardData({
    ...DEFAULT_BOARD_DATA,
    assignments: currentData.assignments
  });
  writeListsToForm(resetData);
  showStatus("Lists reset to defaults. Current seat assignments were kept.");
});

async function initManagePage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }
  writeListsToForm(loadBoardData());
}

function isManageFieldActive() {
  const activeElement = document.activeElement;
  return activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
}

let manageRefreshPending = false;

function refreshManageFromPersistence() {
  writeListsToForm(loadBoardData());
  showStatus("Updated from another screen.");
}

window.addEventListener("station13:persistence-updated", (event) => {
  const changedKeys = event.detail?.changedKeys || [];

  if (!changedKeys.includes("boardData")) {
    return;
  }

  if (isManageFieldActive()) {
    manageRefreshPending = true;
    return;
  }

  refreshManageFromPersistence();
});

document.addEventListener("focusout", () => {
  if (!manageRefreshPending) {
    return;
  }

  manageRefreshPending = false;
  window.setTimeout(refreshManageFromPersistence, 0);
});

initManagePage();
