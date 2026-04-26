const fields = {
  activeMembers: document.getElementById("activeMembersInput"),
  engineDriver: document.getElementById("engineDriverInput"),
  rescueDriver: document.getElementById("rescueDriverInput"),
  towerDriver: document.getElementById("towerDriverInput"),
  officer: document.getElementById("officerInput"),
  nozzleBackupSupport: document.getElementById("nozzleBackupSupportInput"),
  barCan: document.getElementById("barCanInput"),
  ovm: document.getElementById("ovmInput"),
  roof: document.getElementById("roofInput"),
  command13: document.getElementById("command13Input"),
  colorTags: document.getElementById("colorTagsInput"),
  liveIns: document.getElementById("liveInsInput")
};

const saveButton = document.getElementById("saveSettingsButton");
const resetButton = document.getElementById("resetSettingsButton");
const saveStatus = document.getElementById("saveStatus");

function writeListsToForm(boardData) {
  const colorRules = boardData.colorRules || {};
  const tagRules = boardData.tagRules || {};
  fields.activeMembers.value = formatNameColorList(boardData.activeMembers, colorRules.activeMembers || {}, tagRules.activeMembers || {});
  fields.engineDriver.value = formatNameColorList(boardData.rolePools.engineDriver, colorRules.engineDriver || {}, tagRules.engineDriver || {});
  fields.rescueDriver.value = formatNameColorList(boardData.rolePools.rescueDriver, colorRules.rescueDriver || {}, tagRules.rescueDriver || {});
  fields.towerDriver.value = formatNameColorList(boardData.rolePools.towerDriver, colorRules.towerDriver || {}, tagRules.towerDriver || {});
  fields.officer.value = formatNameColorList(boardData.rolePools.officer, colorRules.officer || {}, tagRules.officer || {});
  fields.nozzleBackupSupport.value = formatNameColorList(boardData.rolePools.nozzleBackupSupport, colorRules.nozzleBackupSupport || {}, tagRules.nozzleBackupSupport || {});
  fields.barCan.value = formatNameColorList(boardData.rolePools.barCan, colorRules.barCan || {}, tagRules.barCan || {});
  fields.ovm.value = formatNameColorList(boardData.rolePools.ovm, colorRules.ovm || {}, tagRules.ovm || {});
  fields.roof.value = formatNameColorList(boardData.rolePools.roof, colorRules.roof || {}, tagRules.roof || {});
  fields.command13.value = formatNameColorList(boardData.command13Members || [], colorRules.command13 || {}, tagRules.command13 || {});
  fields.colorTags.value = formatColorTagList(boardData.colorTags || {});
  fields.liveIns.value = (boardData.liveIns || []).join("\n");
}

function readListsFromForm() {
  const colorTags = parseColorTagList(fields.colorTags.value);
  const activeMemberData = parseNameColorList(fields.activeMembers.value, colorTags);
  const engineDriverData = parseNameColorList(fields.engineDriver.value, colorTags);
  const rescueDriverData = parseNameColorList(fields.rescueDriver.value, colorTags);
  const towerDriverData = parseNameColorList(fields.towerDriver.value, colorTags);
  const officerData = parseNameColorList(fields.officer.value, colorTags);
  const nozzleData = parseNameColorList(fields.nozzleBackupSupport.value, colorTags);
  const barCanData = parseNameColorList(fields.barCan.value, colorTags);
  const ovmData = parseNameColorList(fields.ovm.value, colorTags);
  const roofData = parseNameColorList(fields.roof.value, colorTags);
  const command13Data = parseNameColorList(fields.command13.value, colorTags);
  const liveInsData = parseNameList(fields.liveIns.value);
  return {
    activeMembers: activeMemberData.names,
    colorTags,
    rolePools: {
      engineDriver: engineDriverData.names,
      rescueDriver: rescueDriverData.names,
      towerDriver: towerDriverData.names,
      officer: officerData.names,
      nozzleBackupSupport: nozzleData.names,
      barCan: barCanData.names,
      ovm: ovmData.names,
      roof: roofData.names
    },
    command13Members: command13Data.names,
    liveIns: liveInsData,
    colorRules: {
      activeMembers: activeMemberData.colors,
      engineDriver: engineDriverData.colors,
      rescueDriver: rescueDriverData.colors,
      towerDriver: towerDriverData.colors,
      officer: officerData.colors,
      nozzleBackupSupport: nozzleData.colors,
      barCan: barCanData.colors,
      ovm: ovmData.colors,
      roof: roofData.colors,
      command13: command13Data.colors
    },
    tagRules: {
      activeMembers: activeMemberData.tags,
      engineDriver: engineDriverData.tags,
      rescueDriver: rescueDriverData.tags,
      towerDriver: towerDriverData.tags,
      officer: officerData.tags,
      nozzleBackupSupport: nozzleData.tags,
      barCan: barCanData.tags,
      ovm: ovmData.tags,
      roof: roofData.tags,
      command13: command13Data.tags
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
