(() => {
  "use strict";

  const STORAGE_KEY = "dream-vessel.v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pad = (number) => String(number).padStart(2, "0");

  const materials = {
    porcelain: {
      cn: "瓷",
      en: "PORCELAIN",
      label: "瓷 · PORCELAIN",
      line: "“温润、克制。适合那些需要被轻轻保护的愿望。”",
      echo: "瓷会替愿望挡住时间的磕碰，却不会替你抹去它原本的纹理。"
    },
    glass: {
      cn: "玻璃",
      en: "GLASS",
      label: "玻璃 · GLASS",
      line: "“透明、清醒。让愿望保留它最初的样子。”",
      echo: "玻璃没有替你改变什么，它只是让最初的那句话，仍然清楚可见。"
    },
    wood: {
      cn: "木",
      en: "WOOD",
      label: "木 · WOOD",
      line: "“有纹理，也会生长。适合仍在变化中的愿望。”",
      echo: "木会随着时间留下纹路。那些没有按原样发生的事，也许正在长成另一种可能。"
    },
    metal: {
      cn: "金属",
      en: "METAL",
      label: "金属 · METAL",
      line: "“坚固、长久。留给那些值得穿越漫长时间的约定。”",
      echo: "金属没有让时间变轻，它只是证明，有些愿望值得被认真保存很久。"
    }
  };

  const state = {
    screen: "home",
    draft: {
      title: "",
      message: "",
      material: "porcelain",
      unlockDate: ""
    },
    bottles: [],
    activeBottleId: null,
    demo: false,
    sound: true,
    activeEcho: [],
    sealing: false
  };

  const refs = {
    header: $("#siteHeader"),
    cursorLight: $("#cursorLight"),
    starfield: $("#starfield"),
    navCount: $("#navCount"),
    homeLibraryCount: $("#homeLibraryCount"),
    dreamTitle: $("#dreamTitle"),
    dreamMessage: $("#dreamMessage"),
    charCount: $("#charCount"),
    composeNext: $("#composeNext"),
    materialBottle: $("#materialBottle"),
    selectedMaterialName: $("#selectedMaterialName"),
    selectedMaterialLine: $("#selectedMaterialLine"),
    unlockDate: $("#unlockDate"),
    unlockDateDisplay: $("#unlockDateDisplay"),
    unlockDaysDisplay: $("#unlockDaysDisplay"),
    timelineProgress: $("#timelineProgress"),
    sealTitleText: $("#sealTitleText"),
    sealMessageText: $("#sealMessageText"),
    sealMaterialText: $("#sealMaterialText"),
    sealDateText: $("#sealDateText"),
    sealBottle: $("#sealBottle"),
    sealButton: $("#sealButton"),
    sealProgress: $("#sealProgress"),
    bottleGrid: $("#bottleGrid"),
    emptyState: $("#emptyState"),
    libraryNote: $("#libraryNote"),
    librarySeason: $("#librarySeason"),
    demoBadge: $("#demoBadge"),
    echoSourceLabel: $("#echoSourceLabel"),
    recallDate: $("#recallDate"),
    recallMaterial: $("#recallMaterial"),
    recallOriginal: $("#recallOriginal"),
    recallEcho: $("#recallEcho"),
    recallBottle: $("#recallBottle"),
    previewDialog: $("#previewDialog"),
    previewDialogText: $("#previewDialogText"),
    previewNowBtn: $("#previewNowBtn"),
    previewCancelBtn: $("#previewCancelBtn"),
    copyEchoBtn: $("#copyEchoBtn"),
    toast: $("#toast"),
    soundToggle: $("#soundToggle"),
    demoSealBtn: $("#demoSealBtn"),
    clearDreamsBtn: $("#clearDreamsBtn")
  };

  let toastTimer;
  let audioContext;
  let sealFrame;
  let sealStartedAt;
  let holdCompleted = false;

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `bottle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function readStorage() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(value)) return [];
      return value.filter((item) => item && item.id && item.title && item.message && item.unlockAt);
    } catch {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bottles));
    } catch {
      showToast("当前浏览器无法保存梦瓶，请检查隐私模式设置。");
    }
    updateCounts();
  }

  function updateCounts() {
    const count = state.bottles.length;
    refs.navCount.textContent = String(count);
    refs.homeLibraryCount.textContent = `(${count})`;
  }

  function tomorrowISO() {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    return toISODate(date);
  }

  function toISODate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function displayDate(value) {
    if (!value) return "尚未约定";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  }

  function unlockFromISO(value) {
    const date = new Date(`${value}T20:00:00`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function daysUntil(dateValue) {
    const target = new Date(dateValue).getTime();
    return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
  }

  function addMonths(months) {
    const date = new Date();
    date.setHours(20, 0, 0, 0);
    date.setMonth(date.getMonth() + Number(months));
    return toISODate(date);
  }

  function setScreen(name) {
    const next = $(`[data-screen="${name}"]`);
    if (!next) return;

    closeDialog();
    if (name !== "seal") resetSealInteraction();

    $$(".screen").forEach((screen) => {
      screen.hidden = screen !== next;
      screen.classList.remove("is-active");
    });
    next.hidden = false;
    state.screen = name;
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => next.classList.add("is-active"));
    refs.header.classList.toggle("is-solid", name !== "home");
    document.body.dataset.screen = name;

    if (name === "library") renderLibrary();

    if (name === "compose") {
      refs.dreamTitle.value = state.draft.title;
      refs.dreamMessage.value = state.draft.message;
      updateCompose();
      window.setTimeout(() => refs.dreamTitle.focus({ preventScroll: true }), 280);
    }

    if (name === "material") {
      applyMaterial(state.draft.material, false);
    }

    if (name === "time") {
      if (!state.draft.unlockDate) setPreset(12);
      else updateDateDisplay();
    }

    if (name === "seal") {
      populateSealSummary();
    }
  }

  function populateSealSummary() {
    const item = state.draft;
    refs.sealTitleText.textContent = item.title || "未命名愿望";
    refs.sealMessageText.textContent = item.message || "你还没有写下想对未来说的那句话。";
    refs.sealMaterialText.textContent = materials[item.material]?.label || materials.porcelain.label;
    refs.sealDateText.textContent = displayDate(item.unlockDate);
    applyBottleMaterial(refs.sealBottle, item.material);
  }

  function updateCompose() {
    state.draft.title = refs.dreamTitle.value.trim();
    state.draft.message = refs.dreamMessage.value;
    refs.charCount.textContent = String(refs.dreamMessage.value.length);
    const valid = state.draft.title.length > 0 && state.draft.message.trim().length >= 6;
    refs.composeNext.disabled = !valid;
    refs.composeNext.setAttribute("aria-disabled", String(!valid));
  }

  function applyBottleMaterial(element, materialName) {
    if (!element) return;
    Object.keys(materials).forEach((name) => element.classList.remove(`material-${name}`));
    element.classList.add(`material-${materialName}`);
  }

  function applyMaterial(materialName, playSound = true) {
    const selected = materials[materialName] || materials.porcelain;
    state.draft.material = materials[materialName] ? materialName : "porcelain";

    $$(".material-card").forEach((card) => {
      const active = card.dataset.material === state.draft.material;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });

    refs.selectedMaterialName.textContent = selected.label;
    refs.selectedMaterialLine.textContent = selected.line;
    applyBottleMaterial(refs.materialBottle, state.draft.material);
    if (playSound) playChime(392, 0.12, 0.025);
  }

  function setPreset(months) {
    const value = addMonths(months);
    refs.unlockDate.value = value;
    state.draft.unlockDate = value;
    $$(".time-preset").forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.months) === Number(months));
    });
    updateDateDisplay();
  }

  function updateDateDisplay() {
    const value = refs.unlockDate.value;
    if (!value) return;
    state.draft.unlockDate = value;
    const date = unlockFromISO(value);
    const days = Math.max(1, Math.ceil((date.getTime() - Date.now()) / 86400000));
    refs.unlockDateDisplay.textContent = displayDate(value);
    refs.unlockDaysDisplay.textContent = `还有 ${days} 天`;
    const progress = Math.min(96, Math.max(8, 8 + Math.log10(days + 1) * 35));
    refs.timelineProgress.style.width = `${progress}%`;
  }

  function resetSealInteraction() {
    state.sealing = false;
    holdCompleted = false;
    cancelAnimationFrame(sealFrame);
    refs.sealButton?.classList.remove("is-holding");
    refs.sealStage?.classList.remove("is-sealing", "is-sealed");
    if (refs.sealProgress) refs.sealProgress.style.setProperty("--seal-angle", "0deg");
    if (refs.sealButton) {
      const label = $(".seal-button__label", refs.sealButton);
      if (label) label.textContent = "按住封存";
      refs.sealButton.disabled = false;
    }
  }

  function beginSeal() {
    if (holdCompleted) return;
    const stage = $(".seal-stage");
    if (!stage) return;
    state.sealing = true;
    holdCompleted = false;
    sealStartedAt = performance.now();
    stage.classList.add("is-sealing");
    refs.sealButton.classList.add("is-holding");
    playChime(261.63, 0.5, 0.018);

    const tick = (now) => {
      const elapsed = now - sealStartedAt;
      const progress = Math.min(1, elapsed / 1600);
      refs.sealProgress.style.setProperty("--seal-angle", `${Math.round(progress * 360)}deg`);
      if (progress >= 1) {
        completeSeal();
        return;
      }
      if (state.sealing) sealFrame = requestAnimationFrame(tick);
    };
    sealFrame = requestAnimationFrame(tick);
  }

  function cancelSeal() {
    if (holdCompleted) return;
    state.sealing = false;
    cancelAnimationFrame(sealFrame);
    refs.sealButton?.classList.remove("is-holding");
    $(".seal-stage")?.classList.remove("is-sealing");
    if (refs.sealProgress) refs.sealProgress.style.setProperty("--seal-angle", "0deg");
  }

  function completeSeal() {
    if (holdCompleted) return;
    holdCompleted = true;
    state.sealing = false;
    cancelAnimationFrame(sealFrame);
    const stage = $(".seal-stage");
    refs.sealButton.classList.remove("is-holding");
    refs.sealButton.disabled = true;
    $(".seal-button__label", refs.sealButton).textContent = "已封存";
    $(".seal-button__hint", refs.sealButton).textContent = "等待时间";
    stage?.classList.add("is-sealed");
    playSealSequence();

    const bottle = {
      id: uid(),
      title: state.draft.title,
      message: state.draft.message.trim(),
      material: state.draft.material,
      createdAt: new Date().toISOString(),
      unlockAt: unlockFromISO(state.draft.unlockDate).toISOString()
    };

    state.bottles.unshift(bottle);
    state.activeBottleId = bottle.id;
    persist();
    updateCounts();

    window.setTimeout(() => {
      state.draft = {
        title: "",
        message: "",
        material: "porcelain",
        unlockDate: ""
      };
      refs.dreamTitle.value = "";
      refs.dreamMessage.value = "";
      resetSealInteraction();
      setScreen("library");
      showToast("愿望已平安封存。它会在约定的那天重新出现。");
    }, 1250);
  }

  function renderLibrary() {
    const bottles = [...state.bottles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    refs.bottleGrid.innerHTML = bottles.map((bottle, index) => {
      const material = materials[bottle.material] || materials.porcelain;
      const due = new Date(bottle.unlockAt).getTime() <= Date.now();
      const days = daysUntil(bottle.unlockAt);
      const status = due ? "已抵达 · 打开回望" : `静默期 · 还有 ${days} 天`;
      return `
        <button class="bottle-card" type="button" data-bottle-id="${escapeHTML(bottle.id)}" aria-label="打开梦瓶：${escapeHTML(bottle.title)}">
          <span class="bottle-card__art" aria-hidden="true">
            <svg class="bottle material-${escapeHTML(bottle.material)}" viewBox="0 0 220 340"><use href="#bottleSymbol"></use></svg>
          </span>
          <span class="bottle-card__copy">
            <span class="bottle-card__index">VESSEL ${String(index + 1).padStart(2, "0")} / ${escapeHTML(material.en)}</span>
            <h3>${escapeHTML(bottle.title)}</h3>
            <span class="bottle-card__status">${status}</span>
            <span class="bottle-card__date">约定日 ${displayDate(toISODate(new Date(bottle.unlockAt)))}</span>
          </span>
          <span class="bottle-card__open" aria-hidden="true">↗</span>
        </button>
      `;
    }).join("");

    const hasBottles = bottles.length > 0;
    refs.emptyState.hidden = hasBottles;
    refs.bottleGrid.hidden = !hasBottles;
    refs.libraryNote.textContent = hasBottles
      ? `共 ${bottles.length} 个愿望，正在各自的时间里安静生长。`
      : "每一个愿望，都在拥有自己的时间。";

    $$(".bottle-card", refs.bottleGrid).forEach((card) => {
      card.addEventListener("click", () => requestOpenBottle(card.dataset.bottleId));
    });
  }

  function requestOpenBottle(id) {
    const bottle = state.bottles.find((item) => item.id === id);
    if (!bottle) return;
    state.activeBottleId = id;
    const due = new Date(bottle.unlockAt).getTime() <= Date.now();
    if (due) {
      renderRecall(bottle, false);
      return;
    }

    const days = daysUntil(bottle.unlockAt);
    refs.previewDialogText.textContent = `距离“${bottle.title}”约定打开的日子，还有 ${days} 天。它仍在时间里安静生长。`;
    if (typeof refs.previewDialog.showModal === "function") {
      refs.previewDialog.showModal();
    } else {
      refs.previewDialog.setAttribute("open", "");
    }
  }

  function closeDialog() {
    if (refs.previewDialog?.open) refs.previewDialog.close();
  }

  async function renderRecall(bottle, demo = false) {
    state.activeBottleId = bottle.id;
    state.demo = demo;
    state.activeEcho = [];
    const material = materials[bottle.material] || materials.porcelain;
    refs.recallDate.textContent = displayDate(toISODate(new Date(bottle.unlockAt)));
    refs.recallMaterial.textContent = material.label;
    refs.recallOriginal.textContent = `“${bottle.message}”`;
    refs.recallEcho.innerHTML = '<p class="echo-loading">正在从时间里打捞回声</p>';
    refs.recallEcho.setAttribute("aria-busy", "true");
    refs.echoSourceLabel.textContent = "正在整理回望";
    refs.demoBadge.hidden = !demo;
    applyBottleMaterial(refs.recallBottle, bottle.material);
    setScreen("recall");
    playOpenSequence();

    const fallback = generateEcho(bottle);
    let lines = fallback;
    let mode = "local";
    try {
      const result = await requestEcho(bottle);
      if (Array.isArray(result.echo) && result.echo.length > 0) {
        lines = result.echo.slice(0, 5);
        mode = result.mode === "ai" ? "ai" : "local";
      }
    } catch {
      mode = "local";
    }

    if (state.screen !== "recall" || state.activeBottleId !== bottle.id) return;
    state.activeEcho = lines;
    refs.recallEcho.innerHTML = lines.map((line) => `<p>${escapeHTML(line)}</p>`).join("");
    refs.recallEcho.setAttribute("aria-busy", "false");
    refs.echoSourceLabel.textContent = mode === "ai" ? "由AI与时间共同整理" : "本地演示回声";
  }

  async function requestEcho(bottle) {
    if (window.DREAM_AI_ENABLED === false) {
      return { mode: "demo", echo: [] };
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const endpoint = window.DREAM_AI_ENDPOINT || "/api/echo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bottle.title,
          message: bottle.message,
          material: materials[bottle.material]?.cn || "瓷",
          materialEn: materials[bottle.material]?.en || "PORCELAIN",
          unlockAt: bottle.unlockAt
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Echo request failed: ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function generateEcho(bottle) {
    const plain = bottle.message.replace(/\s+/g, " ").trim();
    const excerpt = plain.length > 34 ? `${plain.slice(0, 34)}……` : plain;
    const materialLine = materials[bottle.material]?.echo || materials.porcelain.echo;
    const signature = [];

    if (/(勇气|害怕|重新开始|尝试|失败)/.test(plain)) {
      signature.push("你曾经把“勇气”写进未来。它未必让你从此不再害怕，但至少让当时的你，没有把选择交给犹豫。");
    } else if (/(家人|父母|妈妈|爸爸|朋友|陪伴)/.test(plain)) {
      signature.push("那些关于人的愿望，很少有一个明确的完成时刻。它们更像一次次选择，把重要的人重新放回生活的中心。");
    } else if (/(工作|作品|创作|比赛|毕业|考试|学习)/.test(plain)) {
      signature.push("你期待的那件事，也许已经发生，也许还在路上。但你已经为它留下过一个具体的愿望，而不是只让它停在模糊的想象里。");
    } else if (/(旅行|远方|世界|城市|自由)/.test(plain)) {
      signature.push("远方未必真的改变了你。真正改变你的，可能是你终于承认：自己想去看一看更大的世界。");
    } else {
      signature.push("愿望不一定以你设想的方式抵达。但写下它的那一刻，你已经替未来的自己留下了一条可以辨认的路。");
    }

    return [
      `那时的你，把“${excerpt}”放进了一只${materials[bottle.material]?.cn || "瓷"}做的梦瓶。`,
      materialLine,
      signature[0],
      "如果今天的你还没有抵达，也没关系。愿望不是期限，是你曾经选择的方向。"
    ];
  }

  function copyEcho() {
    const bottle = state.bottles.find((item) => item.id === state.activeBottleId);
    if (!bottle) return;
    const echoLines = state.activeEcho.length ? state.activeEcho : generateEcho(bottle);
    const text = `${bottle.title}\n\n你曾写下：${bottle.message}\n\n未来回声：\n${echoLines.join("\n")}\n\n—— 梦瓶 · 只寄给未来的自己`;
    copyText(text).then(() => showToast("这句回声已经复制到剪贴板。")).catch(() => showToast("复制失败，请手动选择文字。"));
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    textarea.remove();
    if (!success) throw new Error("Copy failed");
  }

  function loadDemoBottle() {
    const existing = state.bottles.find((item) => item.demo === true);
    if (existing) {
      state.activeBottleId = existing.id;
      requestOpenBottle(existing.id);
      return;
    }

    const created = new Date();
    created.setFullYear(created.getFullYear() - 1);
    const unlock = new Date();
    unlock.setDate(unlock.getDate() - 1);
    unlock.setHours(20, 0, 0, 0);

    const demoBottle = {
      id: uid(),
      title: "第一次一个人去远方",
      message: "希望一年后的我，已经去过一个没有人认识我的地方。不是为了逃离，而是想确认，我也可以替自己做一次决定。",
      material: "glass",
      createdAt: created.toISOString(),
      unlockAt: unlock.toISOString(),
      demo: true
    };
    state.bottles.unshift(demoBottle);
    state.activeBottleId = demoBottle.id;
    persist();
    renderLibrary();
    showToast("演示梦瓶已经抵达，可以打开回望。");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => refs.toast.classList.remove("is-visible"), 3200);
  }

  function ensureAudio() {
    if (!state.sound) return null;
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      audioContext = new Context();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playChime(frequency, duration = 0.3, volume = 0.025) {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  function playSealSequence() {
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      window.setTimeout(() => playChime(frequency, 0.75, 0.018), index * 150);
    });
  }

  function playOpenSequence() {
    [392, 493.88, 587.33].forEach((frequency, index) => {
      window.setTimeout(() => playChime(frequency, 0.8, 0.014), index * 110);
    });
  }

  function populateStars() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 74; index += 1) {
      const star = document.createElement("span");
      star.className = "star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty("--size", `${Math.random() * 1.8 + 0.5}px`);
      star.style.setProperty("--opacity", `${Math.random() * 0.42 + 0.08}`);
      star.style.setProperty("--duration", `${Math.random() * 5 + 3}s`);
      star.style.setProperty("--delay", `${Math.random() * -8}s`);
      fragment.appendChild(star);
    }
    refs.starfield.appendChild(fragment);
  }

  function initializeDate() {
    refs.unlockDate.min = tomorrowISO();
    state.draft.unlockDate = addMonths(12);
    refs.unlockDate.value = state.draft.unlockDate;
    updateDateDisplay();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const actionElement = event.target.closest("[data-action]");
      if (!actionElement) return;
      const action = actionElement.dataset.action;

      if (action === "home") setScreen("home");
      if (action === "compose") {
        if (state.screen !== "compose") setScreen("compose");
      }
      if (action === "library") setScreen("library");
      if (action === "time") {
        if (!state.draft.title || !state.draft.message.trim()) {
          showToast("先写下愿望，再约定打开的时间。");
          setScreen("compose");
          return;
        }
        setScreen("time");
      }
      if (action === "material") setScreen("material");
      if (action === "seal") {
        if (!state.draft.unlockDate) setPreset(12);
        setScreen("seal");
      }
    });

    refs.dreamTitle.addEventListener("input", updateCompose);
    refs.dreamMessage.addEventListener("input", updateCompose);

    refs.composeNext.addEventListener("click", () => {
      state.draft.title = refs.dreamTitle.value.trim();
      state.draft.message = refs.dreamMessage.value.trim();
      if (!state.draft.title || state.draft.message.length < 6) {
        showToast("请先完成愿望名称和内容。");
        return;
      }
      setScreen("material");
    });

    $(".prompt-chip").addEventListener("click", () => {
      const prompts = [
        "愿我仍然保有重新开始的勇气。",
        "希望未来的我，仍然记得今天为什么出发。",
        "愿我没有因为害怕失去，而拒绝新的可能。",
        "希望有一天，我能平静地说：那件事，我认真做过。"
      ];
      const next = prompts[Math.floor(Math.random() * prompts.length)];
      refs.dreamMessage.value = next;
      updateCompose();
      refs.dreamMessage.focus();
    });

    $$(".material-card").forEach((card) => {
      card.addEventListener("click", () => applyMaterial(card.dataset.material));
    });

    $$(".time-preset").forEach((button) => {
      button.addEventListener("click", () => setPreset(button.dataset.months));
    });

    refs.unlockDate.addEventListener("change", () => {
      $$(".time-preset").forEach((button) => button.classList.remove("is-selected"));
      updateDateDisplay();
    });

    refs.sealButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      refs.sealButton.setPointerCapture?.(event.pointerId);
      beginSeal();
    });
    refs.sealButton.addEventListener("pointerup", cancelSeal);
    refs.sealButton.addEventListener("pointercancel", cancelSeal);
    refs.sealButton.addEventListener("pointerleave", cancelSeal);

    refs.sealButton.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        beginSeal();
      }
    });
    refs.sealButton.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        cancelSeal();
      }
    });

    refs.previewCancelBtn.addEventListener("click", closeDialog);
    refs.previewNowBtn.addEventListener("click", () => {
      const bottle = state.bottles.find((item) => item.id === state.activeBottleId);
      closeDialog();
      if (bottle) renderRecall(bottle, true);
    });
    refs.previewDialog.addEventListener("click", (event) => {
      if (event.target === refs.previewDialog) closeDialog();
    });

    refs.copyEchoBtn.addEventListener("click", copyEcho);
    refs.demoSealBtn.addEventListener("click", loadDemoBottle);
    refs.clearDreamsBtn.addEventListener("click", () => {
      if (!window.confirm("确定清空当前设备中的全部梦瓶吗？此操作不可撤销。")) return;
      state.bottles = [];
      state.activeBottleId = null;
      localStorage.removeItem(STORAGE_KEY);
      updateCounts();
      renderLibrary();
      showToast("本机梦瓶已清空。");
    });

    refs.soundToggle.addEventListener("click", () => {
      state.sound = !state.sound;
      refs.soundToggle.setAttribute("aria-pressed", String(state.sound));
      refs.soundToggle.setAttribute("aria-label", state.sound ? "关闭声音" : "打开声音");
      if (state.sound) playChime(440, 0.15, 0.02);
    });

    document.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      refs.cursorLight.style.left = `${event.clientX}px`;
      refs.cursorLight.style.top = `${event.clientY}px`;
      refs.cursorLight.style.opacity = "1";
    });

    document.addEventListener("pointerleave", () => {
      refs.cursorLight.style.opacity = "0";
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && refs.previewDialog.open) closeDialog();
    });
  }

  function initialize() {
    state.bottles = readStorage();
    populateStars();
    initializeDate();
    bindEvents();
    updateCounts();
    renderLibrary();
    refs.header.classList.remove("is-solid");
    document.body.dataset.screen = "home";
  }

  initialize();
})();
