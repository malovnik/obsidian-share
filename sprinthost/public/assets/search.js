(() => {
  const inputs = [...document.querySelectorAll("[data-search-input]")];
  const cards = [...document.querySelectorAll("[data-search-card]")];
  const tagButtons = [...document.querySelectorAll("[data-tag-filter]")];
  const empty = document.querySelector("[data-search-empty]");
  const count = document.querySelector("[data-result-count]");
  const sentinel = document.querySelector("[data-feed-sentinel]");
  const toggle = document.querySelector("[data-header-search-toggle]");
  const panel = document.querySelector("[data-header-search-panel]");
  const activeTags = new Set();
  const batchSize = 12;
  let visibleLimit = batchSize;
  let query = "";

  const label = (value) => {
    const mod10 = value % 10;
    const mod100 = value % 100;
    const noun = mod10 === 1 && mod100 !== 11
      ? "статья"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "статьи"
        : "статей";
    return `${value} ${noun}`;
  };

  const applyFilters = () => {
    const filtering = query !== "" || activeTags.size !== 0;
    let matched = 0;
    cards.forEach((card) => {
      const searchText = card.textContent.toLocaleLowerCase("ru");
      const tags = new Set((card.dataset.tags || "").split("|").filter(Boolean));
      const matchesText = query === "" || searchText.includes(query);
      const matchesTags = [...activeTags].every((tag) => tags.has(tag));
      const matches = matchesText && matchesTags;
      const withinFeed = filtering || matched < visibleLimit;
      card.hidden = !matches || !withinFeed;
      if (matches) matched += 1;
    });
    if (empty) empty.hidden = matched !== 0;
    if (sentinel) sentinel.hidden = filtering || visibleLimit >= matched;
    if (count) {
      count.textContent = filtering
        ? label(matched)
        : visibleLimit >= matched
          ? "Все заметки загружены"
          : `Показано ${Math.min(visibleLimit, matched)} из ${label(matched)}`;
    }
  };

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      query = input.value.trim().toLocaleLowerCase("ru");
      if (query === "") visibleLimit = batchSize;
      inputs.forEach((peer) => {
        if (peer !== input && peer.value !== input.value) peer.value = input.value;
      });
      applyFilters();
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tagFilter;
      if (!tag) return;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        button.classList.remove("is-active");
      } else {
        activeTags.add(tag);
        button.classList.add("is-active");
      }
      button.setAttribute("aria-pressed", activeTags.has(tag) ? "true" : "false");
      if (activeTags.size === 0 && query === "") visibleLimit = batchSize;
      applyFilters();
    });
  });

  const closeHeaderSearch = () => {
    if (!toggle || !panel) return;
    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
  };

  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const opening = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", opening ? "true" : "false");
      panel.classList.toggle("is-open", opening);
      if (opening) {
        window.setTimeout(() => panel.querySelector("input")?.focus(), 100);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeHeaderSearch();
    });
  }

  if (sentinel && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visibleLimit += batchSize;
      applyFilters();
    }, { rootMargin: "400px 0px" });
    observer.observe(sentinel);
  } else {
    visibleLimit = cards.length;
  }

  applyFilters();
})();
