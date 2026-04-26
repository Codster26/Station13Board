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

async function initManagePage() {
  if (window.storageService) {
    await window.storageService.initializePersistence();
  }
  writeListsToForm(loadBoardData());
}

initManagePage();
