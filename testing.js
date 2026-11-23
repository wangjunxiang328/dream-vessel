(() => {
  const STORAGE_KEY = "dream-vessel.tests.v1";
  const form = document.querySelector("#testForm");
  const toast = document.querySelector("#toast");
  const countEl = document.querySelector("#recordCount");
  const exportBtn = document.querySelector("#exportBtn");
  const downloadBtn = document.querySelector("#downloadBtn");
  const clearBtn = document.querySelector("#clearBtn");

  const load = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  };
  const save = (records) => localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  const notify = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  };
  const updateCount = () => { countEl.textContent = String(load().length); };
  const getValue = (name) => {
    const element = form.elements[name];
    if (!element) return "";
    return element.type === "checkbox" ? element.checked : element.value.trim();
  };

  document.querySelectorAll('.ratings input').forEach((input) => {
    const output = input.closest("label").querySelector("output");
    const sync = () => { output.textContent = input.value; };
    input.addEventListener("input", sync);
    sync();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      participant: getValue("participant"),
      age: getValue("age"),
      device: getValue("device"),
      tasks: [1, 2, 3, 4, 5].map((n) => ({ task: `T${n}`, done: Boolean(getValue(`t${n}`)), note: getValue(`t${n}note`) })),
      scores: Object.fromEntries(["ease", "emotion", "trust", "intent"].map((key) => [key, Number(getValue(key))])),
      interview: Object.fromEntries(["understanding", "friction", "delight", "suggestion"].map((key) => [key, getValue(key)])),
      userAgent: navigator.userAgent
    };
    const records = load();
    records.push(record);
    save(records);
    updateCount();
    notify(`已保存 ${record.participant || "未编号参与者"} 的测试记录。`);
    form.reset();
    document.querySelectorAll('.ratings input').forEach((input) => {
      input.value = "5";
      input.closest("label").querySelector("output").textContent = "5";
    });
    form.elements.participant.focus();
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dream-vessel-user-tests-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("测试记录已导出。");
  });

  downloadBtn.addEventListener("click", () => {
    const records = load();
    const lines = records.map((record) => [
      `参与者：${record.participant}`,
      `时间：${record.timestamp}`,
      `设备：${record.device} / 年龄：${record.age}`,
      ...record.tasks.map((task) => `${task.task}：${task.done ? "完成" : "未完成"}｜${task.note || "无备注"}`),
      `评分：易用 ${record.scores.ease}｜共鸣 ${record.scores.emotion}｜信任 ${record.scores.trust}｜再次使用 ${record.scores.intent}`,
      `理解：${record.interview.understanding || "无"}`,
      `困惑：${record.interview.friction || "无"}`,
      `打动：${record.interview.delight || "无"}`,
      `建议：${record.interview.suggestion || "无"}`,
      "---"
    ].join("\n")).join("\n");
    const blob = new Blob([lines || "暂无测试记录"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dream-vessel-test-report-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("测试报告已下载。");
  });

  clearBtn.addEventListener("click", () => {
    if (!window.confirm("确定清空当前浏览器中的全部测试记录吗？此操作不可撤销。")) return;
    localStorage.removeItem(STORAGE_KEY);
    updateCount();
    notify("本机测试记录已清空。");
  });

  updateCount();
})();
