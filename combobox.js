(() => {
  let comboboxCount = 0;

  function dedupeOptions(options) {
    const seen = new Set();
    return (options || []).reduce((result, value) => {
      if (value === undefined || value === null) {
        return result;
      }

      const text = String(value).trim();
      if (!text) {
        return result;
      }

      const key = text.toLowerCase();
      if (seen.has(key)) {
        return result;
      }

      seen.add(key);
      result.push(text);
      return result;
    }, []);
  }

  function buildOptionMap(options) {
    return new Map(options.map((option) => [option.toLowerCase(), option]));
  }

  window.createSearchCombobox = function createSearchCombobox({
    className = "",
    options = [],
    value = "",
    placeholder = "",
    allowCustom = false,
    ariaLabel = "",
    onCommit = () => {}
  } = {}) {
    const root = document.createElement("div");
    root.className = "search-combobox";

    const input = document.createElement("input");
    input.type = "text";
    input.className = className;
    input.placeholder = placeholder;
    input.spellcheck = false;
    input.autocomplete = "off";
    if (ariaLabel) {
      input.setAttribute("aria-label", ariaLabel);
    }

    const datalist = document.createElement("datalist");
    const listId = `station13-combobox-${comboboxCount += 1}`;
    datalist.id = listId;
    input.setAttribute("list", listId);

    root.appendChild(input);
    root.appendChild(datalist);

    let normalizedOptions = [];
    let optionMap = new Map();
    let committedValue = "";

    function canonicalize(rawValue, fallbackValue = "") {
      const trimmedValue = String(rawValue || "").trim();
      if (!trimmedValue) {
        return "";
      }

      const matchedValue = optionMap.get(trimmedValue.toLowerCase());
      if (matchedValue) {
        return matchedValue;
      }

      return allowCustom ? trimmedValue : fallbackValue;
    }

    function renderOptions() {
      datalist.innerHTML = "";
      normalizedOptions.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        datalist.appendChild(option);
      });
    }

    function setOptions(nextOptions) {
      normalizedOptions = dedupeOptions(nextOptions);
      optionMap = buildOptionMap(normalizedOptions);
      renderOptions();
    }

    function commit(rawValue = input.value, shouldNotify = true) {
      const canonicalValue = canonicalize(rawValue, committedValue);
      input.value = canonicalValue;

      if (canonicalValue === committedValue) {
        return canonicalValue;
      }

      committedValue = canonicalValue;
      if (shouldNotify) {
        onCommit(canonicalValue, input);
      }
      return canonicalValue;
    }

    function setValue(nextValue, shouldNotify = false) {
      committedValue = canonicalize(nextValue);
      input.value = committedValue;
      if (shouldNotify) {
        onCommit(committedValue, input);
      }
    }

    input.addEventListener("input", () => {
      const rawValue = input.value.trim();
      if (!rawValue) {
        commit("", true);
        return;
      }

      const matchedValue = optionMap.get(rawValue.toLowerCase());
      if (matchedValue) {
        commit(matchedValue, true);
      }
    });

    input.addEventListener("change", () => {
      commit(input.value, true);
    });

    input.addEventListener("blur", () => {
      commit(input.value, true);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = committedValue;
        input.blur();
      }
    });

    setOptions(options);
    setValue(value, false);

    return {
      root,
      input,
      datalist,
      setOptions,
      setValue,
      getValue: () => committedValue,
      commit: () => commit(input.value, true)
    };
  };
})();
