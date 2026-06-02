(() => {
  let comboboxCount = 0;
  let openCombobox = null;

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
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    if (ariaLabel) {
      input.setAttribute("aria-label", ariaLabel);
    }

    const listbox = document.createElement("div");
    const listId = `station13-combobox-${comboboxCount += 1}`;
    listbox.id = listId;
    listbox.className = "search-combobox-list";
    listbox.setAttribute("role", "listbox");
    listbox.hidden = true;
    input.setAttribute("aria-controls", listId);

    root.appendChild(input);

    let normalizedOptions = [];
    let optionMap = new Map();
    let committedValue = "";
    let activeIndex = -1;
    let visibleOptions = [];
    let isOpen = false;

    function isEditingLocked() {
      return window.station13EditLock && !window.station13EditLock.canEdit();
    }

    function positionList() {
      if (!isOpen) {
        return;
      }

      const rect = input.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom - 8;
      const availableAbove = rect.top - 8;
      const listHeight = Math.min(280, Math.max(120, Math.max(availableBelow, availableAbove)));
      const opensAbove = availableBelow < 160 && availableAbove > availableBelow;
      const minWidth = input.classList.contains("out-service-input--member") ? 250 : 90;

      listbox.style.left = `${Math.max(4, rect.left)}px`;
      listbox.style.width = `${Math.max(minWidth, rect.width)}px`;
      listbox.style.maxHeight = `${listHeight}px`;
      listbox.style.top = opensAbove ? "auto" : `${rect.bottom + 3}px`;
      listbox.style.bottom = opensAbove ? `${window.innerHeight - rect.top + 3}px` : "auto";
    }

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

    function closeList() {
      isOpen = false;
      activeIndex = -1;
      listbox.hidden = true;
      listbox.innerHTML = "";
      listbox.remove();
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      window.removeEventListener("resize", positionList);
      window.removeEventListener("scroll", positionList, true);
      if (openCombobox === closeList) {
        openCombobox = null;
      }
    }

    function setActiveOption(nextIndex) {
      const optionNodes = Array.from(listbox.querySelectorAll(".search-combobox-option"));
      activeIndex = optionNodes.length ? ((nextIndex % optionNodes.length) + optionNodes.length) % optionNodes.length : -1;

      optionNodes.forEach((node, index) => {
        const isActive = index === activeIndex;
        node.classList.toggle("search-combobox-option--active", isActive);
        node.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) {
          input.setAttribute("aria-activedescendant", node.id);
          node.scrollIntoView({ block: "nearest" });
        }
      });

      if (activeIndex < 0) {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function clearActiveOption() {
      activeIndex = -1;
      Array.from(listbox.querySelectorAll(".search-combobox-option")).forEach((node) => {
        node.classList.remove("search-combobox-option--active");
        node.setAttribute("aria-selected", "false");
      });
      input.removeAttribute("aria-activedescendant");
    }

    function getFilteredOptions(query, showAll = false) {
      const normalizedQuery = String(query || "").trim().toLowerCase();
      if (showAll || !normalizedQuery) {
        return normalizedOptions;
      }

      return normalizedOptions.filter((optionValue) => optionValue.toLowerCase().includes(normalizedQuery));
    }

    function renderList(query = "", showAll = false, activateFirst = false) {
      visibleOptions = getFilteredOptions(query, showAll);
      listbox.innerHTML = "";

      if (!visibleOptions.length) {
        const empty = document.createElement("div");
        empty.className = "search-combobox-empty";
        empty.textContent = "No matches";
        listbox.appendChild(empty);
        activeIndex = -1;
        input.removeAttribute("aria-activedescendant");
        return;
      }

      visibleOptions.forEach((optionValue, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.id = `${listId}-option-${index}`;
        option.className = "search-combobox-option";
        option.setAttribute("role", "option");
        option.textContent = optionValue;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        option.addEventListener("click", () => {
          commit(optionValue, true);
          closeList();
          input.focus();
          input.select();
        });
        listbox.appendChild(option);
      });

      if (activateFirst) {
        setActiveOption(0);
      } else {
        clearActiveOption();
      }
    }

    function openList({ showAll = false, activateFirst = false } = {}) {
      if (isEditingLocked()) {
        return;
      }

      if (openCombobox && openCombobox !== closeList) {
        openCombobox();
      }

      openCombobox = closeList;
      isOpen = true;
      if (!listbox.isConnected) {
        document.body.appendChild(listbox);
      }
      listbox.hidden = false;
      input.setAttribute("aria-expanded", "true");
      renderList(input.value, showAll, activateFirst);
      positionList();
      window.addEventListener("resize", positionList);
      window.addEventListener("scroll", positionList, true);
    }

    function setOptions(nextOptions) {
      normalizedOptions = dedupeOptions(nextOptions);
      optionMap = buildOptionMap(normalizedOptions);
      if (isOpen) {
        renderList(input.value, false, activeIndex >= 0);
      }
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
      if (isEditingLocked()) {
        input.value = committedValue;
        return;
      }

      const rawValue = input.value.trim();
      if (!rawValue) {
        commit("", true);
        openList({ showAll: true, activateFirst: true });
        return;
      }

      openList({ activateFirst: true });
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        commit(input.value, true);
        closeList();
      }, 0);
    });

    input.addEventListener("focus", () => {
      if (isEditingLocked()) {
        input.blur();
        return;
      }

      input.select();
      openList({ showAll: true });
    });

    input.addEventListener("click", () => {
      if (isEditingLocked()) {
        input.blur();
        return;
      }

      input.select();
      openList({ showAll: true });
    });

    input.addEventListener("keydown", (event) => {
      if (isEditingLocked()) {
        event.preventDefault();
        input.value = committedValue;
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!isOpen) {
          openList({ showAll: true });
          return;
        }
        setActiveOption(activeIndex < 0 ? 0 : activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) {
          openList({ showAll: true });
          return;
        }
        setActiveOption(activeIndex < 0 ? visibleOptions.length - 1 : activeIndex - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (isOpen && activeIndex >= 0 && visibleOptions[activeIndex]) {
          commit(visibleOptions[activeIndex], true);
        } else {
          commit(input.value, true);
        }
        closeList();
        input.select();
      } else if (event.key === "Tab") {
        commit(input.value, true);
        closeList();
      } else if (event.key === "Escape") {
        input.value = committedValue;
        closeList();
        input.blur();
      }
    });

    setOptions(options);
    setValue(value, false);

    return {
      root,
      input,
      datalist: listbox,
      listbox,
      setOptions,
      setValue,
      getValue: () => committedValue,
      commit: () => commit(input.value, true)
    };
  };

  document.addEventListener("mousedown", (event) => {
    if (!openCombobox || event.target.closest(".search-combobox") || event.target.closest(".search-combobox-list")) {
      return;
    }

    openCombobox();
  });
})();
