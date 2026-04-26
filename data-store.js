const BOARD_STORAGE_KEY = "station13-riding-board-data";
const OPEN_ASSIGNMENT = "Open Assignment";

const DEFAULT_BOARD_DATA = {
  colorRulesVersion: 2,
  activeMembers: [
    "Arroyave, J.",
    "Bates, J.",
    "Boroi, T.",
    "Breslin, E.",
    "Budd, C.",
    "Buddy, T.",
    "Campbell, K.",
    "Carney, D.",
    "Conlin, P.",
    "Cripps, N.",
    "Day, K.",
    "Delgado, J.",
    "Delvalle, J.",
    "Demareski, P.",
    "Dias, N.",
    "DiCristofaro, T.",
    "Dinsmore, E.",
    "Elder, M.",
    "Fard, A.",
    "Ferguson, M.",
    "Golden, A.",
    "Grant, T.",
    "Greipp, R.",
    "Haley, E.",
    "Harris Jr, B.",
    "Harris, B.",
    "Harris, M.",
    "Hassel, E.",
    "Hassel, M.",
    "Hassel, P.",
    "Hill, N.",
    "Hollis, S.",
    "Hopkins, W.",
    "Irhin, N.",
    "Kline, A.",
    "Laird, T.",
    "Lehman, J.",
    "Lippert, R.",
    "MacCormac, W.",
    "Marsico, B.",
    "Mathews, C.",
    "May, J.",
    "McCarthy, D.",
    "McCarthy, K.",
    "McCarthy, P.",
    "Morgan, T.",
    "Newton, C.",
    "Ofori, K.",
    "Olson, A.",
    "Patterson, B.",
    "Pinto, M.",
    "Plotts, G.",
    "Powers, M.",
    "Reinke, M.",
    "Reinman, G.",
    "Repine, C.",
    "Rovner, G.",
    "Ricciuti, A.",
    "Richards, C. III",
    "Ryen, R.",
    "Sampson, J.",
    "Santini, A.",
    "Simon, J.",
    "Smith, B.",
    "Stamp, N.",
    "Stoltzfus, J.",
    "Straub, M.",
    "Tanler, K.",
    "Trauger, R.",
    "Villon, C.",
    "Weaver, M.",
    "Wright, B."
  ],
  rolePools: {
    engineDriver: [
      "Boroi, T.",
      "Budd, C.",
      "Buddy, T.",
      "Carney, D.",
      "Conlin, P.",
      "Cripps, N.",
      "DiCristofaro, T.",
      "Elder, M.",
      "Ferguson, M.",
      "Golden, A.",
      "Grant, T.",
      "Haley, E.",
      "Harris, B.",
      "Harris, M.",
      "Hassel, E.",
      "Hassel, P.",
      "Hollis, S.",
      "Hopkins, W.",
      "Irhin, N.",
      "Kline, A.",
      "Laird, T.",
      "Lippert, R.",
      "MacCormac, W.",
      "May, J.",
      "McCarthy, P.",
      "Morgan, T.",
      "Ofori, K.",
      "Patterson, B.",
      "Plotts, G.",
      "Powers, M.",
      "Repine, C.",
      "Straub, M.",
      "Trauger, R.",
      "Weaver, M.",
      "Wright, B."
    ],
    rescueDriver: [
      "Boroi, T.",
      "Budd, C.",
      "Buddy, T.",
      "Carney, D.",
      "Conlin, P.",
      "Cripps, N.",
      "DiCristofaro, T.",
      "Elder, M.",
      "Ferguson, M.",
      "Golden, A.",
      "Haley, E.",
      "Harris, B.",
      "Harris, M.",
      "Hassel, E.",
      "Hassel, P.",
      "Hollis, S.",
      "Hopkins, W.",
      "Irhin, N.",
      "Kline, A.",
      "Lippert, R.",
      "MacCormac, W.",
      "McCarthy, P.",
      "Morgan, T.",
      "Patterson, B.",
      "Plotts, G.",
      "Powers, M.",
      "Repine, C.",
      "Trauger, R.",
      "Weaver, M.",
      "Wright, B."
    ],
    towerDriver: [
      "Boroi, T.",
      "Budd, C.",
      "Cripps, N.",
      "DiCristofaro, T.",
      "Ferguson, M.",
      "Haley, E.",
      "Harris, M.",
      "Hassel, E.",
      "Hassel, P.",
      "Irhin, N.",
      "Kline, A.",
      "MacCormac, W.",
      "Morgan, T.",
      "Plotts, G.",
      "Powers, M.",
      "Repine, C.",
      "Trauger, R.",
      "Weaver, M.",
      "Wright, B."
    ],
    officer: [
      "Boroi, T.",
      "Budd, C.",
      "Buddy, T.",
      "Carney, D.",
      "Conlin, P.",
      "Cripps, N.",
      "Demareski, P.",
      "Ferguson, M.",
      "Golden, A.",
      "Haley, E.",
      "Harris, B.",
      "Harris, M.",
      "Hassel, E.",
      "Hollis, S.",
      "Irhin, N.",
      "Kline, A.",
      "Lippert, R.",
      "MacCormac, W.",
      "McCarthy, K.",
      "Mathews, C.",
      "May, J.",
      "Morgan, T.",
      "Newton, C.",
      "Ofori, K.",
      "Pinto, M.",
      "Powers, M.",
      "Repine, C.",
      "Richards, C. III",
      "Santini, A.",
      "Simon, J.",
      "Straub, M.",
      "Tanler, K.",
      "Trauger, R.",
      "Weaver, M.",
      "Wright, B."
    ],
    nozzleBackupSupport: [
      "Arroyave, J.",
      "Bates, J.",
      "Boroi, T.",
      "Breslin, E.",
      "Budd, C.",
      "Buddy, T.",
      "Campbell, K.",
      "Carney, D.",
      "Conlin, P.",
      "Cripps, N.",
      "Day, K.",
      "Delgado, J.",
      "Delvalle, J.",
      "Demareski, P.",
      "Dias, N.",
      "DiCristofaro, T.",
      "Dinsmore, E.",
      "Elder, M.",
      "Fard, A.",
      "Ferguson, M.",
      "Golden, A.",
      "Grant, T.",
      "Greipp, R.",
      "Haley, E.",
      "Harris Jr, B.",
      "Harris, B.",
      "Harris, M.",
      "Hassel, E.",
      "Hassel, M.",
      "Hassel, P.",
      "Hill, N.",
      "Hollis, S.",
      "Hopkins, W.",
      "Irhin, N.",
      "Kline, A.",
      "Laird, T.",
      "Lehman, J.",
      "Lippert, R.",
      "MacCormac, W.",
      "Marsico, B.",
      "Mathews, C.",
      "May, J.",
      "McCarthy, D.",
      "McCarthy, K.",
      "McCarthy, P.",
      "Morgan, T.",
      "Newton, C.",
      "Ofori, K.",
      "Olson, A.",
      "Patterson, B.",
      "Pinto, M.",
      "Plotts, G.",
      "Powers, M.",
      "Reinke, M.",
      "Reinman, G.",
      "Repine, C.",
      "Rovner, G.",
      "Ricciuti, A.",
      "Richards, C. III",
      "Ryen, R.",
      "Sampson, J.",
      "Santini, A.",
      "Simon, J.",
      "Smith, B.",
      "Stamp, N.",
      "Stoltzfus, J.",
      "Straub, M.",
      "Tanler, K.",
      "Trauger, R.",
      "Villon, C.",
      "Weaver, M.",
      "Wright, B."
    ],
    barOvmCanRoof: [
      "Arroyave, J.",
      "Bates, J.",
      "Boroi, T.",
      "Breslin, E.",
      "Budd, C.",
      "Buddy, T.",
      "Campbell, K.",
      "Carney, D.",
      "Conlin, P.",
      "Cripps, N.",
      "Day, K.",
      "Delgado, J.",
      "Delvalle, J.",
      "Demareski, P.",
      "Dias, N.",
      "DiCristofaro, T.",
      "Dinsmore, E.",
      "Elder, M.",
      "Fard, A.",
      "Ferguson, M.",
      "Golden, A.",
      "Grant, T.",
      "Greipp, R.",
      "Haley, E.",
      "Harris Jr, B.",
      "Harris, B.",
      "Harris, M.",
      "Hassel, E.",
      "Hassel, M.",
      "Hassel, P.",
      "Hill, N.",
      "Hollis, S.",
      "Hopkins, W.",
      "Irhin, N.",
      "Kline, A.",
      "Laird, T.",
      "Lehman, J.",
      "Lippert, R.",
      "MacCormac, W.",
      "Marsico, B.",
      "Mathews, C.",
      "May, J.",
      "McCarthy, D.",
      "McCarthy, K.",
      "McCarthy, P.",
      "Morgan, T.",
      "Newton, C.",
      "Ofori, K.",
      "Olson, A.",
      "Patterson, B.",
      "Pinto, M.",
      "Plotts, G.",
      "Powers, M.",
      "Reinke, M.",
      "Reinman, G.",
      "Repine, C.",
      "Rovner, G.",
      "Ricciuti, A.",
      "Richards, C. III",
      "Ryen, R.",
      "Sampson, J.",
      "Santini, A.",
      "Simon, J.",
      "Smith, B.",
      "Stamp, N.",
      "Stoltzfus, J.",
      "Straub, M.",
      "Tanler, K.",
      "Trauger, R.",
      "Villon, C.",
      "Weaver, M.",
      "Wright, B."
    ]
  },
  command13Members: [
    "Budd, C. - Deputy Chief",
    "Cripps, N. - Asst Chief",
    "Haley, E. - Past Chief",
    "Harris, B. - Past Chief",
    "Harris, M. - Fire Chief",
    "Hassel, Ed - Past Chief"
  ],
  liveIns: [
    "Conlin, P.",
    "Cripps, N.",
    "Delvalle, J.",
    "Greipp, R.",
    "Hill, N.",
    "Hollis, S.",
    "Kline, A.",
    "MacCormac, W.",
    "Marsico, B.",
    "May, J.",
    "Newton, C.",
    "Ofori, K.",
    "Stamp, N.",
    "Straub, M."
  ],
  colorTags: {},
  colorRules: {
    activeMembers: {},
    engineDriver: {},
    rescueDriver: {},
    towerDriver: {},
    officer: {},
    nozzleBackupSupport: {},
    barOvmCanRoof: {},
    command13: {},
    liveIns: {}
  },
  tagRules: {
    activeMembers: {},
    engineDriver: {},
    rescueDriver: {},
    towerDriver: {},
    officer: {},
    nozzleBackupSupport: {},
    barOvmCanRoof: {},
    command13: {}
  },
  assignments: {}
};

function uniqueNames(names) {
  const seen = new Set();
  const result = [];
  names.forEach((name) => {
    const cleaned = String(name || "").trim();
    if (!cleaned || seen.has(cleaned)) {
      return;
    }
    seen.add(cleaned);
    result.push(cleaned);
  });
  return result;
}

function mergeWithDefaults(stored) {
  const hasStoredActiveMembers = Array.isArray(stored?.activeMembers);
  const storedActiveMembers = hasStoredActiveMembers ? stored.activeMembers : [];
  const colorRulesVersion = Number(stored?.colorRulesVersion || 0);
  const legacySharedColors = colorRulesVersion < 2;

  return {
    colorRulesVersion: DEFAULT_BOARD_DATA.colorRulesVersion,
    activeMembers: uniqueNames(hasStoredActiveMembers ? storedActiveMembers : DEFAULT_BOARD_DATA.activeMembers),
    rolePools: {
      engineDriver: uniqueNames(stored?.rolePools?.engineDriver || DEFAULT_BOARD_DATA.rolePools.engineDriver),
      rescueDriver: uniqueNames(stored?.rolePools?.rescueDriver || DEFAULT_BOARD_DATA.rolePools.rescueDriver),
      towerDriver: uniqueNames(stored?.rolePools?.towerDriver || DEFAULT_BOARD_DATA.rolePools.towerDriver),
      officer: uniqueNames(stored?.rolePools?.officer || DEFAULT_BOARD_DATA.rolePools.officer),
      nozzleBackupSupport: uniqueNames(stored?.rolePools?.nozzleBackupSupport || DEFAULT_BOARD_DATA.rolePools.nozzleBackupSupport),
      barOvmCanRoof: uniqueNames(stored?.rolePools?.barOvmCanRoof || DEFAULT_BOARD_DATA.rolePools.barOvmCanRoof)
    },
    command13Members: uniqueNames(stored?.command13Members || DEFAULT_BOARD_DATA.command13Members),
    liveIns: uniqueNames(stored?.liveIns || DEFAULT_BOARD_DATA.liveIns),
    colorTags: { ...(stored?.colorTags || DEFAULT_BOARD_DATA.colorTags) },
    colorRules: {
      activeMembers: legacySharedColors ? {} : { ...(stored?.colorRules?.activeMembers || {}) },
      engineDriver: { ...(stored?.colorRules?.engineDriver || {}) },
      rescueDriver: { ...(stored?.colorRules?.rescueDriver || {}) },
      towerDriver: { ...(stored?.colorRules?.towerDriver || {}) },
      officer: { ...(stored?.colorRules?.officer || {}) },
      nozzleBackupSupport: { ...(stored?.colorRules?.nozzleBackupSupport || {}) },
      barOvmCanRoof: { ...(stored?.colorRules?.barOvmCanRoof || {}) },
      command13: { ...(stored?.colorRules?.command13 || {}) },
      liveIns: { ...(stored?.colorRules?.liveIns || {}) }
    },
    tagRules: {
      activeMembers: { ...(stored?.tagRules?.activeMembers || {}) },
      engineDriver: { ...(stored?.tagRules?.engineDriver || {}) },
      rescueDriver: { ...(stored?.tagRules?.rescueDriver || {}) },
      towerDriver: { ...(stored?.tagRules?.towerDriver || {}) },
      officer: { ...(stored?.tagRules?.officer || {}) },
      nozzleBackupSupport: { ...(stored?.tagRules?.nozzleBackupSupport || {}) },
      barOvmCanRoof: { ...(stored?.tagRules?.barOvmCanRoof || {}) },
      command13: { ...(stored?.tagRules?.command13 || {}) }
    },
    assignments: { ...(stored?.assignments || {}) }
  };
}

function loadBoardData() {
  const stored = window.storageService
    ? window.storageService.loadValue("boardData", DEFAULT_BOARD_DATA)
    : (() => {
        try {
          const raw = localStorage.getItem(BOARD_STORAGE_KEY);
          return raw ? JSON.parse(raw) : DEFAULT_BOARD_DATA;
        } catch (error) {
          return DEFAULT_BOARD_DATA;
        }
      })();
  return mergeWithDefaults(stored || DEFAULT_BOARD_DATA);
}

function saveBoardData(data) {
  const normalized = mergeWithDefaults(data);
  if (window.storageService) {
    window.storageService.saveValue("boardData", normalized);
  } else {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function parseNameList(text) {
  return uniqueNames(
    String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function parseNameColorList(text, colorTags = {}) {
  const names = [];
  const colors = {};
  const tags = {};

  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(" - ");
      let name = line;
      let suffix = "";

      if (parts.length > 1) {
        const possibleSuffix = parts[parts.length - 1].trim();
        if (/^#[0-9a-fA-F]{6}$/.test(possibleSuffix) || colorTags[possibleSuffix]) {
          suffix = possibleSuffix;
          name = parts.slice(0, -1).join(" - ").trim();
        }
      }

      if (!name) {
        return;
      }
      names.push(name);
      if (/^#[0-9a-fA-F]{6}$/.test(suffix)) {
        colors[name] = suffix;
      } else if (suffix && colorTags[suffix]) {
        colors[name] = colorTags[suffix];
        tags[name] = suffix;
      }
    });

  return {
    names: uniqueNames(names),
    colors,
    tags
  };
}

function parseColorTagList(text) {
  const colorTags = {};

  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^(#[0-9a-fA-F]{6})\s*-\s*(.+)$/);
      if (!match) {
        return;
      }
      const color = match[1].trim();
      const label = match[2].trim();
      if (!label) {
        return;
      }
      colorTags[label] = color;
    });

  return colorTags;
}

function formatColorTagList(colorTags) {
  return Object.entries(colorTags || {})
    .map(([label, color]) => `${color} - ${label}`)
    .join("\n");
}

function formatNameColorList(names, colorMap, tagMap = {}) {
  return (names || [])
    .map((name) => {
      const tag = tagMap?.[name];
      const color = colorMap?.[name];
      if (tag) {
        return `${name} - ${tag}`;
      }
      return color ? `${name} - ${color}` : name;
    })
    .join("\n");
}

function getReadableTextColor(hexColor) {
  const hex = String(hexColor || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#eff4fb";
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
  return luminance > 160 ? "#111111" : "#eff4fb";
}
