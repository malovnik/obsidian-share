(() => {
  const article = document.querySelector(".markdown-body");
  const page = document.querySelector("[data-article-id]");
  const progress = document.querySelector("[data-reading-progress]");
  const articleId = page?.dataset.articleId || location.pathname;
  const storageKey = "reading-positions";

  if (page?.dataset.trackView === "1" && page.dataset.articleId) {
    const viewDay = new Date().toISOString().slice(0, 10);
    const viewKey = `obsidian-share:view:${page.dataset.articleId}:${viewDay}`;
    if (localStorage.getItem(viewKey) !== "1") {
      fetch(`/api/v1/views/${encodeURIComponent(page.dataset.articleId)}`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      })
        .then((response) => response.ok ? response.json() : null)
        .then((result) => {
          if (!result || !Number.isFinite(result.viewCount)) return;
          localStorage.setItem(viewKey, "1");
          const counter = document.querySelector("[data-view-count]");
          if (counter) counter.textContent = `${result.viewCount} просмотров`;
        })
        .catch(() => {});
    }
  }

  document.querySelectorAll(".markdown-body pre").forEach((block) => {
    const code = block.querySelector("code");
    if (!code) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.textContent = "Копировать код";
    button.setAttribute("aria-label", "Копировать код");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent || "");
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Код скопирован");
      } catch {
        button.setAttribute("aria-label", "Не удалось скопировать");
      }
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        button.setAttribute("aria-label", "Копировать код");
      }, 1600);
    });
    block.append(button);
  });

  const slugify = (text, index) => {
    const normalized = text
      .toLocaleLowerCase("ru")
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return normalized || `heading-${index}`;
  };

  const toc = document.querySelector("[data-table-of-contents]");
  const tocList = toc?.querySelector("ul");
  const headings = article ? [...article.querySelectorAll("h1, h2, h3")] : [];
  const usedIds = new Set();
  if (toc && tocList && headings.length > 0) {
    headings.forEach((heading, index) => {
      let id = heading.id || slugify(heading.textContent || "", index);
      while (usedIds.has(id)) id = `${id}-${index}`;
      usedIds.add(id);
      heading.id = id;
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.dataset.level = heading.tagName.slice(1);
      link.textContent = heading.textContent || "";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
      });
      item.append(link);
      tocList.append(item);
    });
    toc.hidden = false;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      tocList.querySelectorAll("a").forEach((link) => {
        link.classList.toggle("is-active", link.hash === `#${visible.target.id}`);
      });
    }, { rootMargin: "-80px 0px -60% 0px", threshold: 0 });
    headings.forEach((heading) => observer.observe(heading));
  }

  const readPositions = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const positions = readPositions();
  const savedPercent = Number(positions[articleId] || 0);
  if (savedPercent > 5 && savedPercent < 95) {
    const resume = document.createElement("div");
    resume.className = "reading-resume";
    resume.innerHTML = `
      <button class="reading-resume-main" type="button">
        <span>Продолжить чтение</span><span>${savedPercent}%</span>
      </button>
      <button class="reading-resume-close" type="button" aria-label="Закрыть">x</button>
    `;
    resume.querySelector(".reading-resume-main")?.addEventListener("click", () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: (savedPercent / 100) * height, behavior: "smooth" });
      resume.remove();
    });
    resume.querySelector(".reading-resume-close")?.addEventListener("click", () => resume.remove());
    document.body.append(resume);
  }

  let ticking = false;
  const updateReadingState = () => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const percent = height > 0 ? Math.max(0, Math.min(100, Math.round((window.scrollY / height) * 100))) : 0;
    if (progress) progress.style.width = `${percent}%`;
    const next = readPositions();
    next[articleId] = percent;
    const entries = Object.entries(next);
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries.slice(-50))));
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateReadingState);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  updateReadingState();
})();
