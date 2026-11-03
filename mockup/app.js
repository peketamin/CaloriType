"use strict";
const $ = (id) => document.getElementById(id),
  today = key(new Date()),
  DB =
    "caloritype-prototype-v1" +
    location.pathname.replace(/\/(?:index\.html)?$/, "");
let mode = "demo";
try {
  const requested = new URLSearchParams(location.search).get("mode");
  const saved = localStorage.getItem(DB + ".mode");
  mode = ["demo", "record"].includes(requested)
    ? requested
    : saved === "record"
      ? "record"
      : "demo";
} catch {}
const modeHistories = {
  demo: { undo: [], redo: [] },
  record: { undo: [], redo: [] },
};
const fmt = (n) => Math.round(n).toLocaleString("ja-JP"),
  clone = (o) => structuredClone(o);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const date = (s) => new Date(s + "T12:00:00");
function shift(s, n) {
  const d = date(s);
  d.setDate(d.getDate() + n);
  return key(d);
}
const uid = () => crypto.randomUUID();
const defaults = [
  [
    "ごはん（茶碗1杯）",
    "ご飯 白米 こめ 米",
    234,
    3.8,
    0.5,
    55.7,
    "serving",
    1,
    150,
    "🍚",
  ],
  [
    "鶏むね肉（皮なし）",
    "とり 鶏肉 チキン むね",
    105,
    23.3,
    1.9,
    0,
    "g",
    100,
    100,
    "🍗",
  ],
  [
    "鮭の塩焼き（1切れ）",
    "さけ しゃけ サケ 魚",
    190,
    22,
    11,
    0.1,
    "piece",
    1,
    80,
    "🐟",
  ],
  ["卵", "たまご 玉子 タマゴ", 76, 6.2, 5.2, 0.2, "piece", 1, 50, "🥚"],
  ["納豆（1パック）", "なっとう 大豆", 95, 8.3, 5, 6.1, "serving", 1, 50, "🫘"],
  ["バナナ", "ばなな 果物", 93, 1.1, 0.2, 22.5, "piece", 1, 100, "🍌"],
  ["ヨーグルト（無糖）", "よーぐると", 56, 3.6, 3, 4.9, "g", 100, 100, "🥣"],
  [
    "食パン（6枚切り）",
    "ぱん パン トースト",
    158,
    5.6,
    2.6,
    28,
    "piece",
    1,
    60,
    "🍞",
  ],
  [
    "サラダ（ドレッシング込み）",
    "さらだ 野菜 やさい",
    85,
    2.5,
    5,
    8,
    "serving",
    1,
    120,
    "🥗",
  ],
  [
    "味噌汁",
    "みそ汁 みそしる スープ",
    40,
    2.5,
    1.5,
    4,
    "serving",
    1,
    150,
    "🥣",
  ],
  ["チョコレート", "ちょこ お菓子", 28, 0.4, 1.8, 2.8, "piece", 1, 5, "🍫"],
  ["カレーライス", "かれー カレー", 650, 17, 22, 96, "serving", 1, 450, "🍛"],
  [
    "パスタ（トマトソース）",
    "ぱすた スパゲティ",
    520,
    16,
    12,
    85,
    "serving",
    1,
    350,
    "🍝",
  ],
  [
    "カフェラテ",
    "かふぇらて コーヒー 珈琲",
    120,
    6,
    6,
    10,
    "serving",
    1,
    240,
    "☕",
  ],
  [
    "おにぎり（鮭）",
    "おむすび おにぎり",
    180,
    4.5,
    1.5,
    36,
    "piece",
    1,
    110,
    "🍙",
  ],
].map((a, i) => ({
  id: "food-" + i,
  name: a[0],
  aliases: a[1],
  kcal: a[2],
  p: a[3],
  f: a[4],
  c: a[5],
  unit: a[6],
  amount: a[7],
  grams: a[8],
  emoji: a[9],
  source: "操作モック用の参考値",
}));
const defaultMeals = [
  {
    id: "breakfast",
    name: "朝食",
    time: "06:00",
    rangeEnd: "11:00",
    icon: "☀",
    bg: "#f6f2e6",
  },
  {
    id: "lunch",
    name: "昼食",
    time: "11:00",
    rangeEnd: "17:00",
    icon: "◔",
    bg: "#ecf2e7",
  },
  {
    id: "dinner",
    name: "夕食",
    time: "17:00",
    rangeEnd: "21:00",
    icon: "☾",
    bg: "#eaf0f4",
  },
  {
    id: "late",
    name: "夜食",
    time: "21:00",
    rangeEnd: "06:00",
    icon: "♧",
    bg: "#f2edf4",
  },
];
const quoteEnglish = [
  "A thousand-li journey starts with the step at your feet.",
  "Is there not joy in learning and returning to practice?",
  "Each day, I examine myself in three respects.",
];
const quotes = [
  {
    text: "千里之行，始於足下。",
    author: "老子『道徳経』第64章",
    url: "https://ctext.org/dao-de-jing",
  },
  {
    text: "學而時習之，不亦說乎？",
    author: "孔子『論語』学而 第一",
    url: "https://ctext.org/analects/xue-er",
  },
  {
    text: "吾日三省吾身。",
    author: "曾子『論語』学而 第一（冒頭句）",
    url: "https://ctext.org/analects/xue-er",
  },
];
const dirtyFields = new Set();
const store = new CaloriStore(DB),
  baselines = {},
  seenRevisions = {};
store.validate = validState;
let saveSerial = 0;
const pendingPatches = { demo: [], record: [] };
let state,
  db,
  selected = today,
  month = date(today),
  undo = [],
  redo = [],
  working = null,
  reference = null,
  editing = null,
  saveQueue = Promise.resolve(),
  toastTimer,
  quoteIndex = 0;
function initial() {
  const entries = [];
  function add(i, d, m, time, factor = 1) {
    const f = defaults[i];
    entries.push({
      id: uid(),
      foodId: f.id,
      name: f.name,
      date: d,
      time,
      meal: m,
      kcal: f.kcal * factor,
      p: f.p * factor,
      f: f.f * factor,
      c: f.c * factor,
      amount: f.amount * factor,
      unit: f.unit,
      eatingOut: false,
      rate: 0,
      estimated: true,
    });
  }
  for (let n = 42; n > 0; n--) {
    if (n % 9 === 0) continue;
    const d = shift(today, -n),
      k = [0.9, 1.1, 1.85, 0.98, 1.03][n % 5];
    add(7, d, "breakfast", "08:00", k);
    add(6, d, "breakfast", "08:00");
    add(11, d, "lunch", "12:30", k);
    add(0, d, "dinner", "19:00", k);
    add(2, d, "dinner", "19:00");
    add(8, d, "dinner", "19:00");
    add(10, d, "late", "22:00", 2);
  }
  add(7, today, "breakfast", "08:00");
  add(6, today, "breakfast", "08:00");
  add(5, today, "breakfast", "08:00");
  add(0, today, "lunch", "12:30");
  add(1, today, "lunch", "12:30", 1.5);
  add(8, today, "lunch", "12:30");
  add(9, today, "lunch", "12:30");
  return {
    version: 1,
    entries,
    foods: clone(defaults),
    meals: clone(defaultMeals),
    goal: 2000,
    currentWeight: 62.4,
    goalWeight: 58,
    boundaries: {},
    completed: Object.fromEntries(
      [...new Set(entries.map((e) => e.date))]
        .filter((d) => d !== today)
        .map((d) => [d, true]),
    ),
    historyLimit: 1000,
    showQuotes: true,
    memories: {},
  };
}
function openDB() {
  return store.open();
}
function emptyRecord() {
  const s = initial();
  s.entries = [];
  s.completed = {};
  s.memories = {};
  s.goal = null;
  s.currentWeight = null;
  s.goalWeight = null;
  return s;
}
function readDB(which = mode) {
  return store.read(which, selected);
}
function save() {
  document.querySelector(".local-dot").textContent = "保存中…";
  const saveMode = mode,
    data = clone(state),
    before = baselines[mode],
    patch = CaloriStore.diff(before || { entries: [] }, data),
    serial = ++saveSerial;
  if (before && CaloriStore.has(patch)) pendingPatches[saveMode].push(patch);
  baselines[mode] = data;
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      if (!db) throw new Error("Storage unavailable");
      let conflict = false;
      if (!before) {
        const fresh = await store.replace(saveMode, data);
        seenRevisions[saveMode] = fresh._rev;
      } else
        while (pendingPatches[saveMode].length) {
          const current = pendingPatches[saveMode][0],
            result = await store.commit(
              saveMode,
              current,
              seenRevisions[saveMode] ?? before._rev ?? 0,
            );
          seenRevisions[saveMode] = result.rev;
          conflict = conflict || result.conflict;
          pendingPatches[saveMode].shift();
        }
      if (saveMode === mode && serial === saveSerial) {
        const fresh = await readDB();
        if (fresh) {
          state = fresh;
          seenRevisions[mode] = fresh._rev;
          baselines[mode] = clone(fresh);
          render();
        }
        document.querySelector(".local-dot").textContent =
          mode === "demo" ? "デモを保存済み" : "この端末に保存済み";
      }
      if (conflict)
        toast(
          "別タブの更新と競合しました。項目ごとの後勝ちで保存し、再描画・再計算しました。",
        );
      return true;
    })
    .catch(() => {
      document.querySelector(".local-dot").textContent = "保存できません";
      toast("保存に失敗しました。JSONを書き出して保管してください。");
      return false;
    });
  return saveQueue;
}
function toast(s) {
  $("toast").textContent = s;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4000);
}
function change(fn, message) {
  const before = clone(state);
  fn();
  if (JSON.stringify(before.boundaries) !== JSON.stringify(state.boundaries))
    for (const e of state.entries) delete e.logicalDay;
  const patch = CaloriStore.diff(before, state);
  if (CaloriStore.has(patch)) {
    undo.push(patch);
    if (undo.length > state.historyLimit) undo.shift();
    redo = [];
  }
  save();
  render();
  if (message) toast(message);
}
function end(day) {
  return (
    new Date(day + "T00:00:00").getTime() +
    (state.boundaries[day] ?? 24) * 3600000
  );
}
function belonging(e) {
  if (e.logicalDay) return e.logicalDay;
  const at = new Date(e.date + "T" + e.time + ":00").getTime();
  for (const day of [shift(e.date, -1), e.date, shift(e.date, 1)])
    if (at >= end(shift(day, -1)) && at < end(day)) return day;
  return e.date;
}
const list = (day) => state.entries.filter((e) => belonging(e) === day);
const total = (es) =>
  es.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal,
      p: a.p + (e.p ?? 0),
      f: a.f + (e.f ?? 0),
      c: a.c + (e.c ?? 0),
      unknown: a.unknown + (["p", "f", "c"].some((k) => e[k] === null) ? 1 : 0),
    }),
    { kcal: 0, p: 0, f: 0, c: 0, unknown: 0 },
  );
function boundaryText(n) {
  return `${n > 24 ? "翌 " : ""}${String(Math.floor(n > 24 ? n - 24 : n)).padStart(2, "0")}:${String(Math.round((n % 1) * 60)).padStart(2, "0")}`;
}
function render() {
  renderMode();
  renderHome();
  renderStats();
  $("undoBtn").disabled = !undo.length;
  $("redoBtn").disabled = !redo.length;
  renderQuote();
}
function renderHome() {
  const es = list(selected),
    t = total(es),
    activeGoal = CaloriStore.goalAt(state, selected),
    remaining = Number.isFinite(activeGoal)
      ? activeGoal - Math.round(t.kcal)
      : null;
  $("dayInput").value = selected;
  $("total").textContent = fmt(t.kcal);
  $("targetLabel").textContent =
    activeGoal === null ? "未設定" : fmt(activeGoal);
  $("targetUnit").textContent = activeGoal === null ? "" : "kcal";
  $("remainText").textContent =
    remaining === null
      ? "目標を設定してください"
      : remaining >= 0
        ? "目標まであと"
        : "目標より";
  $("remain").innerHTML =
    remaining === null
      ? "— <small>kcal</small>"
      : `${fmt(Math.abs(remaining))} <small>kcal${remaining < 0 ? " 超過" : ""}</small>`;
  $("ring").style.setProperty(
    "--progress",
    (activeGoal ? Math.min(100, (t.kcal / activeGoal) * 100) : 0) + "%",
  );
  $("ring").style.setProperty("--green", remaining < 0 ? "#c18c72" : "#358068");
  const equivalents = [
    ["チョコレート", "個", 28, "🍫"],
    ["バナナ", "本", 93, "🍌"],
    ["おにぎり", "個", 180, "🍙"],
  ];
  const eq = equivalents[Math.floor(date(selected).getTime() / 86400000) % 3];
  $("equivEmoji").textContent = eq[3];
  $("equiv").textContent =
    remaining === null
      ? "目標の設定後に換算を表示します"
      : `${eq[0]} 約${(Math.abs(remaining) / eq[2]).toFixed(1)}${eq[1]}分${remaining < 0 ? "の超過" : ""}`;
  const energy = t.p * 4 + t.f * 9 + t.c * 4,
    macros = [
      ["P", "タンパク質", t.p, t.p * 4, "var(--p)"],
      ["F", "脂質", t.f, t.f * 9, "var(--f)"],
      ["C", "炭水化物", t.c, t.c * 4, "var(--c)"],
    ];
  $("pfcBar").innerHTML = macros
    .map(
      (m) =>
        `<span style="width:${energy ? (m[3] / energy) * 100 : 33.3}%;background:${m[4]}"></span>`,
    )
    .join("");
  $("pfcLegend").innerHTML = macros
    .map(
      (m) =>
        `<div><i style="background:${m[4]}"></i>${m[0]} ${m[1]}<strong>${energy ? Math.round((m[3] / energy) * 100) : 0}<small>%</small></strong><small>${m[2].toFixed(1)}g</small></div>`,
    )
    .join("");
  $("pfcNote").textContent = t.unknown
    ? `PFC不明 ${t.unknown}件。割合は既知の値だけから計算しています。`
    : "食品の数値は操作確認用の目安です。量や調理方法に合わせて調整できます。";
  $("entryCount").textContent = es.length;
  $("dayStatus").textContent = state.completed[selected]
    ? "● 記録完了 · 長期集計に反映"
    : es.length
      ? "◐ 入力途中 · 長期差分には未反映"
      : "○ 未記録";
  $("completeDay").textContent = state.completed[selected]
    ? "入力途中に戻す"
    : "この日の記録を完了";
  $("timeline").innerHTML = state.meals
    .map((m) => {
      const items = es
        .filter((e) => e.meal === m.id)
        .sort((a, b) => a.time.localeCompare(b.time));
      return `<div class="meal-row"><span class="time-label">${items[0]?.time || m.time}</span><div class="meal-block" data-meal="${m.id}" style="--meal-bg:${m.bg}"><div class="meal-heading"><h3><span class="meal-icon">${esc(m.icon || "◦")}</span>${esc(m.name)}</h3><div><strong>${fmt(total(items).kcal)}<small>kcal</small></strong><button class="meal-add" data-add="${m.id}" aria-label="${esc(m.name)}に追加">＋</button></div></div>${items.length ? items.map((e) => `<div class="food-row" draggable="true" data-entry="${e.id}"><span class="drag-handle" title="ドラッグで移動">⠿</span><div class="food-info"><strong>${esc(e.name)}${e.pfcEstimated ? '<span class="tag">PFC推定</span>' : ""}${e.eatingOut ? '<span class="tag">外食 ' + e.rate + "%</span>" : ""}</strong><small>${e.time} · P ${macroText(e.p)} / F ${macroText(e.f)} / C ${macroText(e.c)} g</small></div><span class="food-kcal">${fmt(e.kcal)} <small>kcal</small></span><button class="edit-food" data-edit="${e.id}" aria-label="${esc(e.name)}を編集">✎</button><button class="delete-food" data-delete="${e.id}" aria-label="${esc(e.name)}を削除">×</button></div>`).join("") : '<p class="meal-empty">ここにドロップ、または ＋ で記録</p>'}</div></div>`;
    })
    .join("");
  $("boundary").value = state.boundaries[selected] ?? 24;
  $("boundaryLabel").textContent = boundaryText(Number($("boundary").value));
  $("mealSelect").innerHTML = state.meals
    .map((m) => `<option value="${m.id}">${esc(m.name)}</option>`)
    .join("");
  if (working) $("mealSelect").value = working.meal;
  else $("mealSelect").value = "lunch";
}
const macroText = (n) => (n === null ? "—" : n.toFixed(1));
function renderQuote() {
  $("quoteCard").hidden = !state.showQuotes;
  const q =
    quotes[
      (Math.floor(date(today).getTime() / 86400000) + quoteIndex) %
        quotes.length
    ];
  $("quoteText").textContent = q.text;
  $("quoteSource").textContent = q.author + " ↗";
  $("quoteSource").href = q.url;
  $("quoteEnglish").textContent =
    quoteEnglish[
      (Math.floor(date(today).getTime() / 86400000) + quoteIndex) %
        quotes.length
    ];
}
function view(v) {
  $("homeView").hidden = v !== "home";
  $("statsView").hidden = v !== "stats";
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.view === v));
  closeMenu();
  renderStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function suggestions() {
  if (editing) return;
  const q = $("foodSearch").value.trim().toLowerCase();
  const foods = state.foods.filter((f) =>
    (f.name + f.aliases).toLowerCase().includes(q),
  );
  $("suggestions").innerHTML =
    foods
      .slice(0, 8)
      .map(
        (f) =>
          `<button type="button" data-food="${f.id}"><span>${esc(f.emoji || "◦")} ${esc(f.name)}</span><small>${fmt(f.kcal)} kcal / ${f.amount}${unitLabel(f.unit)}</small></button>`,
      )
      .join("") +
    (q
      ? `<button type="button" data-custom="1"><span>＋「${esc($("foodSearch").value.trim())}」を入力</span><small>PFCは手入力</small></button>`
      : "");
  $("suggestions").hidden = false;
}
const unitLabel = (u) => ({ g: "g", piece: "個", serving: "食分" })[u];
function amountFor(f, u) {
  if (u === f.unit) return f.amount;
  if (u === "g") return f.grams || null;
  if (u === "serving") return 1;
  return null;
}
function openEditor(f, e = null) {
  reference = clone(f);
  editing = e?.id || null;
  const remembered = !e && state.memories[f.id];
  working = e
    ? clone(e)
    : remembered
      ? { ...clone(remembered), id: undefined }
      : { ...clone(f), foodId: f.id, rate: 0, eatingOut: false };
  working.meal = e?.meal || $("mealSelect").value || "lunch";
  working.time = e?.time || state.meals.find((m) => m.id === working.meal).time;
  const factor = working.eatingOut ? 1 + working.rate / 100 : 1;
  if (e || remembered)
    for (const k of ["kcal", "p", "f", "c"])
      if (working[k] !== null) working[k] /= factor;
  $("foodSearch").value = working.name;
  $("editor").hidden = false;
  $("quickHint").hidden = true;
  $("suggestions").hidden = true;
  $("mealSelect").value = working.meal;
  $("timeInput").value = working.time;
  $("saveFood").textContent = e ? "変更を保存" : "＋ 記録する";
  showWorking();
}
function showWorking() {
  if (!working) return;
  estimatePfc();
  const factor = working.eatingOut ? 1 + working.rate / 100 : 1;
  for (const k of ["kcal", "p", "f", "c"])
    $(k === "kcal" ? "kcalInput" : k + "Input").value =
      working[k] === null ? "" : Math.round(working[k] * factor * 10) / 10;
  $("quantityInput").value = Math.round(working.amount * 100) / 100;
  $("quantityUnit").value = working.unit;
  $("quantityHint").textContent =
    `基準 ${reference.amount}${unitLabel(reference.unit)} · PFCは候補の目安`;
  $("eatingOut").checked = working.eatingOut;
  $("rateControls").hidden = !working.eatingOut;
  $("rateLabel").textContent =
    (working.rate >= 0 ? "+" : "") + working.rate + "%";
  dirtyFields.clear();
  renderRatio();
}
function syncWorking() {
  if (!working) return;
  const factor = working.eatingOut ? 1 + working.rate / 100 : 1;
  for (const k of ["kcal", "p", "f", "c"]) {
    const id = k === "kcal" ? "kcalInput" : k + "Input";
    if (!dirtyFields.has(id)) continue;
    const v = $(id).value;
    working[k] = v === "" && k !== "kcal" ? null : Number(v) / factor;
  }
  dirtyFields.clear();
}
function scaleWorking(factor) {
  working.kcal *= factor;
  for (const k of ["p", "f", "c"])
    if (working[k] !== null) working[k] *= factor;
  working.amount *= factor;
  showWorking();
}
function adjustKcal(next) {
  syncWorking();
  const current = Number($("kcalInput").value);
  if (current > 0) scaleWorking(Math.max(0, next) / current);
  else {
    working.kcal =
      Math.max(0, next) / (working.eatingOut ? 1 + working.rate / 100 : 1);
    working.p = working.f = working.c = null;
    showWorking();
  }
}
function cancel() {
  working = reference = editing = null;
  $("editor").hidden = true;
  $("quickHint").hidden = false;
  $("suggestions").hidden = true;
  $("foodSearch").value = "";
}
$("fractionButtons").innerHTML =
  [8, 5, 4, 3, 2]
    .map((n) => `<button type="button" data-fraction="${n}">1/${n}</button>`)
    .join("") + '<button type="button" data-factor="2">×2</button>';
$("deltaButtons").innerHTML = [-200, -100, -50, -20, -10, 10, 20, 50, 100, 200]
  .map(
    (n) =>
      `<button type="button" data-delta="${n}">${n > 0 ? "+" : ""}${n}</button>`,
  )
  .join("");
function dateForTime(day, time) {
  for (const d of [shift(day, -1), day, shift(day, 1)])
    if (belonging({ date: d, time }) === day) return d;
  return null;
}
function move(id, meal) {
  const entry = state.entries.find((e) => e.id === id);
  if (!entry || entry.meal === meal) return;
  const day = belonging(entry),
    time = state.meals.find((m) => m.id === meal).time,
    actual = dateForTime(day, time);
  if (!actual)
    return toast(
      "移動先の開始時刻がこの日に入りません。区切りを調整してください。",
    );
  change(() => {
    state.completed[day] = false;
    entry.meal = meal;
    entry.time = time;
    entry.date = actual;
  }, "食事を移動し、開始時刻へ合わせました");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.view) view(b.dataset.view);
  if (b.dataset.food) {
    const f = state.foods.find((x) => x.id === b.dataset.food);
    openEditor(f);
  }
  if (b.dataset.custom)
    openEditor({
      id: uid(),
      name: $("foodSearch").value.trim(),
      kcal: null,
      p: null,
      f: null,
      c: null,
      unit: "serving",
      amount: 1,
      grams: null,
      emoji: "◦",
    });
  if (b.dataset.fraction) {
    syncWorking();
    scaleWorking(1 / Number(b.dataset.fraction));
  }
  if (b.dataset.factor) {
    syncWorking();
    scaleWorking(Number(b.dataset.factor));
  }
  if (b.dataset.delta)
    adjustKcal(Number($("kcalInput").value) + Number(b.dataset.delta));
  if (b.dataset.edit) {
    const entry = state.entries.find((x) => x.id === b.dataset.edit);
    view("home");
    openEditor(
      state.foods.find((f) => f.id === entry.foodId) || {
        ...entry,
        amount: entry.amount || 1,
        unit: entry.unit || "serving",
      },
      entry,
    );
    $("foodForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (b.dataset.delete) {
    const entry = state.entries.find((x) => x.id === b.dataset.delete);
    change(() => {
      state.completed[belonging(entry)] = false;
      state.entries = state.entries.filter((x) => x.id !== entry.id);
    }, "削除しました。↶ で元に戻せます");
    if (editing === entry.id) cancel();
  }
  if (b.dataset.add) {
    cancel();
    $("mealSelect").value = b.dataset.add;
    $("foodSearch").focus();
    suggestions();
    $("foodForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (b.dataset.day) {
    switchDay(b.dataset.day);
    view("home");
  }
  if (b.classList.contains("close-dialog")) b.closest("dialog").close();
  if (b.dataset.catalogEdit) editFood(b.dataset.catalogEdit);
});
$("foodSearch").oninput = () => {
  if (working && !editing) working = null;
  suggestions();
};
$("foodSearch").onfocus = () => {
  if (!working) suggestions();
};
$("foodSearch").onkeydown = (e) => {
  if (e.isComposing) return;
  if (e.key === "Escape") $("suggestions").hidden = true;
  if (e.key === "Enter") {
    if (!$("suggestions").hidden) {
      e.preventDefault();
      $("suggestions").querySelector("button")?.click();
    } else if (!working) {
      e.preventDefault();
      if ($("foodSearch").value.trim())
        openEditor({
          id: uid(),
          name: $("foodSearch").value.trim(),
          kcal: null,
          p: null,
          f: null,
          c: null,
          unit: "serving",
          amount: 1,
          grams: null,
        });
    }
  }
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) $("suggestions").hidden = true;
});
$("quantityInput").onchange = () => {
  syncWorking();
  const next = Number($("quantityInput").value);
  if (next < 0 || !Number.isFinite(next)) return;
  if (working.amount > 0) scaleWorking(next / working.amount);
  else {
    const baseAmount = amountFor(reference, working.unit);
    working.kcal = reference.kcal;
    for (const k of ["p", "f", "c"]) working[k] = reference[k];
    working.amount = baseAmount;
    scaleWorking(next / baseAmount);
  }
};
$("quantityUnit").onchange = () => {
  const unit = $("quantityUnit").value,
    a = amountFor(reference, unit),
    old = amountFor(reference, working.unit);
  if (a === null || old === null) {
    toast("この食品にはその単位の換算値がありません");
    $("quantityUnit").value = working.unit;
    return;
  }
  working.amount = (working.amount / old) * a;
  working.unit = unit;
  showWorking();
};
$("eatingOut").onchange = () => {
  syncWorking();
  working.eatingOut = $("eatingOut").checked;
  showWorking();
};
$("rateDown").onclick = () => {
  syncWorking();
  working.rate = Math.max(-90, working.rate - 10);
  showWorking();
};
$("rateUp").onclick = () => {
  syncWorking();
  working.rate = Math.min(200, working.rate + 10);
  showWorking();
};
$("mealSelect").onchange = () => {
  if (working) {
    working.meal = $("mealSelect").value;
    working.time = state.meals.find((m) => m.id === working.meal).time;
    delete working.fixedDate;
    $("timeInput").value = working.time;
    if (!dateForTime(selected, working.time))
      toast(
        "この日の区切りには開始時刻が入りません。時刻か区切りを調整してください。",
      );
  }
};
$("resetKcal").onclick = () => {
  if (working) {
    const context = {
      meal: working.meal,
      eatingOut: working.eatingOut,
      rate: working.rate,
    };
    working = { ...working, ...clone(reference), ...context };
    showWorking();
  }
};
$("cancelEdit").onclick = cancel;
$("foodForm").onsubmit = (e) => {
  e.preventDefault();
  if (e.isComposing || !working) return;
  syncWorking();
  const name = $("foodSearch").value.trim(),
    factor = working.eatingOut ? 1 + working.rate / 100 : 1;
  if (!name || !Number.isFinite(working.kcal) || working.kcal < 0) return;
  const time = $("timeInput").value;
  if (!time) return;
  let realDay = working.fixedDate || dateForTime(selected, time);
  if (!realDay)
    return toast(
      "この時刻は選択した日に入りません。時刻か1日の区切りを変更してください。",
    );
  const item = {
    id: editing || uid(),
    foodId: working.foodId || reference.id,
    name,
    date: realDay,
    time,
    meal: $("mealSelect").value,
    kcal: working.kcal * factor,
    p: working.p === null ? null : working.p * factor,
    f: working.f === null ? null : working.f * factor,
    c: working.c === null ? null : working.c * factor,
    unit: working.unit,
    amount: working.amount,
    eatingOut: working.eatingOut,
    rate: working.rate,
    estimated: true,
    pfcEstimated: !!working.pfcEstimated,
    ratios: working.ratios || null,
  };
  change(
    () => {
      const previous = state.entries.find((x) => x.id === item.id);
      if (previous) state.completed[belonging(previous)] = false;
      state.entries = state.entries.filter((x) => x.id !== item.id);
      state.entries.push(item);
      state.completed[selected] = false;
      state.memories[item.foodId] = clone(item);
      if (!state.foods.some((x) => x.id === item.foodId))
        state.foods.push({
          ...clone(reference),
          aliases: reference.aliases || "",
          name: item.name,
          kcal: working.kcal,
          p: working.p,
          f: working.f,
          c: working.c,
          amount: working.amount,
          unit: working.unit,
          pfcEstimated: !!working.pfcEstimated,
          ratios: working.ratios || null,
        });
    },
    editing ? "記録を更新しました" : "食事を記録しました",
  );
  cancel();
};
async function switchDay(d) {
  if (!(await saveQueue))
    return toast("保存が完了していません。JSONを保管するか再試行してください");
  selected = d;
  cancel();
  const fresh = await store.read(mode, selected);
  if (fresh) {
    state = fresh;
    baselines[mode] = clone(fresh);
    seenRevisions[mode] = fresh._rev;
  }
  render();
}
$("prevDay").onclick = () => switchDay(shift(selected, -1));
$("nextDay").onclick = () => switchDay(shift(selected, 1));
$("dayInput").onchange = (e) => {
  if (e.target.value) switchDay(e.target.value);
};
$("todayBtn").onclick = () => switchDay(today);
$("completeDay").onclick = () =>
  change(
    () => (state.completed[selected] = !state.completed[selected]),
    state.completed[selected]
      ? "入力途中に戻しました"
      : "この日の記録を完了しました",
  );
$("boundary").oninput = (e) =>
  ($("boundaryLabel").textContent = boundaryText(Number(e.target.value)));
$("boundary").onchange = (e) =>
  change(() => {
    state.boundaries[selected] = Number(e.target.value);
    for (const d of [shift(selected, -1), selected, shift(selected, 1)])
      state.completed[d] = false;
  }, "区切りを変更しました。移動した食事を確認してください");
$("undoBtn").onclick = () => {
  if (!undo.length) return;
  const patch = undo.pop();
  redo.push(patch);
  CaloriStore.apply(state, patch, "before");
  save();
  cancel();
  render();
  toast("元に戻しました");
};
$("redoBtn").onclick = () => {
  if (!redo.length) return;
  const patch = redo.pop();
  undo.push(patch);
  CaloriStore.apply(state, patch);
  save();
  cancel();
  render();
  toast("やり直しました");
};
let dragging = null;
$("timeline").addEventListener("dragstart", (e) => {
  const row = e.target.closest("[data-entry]");
  if (!row) return;
  dragging = row.dataset.entry;
  e.dataTransfer.setData("text/plain", dragging);
});
$("timeline").addEventListener("dragover", (e) => {
  const block = e.target.closest("[data-meal]");
  if (block) {
    e.preventDefault();
    block.classList.add("drag-over");
  }
});
$("timeline").addEventListener("dragleave", (e) =>
  e.target.closest("[data-meal]")?.classList.remove("drag-over"),
);
$("timeline").addEventListener("drop", (e) => {
  const block = e.target.closest("[data-meal]");
  if (block) {
    e.preventDefault();
    move(e.dataTransfer.getData("text/plain"), block.dataset.meal);
  }
  document
    .querySelectorAll(".drag-over")
    .forEach((x) => x.classList.remove("drag-over"));
});
$("timeline").addEventListener("dragend", () =>
  document
    .querySelectorAll(".drag-over")
    .forEach((x) => x.classList.remove("drag-over")),
);
let touchDrag = null;
$("timeline").addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" || !e.target.closest(".drag-handle")) return;
  e.preventDefault();
  touchDrag = e.target.closest("[data-entry]").dataset.entry;
  e.target.setPointerCapture(e.pointerId);
});
$("timeline").addEventListener("pointermove", (e) => {
  if (!touchDrag) return;
  document
    .querySelectorAll(".drag-over")
    .forEach((x) => x.classList.remove("drag-over"));
  document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest("[data-meal]")
    ?.classList.add("drag-over");
});
$("timeline").addEventListener("pointerup", (e) => {
  if (!touchDrag) return;
  const id = touchDrag;
  touchDrag = null;
  const block = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest("[data-meal]");
  if (block) move(id, block.dataset.meal);
  document
    .querySelectorAll(".drag-over")
    .forEach((x) => x.classList.remove("drag-over"));
});
$("timeline").addEventListener("pointercancel", () => {
  touchDrag = null;
  document
    .querySelectorAll(".drag-over")
    .forEach((x) => x.classList.remove("drag-over"));
});
function dailyMap() {
  const cutoff = CaloriStore.cutoff(),
    map = new Map();
  for (const e of state.entries) {
    const d = belonging(e);
    if (d >= cutoff) map.set(d, (map.get(d) || 0) + e.kcal);
  }
  for (const [d, done] of Object.entries(state.completed))
    if (done && d >= cutoff && !map.has(d)) map.set(d, 0);
  return map;
}
function heat(k, day = today) {
  const goal = CaloriStore.goalAt(state, day);
  if (!goal) return "#f2f5f1";
  const r = k / goal;
  return r <= 1
    ? `hsl(105 26% ${96 - r * 13}%)`
    : `hsl(${Math.max(4, 35 - (r - 1) * 65)} 42% ${Math.max(76, 91 - (r - 1) * 23)}%)`;
}
function renderStats() {
  const map = dailyMap(),
    year = month.getFullYear(),
    m = month.getMonth();
  $("monthTitle").textContent = `${year}年 ${m + 1}月`;
  const first = new Date(year, m, 1, 12),
    start = new Date(first);
  start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
  let html = "";
  for (let w = 0; w < 6; w++) {
    let cells = "",
      sum = 0,
      hasArchive = false;
    for (let j = 0; j < 7; j++) {
      const d = new Date(start);
      d.setDate(d.getDate() + w * 7 + j);
      const k = key(d),
        v = map.get(k),
        archived = k < CaloriStore.cutoff();
      hasArchive = hasArchive || archived;
      sum += v || 0;
      cells += `<button class="calendar-day ${d.getMonth() !== m ? "outside" : ""} ${k === today ? "today" : ""}" ${v !== undefined ? `style="background:${heat(v, k)}"` : ""} data-day="${k}" aria-label="${k} ${archived ? "年次集計対象・日別履歴を開く" : v === undefined ? "未記録" : fmt(v) + "kcal"}"><span>${d.getDate()}${state.completed[k] ? "" : "·"}</span><small>${archived ? "履歴" : v === undefined ? "—" : fmt(v)}</small></button>`;
    }
    html += `<div class="calendar-week">${cells}<span class="week-total">${hasArchive ? "年次" : sum ? fmt(sum) : "—"}</span></div>`;
    const next = new Date(start);
    next.setDate(next.getDate() + (w + 1) * 7);
    if (next.getMonth() !== m && next > first) break;
  }
  $("calendar").innerHTML = html;
  $("currentWeightLabel").innerHTML =
    state.currentWeight === null
      ? "未設定"
      : state.currentWeight.toFixed(1) + "<small> kg</small>";
  $("goalWeightLabel").innerHTML =
    state.goalWeight === null
      ? "未設定"
      : state.goalWeight.toFixed(1) + "<small> kg</small>";
  const recent = [...map].filter(
    ([d]) => d >= shift(today, -6) && d <= today && state.completed[d],
  );
  const scored = recent.filter(([d]) => CaloriStore.goalAt(state, d) !== null),
    budget = scored.reduce((a, [d]) => a + CaloriStore.goalAt(state, d), 0),
    ratio = budget ? scored.reduce((a, x) => a + x[1], 0) / budget : 1,
    over = budget > 0 && ratio > 1.05;
  $("scaleBeam").style.transform =
    `rotate(${recent.length ? Math.max(-13, Math.min(13, (ratio - 1) * 35)) : 0}deg)`;
  $("scaleBeam").style.background = over ? "#c78d75" : "#8fa37c";
  $("paceStatus").style.background = over ? "#fbefe8" : "#f3f7ee";
  $("paceStatus").style.color = over ? "#b27a60" : "#6f8a5c";
  $("paceStatus").textContent = !CaloriStore.goalAt(state, today)
    ? "目標の設定後にペースを表示します"
    : recent.length
      ? over
        ? "少しオーバーペース。ゆっくり整えましょう。"
        : "今のところ、目標の範囲内です。"
      : "完了した日の記録からペースを表示します";
  renderPeriods(map);
  renderAnnual();
}
function monthKey(offset) {
  const d = date(today);
  d.setMonth(d.getMonth() + offset, 1);
  return key(d);
}
function renderPeriods(map) {
  const d = date(today),
    mi = d.getMonth(),
    year = d.getFullYear(),
    quarter = key(new Date(year, Math.floor(mi / 3) * 3, 1, 12)),
    half = key(new Date(year, mi < 6 ? 0 : 6, 1, 12)),
    ys = `${year}-01-01`,
    week = shift(today, -((d.getDay() + 6) % 7));
  const monthEnd = (y, m) => key(new Date(y, m + 1, 0, 12));
  const specs = [
    ["今週", "THIS WEEK", week, shift(week, 6), week, "日", 1],
    [
      "今月",
      "THIS MONTH",
      monthKey(0),
      monthEnd(year, Math.floor(mi / 3) * 3 + 2),
      quarter,
      "週",
      7,
    ],
    [
      "3か月",
      "THIS QUARTER",
      quarter,
      monthEnd(year, mi < 6 ? 5 : 11),
      half,
      "週",
      7,
    ],
    ["半年", "THIS HALF YEAR", half, `${year}-12-31`, ys, "週", 7],
  ];
  $("periodCards").innerHTML = specs
    .map(([title, en, begin, deadline, context, unit, mult]) => {
      const records = [...map].filter(([day]) => day >= begin && day <= today),
        done = records.filter(([day]) => state.completed[day]),
        scored = [...map].filter(
          ([day]) =>
            day >= context &&
            day <= today &&
            state.completed[day] &&
            CaloriStore.goalAt(state, day) !== null,
        ),
        surplus = scored.reduce(
          (a, [day, kcal]) => a + kcal - CaloriStore.goalAt(state, day),
          0,
        ),
        sum = records.reduce((a, x) => a + x[1], 0),
        remaining = Math.max(
          0,
          Math.round((date(deadline) - date(today)) / 86400000),
        ),
        future = daysBetween(shift(today, 1), deadline),
        futureBudget = future.reduce(
          (a, day) => a + (CaloriStore.goalAt(state, day) || 0),
          0,
        ),
        adjust = remaining ? (-surplus / remaining) * mult : 0;
      return `<section class="card period-card"><div class="card-heading"><h2>${title}の記録</h2><span class="small-label">${en}</span></div><div class="period-number">${fmt(sum)} <small>kcal</small></div><div class="period-detail"><span>完了 ${done.length}日 / 記録 ${records.length}日</span><span>${deadline.slice(5).replace("-", "/")}まで</span></div><div class="period-advice"><div>翌日以降の差分調整<br><span class="muted">残り ${remaining}日 · 予算 ${fmt(futureBudget - surplus)} kcal</span></div><strong>${remaining && futureBudget ? (adjust >= 0 ? "+" : "−") + fmt(Math.abs(adjust)) : "—"}<small> kcal / ${unit}</small></strong></div><p class="footnote">当時の目標がある完了日だけを比較。差分は予算の参考値で、自動的に摂取量を強制しません。${state.goalHistory?.some((p) => p.legacyAssumption) ? "旧版の目標履歴は現在値を仮適用しています。" : ""}</p></section>`;
    })
    .join("");
}
function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to && out.length < 740; d = shift(d, 1)) out.push(d);
  return out;
}
function renderAnnual() {
  $("windowNote").textContent =
    `通常集計は ${CaloriStore.cutoff()} 以降。古い原本は保存し、年次キャッシュには集計範囲を明記します。`;
  $("annualSummaries").innerHTML =
    Object.values(state._annual || {})
      .sort((a, b) => b.year.localeCompare(a.year))
      .map(
        (a) =>
          `<div class="annual-row"><div><strong>${a.year}年</strong><small> ${a.from}〜${a.through} / ${a.entries}件</small></div><span>${fmt(a.kcal)} kcal</span></div>`,
      )
      .join("") || '<p class="footnote">2年より前の記録はまだありません。</p>';
}
$("prevMonth").onclick = () => {
  month.setMonth(month.getMonth() - 1, 1);
  renderStats();
};
$("nextMonth").onclick = () => {
  month.setMonth(month.getMonth() + 1, 1);
  renderStats();
};
function closeMenu() {
  $("drawer").hidden = true;
  $("scrim").hidden = true;
  $("menuBtn").setAttribute("aria-expanded", "false");
}
$("menuBtn").onclick = () => {
  $("drawer").hidden = false;
  $("scrim").hidden = false;
  $("menuBtn").setAttribute("aria-expanded", "true");
  $("closeMenu").focus();
};
$("closeMenu").onclick = () => {
  closeMenu();
  $("menuBtn").focus();
};
$("scrim").onclick = closeMenu;
$("drawer").onkeydown = (e) => {
  if (e.key === "Escape") closeMenu();
  if (e.key === "Tab") {
    const bs = [...$("drawer").querySelectorAll("button")];
    if (e.shiftKey && document.activeElement === bs[0]) {
      e.preventDefault();
      bs.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === bs.at(-1)) {
      e.preventDefault();
      bs[0].focus();
    }
  }
};
function goals() {
  closeMenu();
  $("goalKcal").value = state.goal ?? "";
  $("currentWeight").value = state.currentWeight ?? "";
  $("goalWeight").value = state.goalWeight ?? "";
  $("goalEffective").min = today;
  $("goalEffective").value = state.goalHistory?.length
    ? shift(today, 1)
    : today;
  $("goalPreview").textContent = "変更内容を入力して再計算してください。";
  $("goalDialog").showModal();
}
$("editGoal").onclick = goals;
$("goalMenu").onclick = goals;
$("recalculateGoal").onclick = previewGoal;
$("goalForm").onsubmit = (e) => {
  e.preventDefault();
  const target = Number($("goalKcal").value),
    effective = $("goalEffective").value;
  if (!Number.isFinite(target) || target <= 0 || effective < today) return;
  if (
    effective === today &&
    state.goalHistory?.length &&
    !confirm("今日全体の目標を変更して再計算します。昨日以前は変更しません。")
  )
    return;
  change(() => {
    state.goal = target;
    state.goalHistory ??= [];
    state.goalHistory.push({
      id: uid(),
      effectiveDate: effective,
      target,
      source: "manual-v1",
      input: {
        currentWeight:
          $("currentWeight").value === ""
            ? null
            : Number($("currentWeight").value),
        goalWeight:
          $("goalWeight").value === "" ? null : Number($("goalWeight").value),
      },
      committedRevision: (state._rev || 0) + 1,
      createdAt: new Date().toISOString(),
    });
    state.currentWeight =
      $("currentWeight").value === "" ? null : Number($("currentWeight").value);
    state.goalWeight =
      $("goalWeight").value === "" ? null : Number($("goalWeight").value);
  }, `${effective}からの目標を保存し、予算を再計算しました`);
  $("goalDialog").close();
};
function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(
      new Blob([content], { type: type + ";charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function backup() {
  await saveQueue;
  let full;
  try {
    full = await store.full(mode);
  } catch {}
  full = full || { ...CaloriStore.clean(state), entries: clone(state.entries) };
  for (const p of pendingPatches[mode]) CaloriStore.apply(full, p);
  download(
    `caloritype-${mode}-${today}.json`,
    JSON.stringify(
      {
        kind: "caloritype-backup",
        mode,
        exportedAt: new Date().toISOString(),
        state: full,
      },
      null,
      2,
    ),
  );
  closeMenu();
}
$("jsonExport").onclick = backup;
$("mdExport").onclick = async () => {
  await saveQueue;
  const exportFull = (await store.full(mode)) || {
    entries: clone(state.entries),
  };
  for (const p of pendingPatches[mode]) CaloriStore.apply(exportFull, p);
  const archived = exportFull.entries;
  let md =
    "# CaloriType 食事記録\n\n> " +
    (mode === "demo"
      ? "デモモード。サンプルを含みます。"
      : "記録モード（試用）の書き出し。") +
    "\n\n";
  for (const day of [...new Set(archived.map(belonging))].sort().reverse()) {
    md += `## ${day} — ${fmt(total(archived.filter((e) => belonging(e) === day)).kcal)} kcal\n\n| 時刻 | 食事 | 食品 | kcal | P | F | C |\n| --- | --- | --- | ---: | ---: | ---: | ---: |\n`;
    for (const e of archived.filter((e) => belonging(e) === day))
      md += `| ${e.time} | ${state.meals.find((m) => m.id === e.meal)?.name || "—"} | ${e.name.replace(/[|\r\n]/g, " ")} | ${Math.round(e.kcal)} | ${macroText(e.p)} | ${macroText(e.f)} | ${macroText(e.c)} |\n`;
    md += "\n";
  }
  download(`caloritype-${today}.md`, md, "text/markdown");
  closeMenu();
};
function validState(s) {
  if (!extraSchemaCheck(s)) return false;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.entries) ||
    s.entries.length > 1000000 ||
    !Array.isArray(s.foods) ||
    !Array.isArray(s.meals) ||
    !s.meals.length ||
    !s.boundaries ||
    !s.completed ||
    !s.memories ||
    !(s.goal === null || (Number.isFinite(s.goal) && s.goal > 0)) ||
    !(s.currentWeight === null || Number.isFinite(s.currentWeight)) ||
    !(s.goalWeight === null || Number.isFinite(s.goalWeight)) ||
    !Number.isInteger(s.historyLimit) ||
    s.historyLimit < 1 ||
    s.historyLimit > 10000
  )
    return false;
  const ids = new Set();
  for (const e of s.entries) {
    if (
      typeof e.id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(e.id) ||
      ids.has(e.id) ||
      typeof e.name !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time) ||
      !Number.isFinite(e.kcal) ||
      e.kcal < 0 ||
      !s.meals.some((m) => m.id === e.meal) ||
      !["p", "f", "c"].every(
        (k) => e[k] === null || (Number.isFinite(e[k]) && e[k] >= 0),
      )
    )
      return false;
    ids.add(e.id);
  }
  return (
    s.foods.every(
      (f) =>
        typeof f.id === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(f.id) &&
        typeof f.name === "string" &&
        typeof f.aliases === "string" &&
        Number.isFinite(f.kcal) &&
        f.kcal >= 0 &&
        Number.isFinite(f.amount) &&
        f.amount > 0 &&
        ["serving", "g", "piece"].includes(f.unit) &&
        ["p", "f", "c"].every(
          (k) => f[k] === null || (Number.isFinite(f[k]) && f[k] >= 0),
        ),
    ) &&
    s.meals.every(
      (m) =>
        typeof m.id === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(m.id) &&
        typeof m.name === "string" &&
        /^#[0-9a-f]{6}$/i.test(m.bg) &&
        typeof m.time === "string",
    ) &&
    Object.values(s.boundaries).every(
      (v) => Number.isFinite(v) && v >= 20 && v <= 30,
    )
  );
}
$("restoreMenu").onclick = () => {
  closeMenu();
  $("restoreFile").click();
};
$("restoreFile").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100e6) throw new Error("ファイルが大きすぎます");
    const parsed = JSON.parse(await file.text());
    if ((parsed.mode ?? "demo") !== mode)
      throw new Error(
        "バックアップと現在のモードが違います。対応するモードへ切り替えてください",
      );
    if (parsed.kind !== "caloritype-backup" || !validState(parsed.state))
      throw new Error("対応する形式のバックアップではありません");
    if (
      !confirm(
        `${parsed.state.entries.length}件の記録で全体を置き換えます。現在のバックアップを先に書き出します。`,
      )
    )
      return;
    await backup();
    state = await store.replace(mode, {
      ...parsed.state,
      _assumeLegacyGoal: parsed.state.goalHistory === undefined,
    });
    pendingPatches[mode] = [];
    baselines[mode] = clone(state);
    seenRevisions[mode] = state._rev;
    undo = [];
    redo = [];
    cancel();
    render();
    toast("復元しました");
  } catch (err) {
    toast("復元できません：" + err.message);
  } finally {
    e.target.value = "";
  }
};
function catalog() {
  $("catalogList").innerHTML = state.foods
    .map(
      (f) =>
        `<div class="catalog-item"><div><strong>${esc(f.name)}</strong><small>${f.amount}${unitLabel(f.unit)} · ${fmt(f.kcal)} kcal · P ${macroText(f.p)} / F ${macroText(f.f)} / C ${macroText(f.c)}</small></div><button data-catalog-edit="${f.id}">編集</button></div>`,
    )
    .join("");
}
let catalogEditing = null;
$("catalogMenu").onclick = () => {
  closeMenu();
  catalog();
  $("catalogDialog").showModal();
};
function editFood(id) {
  const food = state.foods.find((x) => x.id === id);
  if (!food) return;
  catalogEditing = id;
  openFoodForm(food);
}
function openFoodForm(food) {
  $("catalogDialog").close();
  $("foodEditName").value = food.name || "";
  $("foodEditAliases").value = food.aliases || "";
  $("foodEditAmount").value = food.amount || 1;
  $("foodEditUnit").value = food.unit || "serving";
  $("foodEditGrams").value = food.grams ?? "";
  $("foodEditKcal").value = food.kcal ?? "";
  for (const k of ["p", "f", "c"])
    $("foodEdit" + k.toUpperCase()).value = food[k] ?? "";
  $("foodEditDialog").showModal();
}
$("addCatalogFood").onclick = () => {
  catalogEditing = null;
  openFoodForm({});
};
$("cancelFoodEdit").onclick = () => {
  $("foodEditDialog").close();
  catalog();
  $("catalogDialog").showModal();
};
$("foodEditForm").onsubmit = (e) => {
  e.preventDefault();
  const food = {
    id: catalogEditing || uid(),
    name: $("foodEditName").value.trim(),
    aliases: $("foodEditAliases").value.trim(),
    unit: $("foodEditUnit").value,
    amount: Number($("foodEditAmount").value),
    grams:
      $("foodEditGrams").value === "" ? null : Number($("foodEditGrams").value),
    kcal: Number($("foodEditKcal").value),
    emoji: "◦",
    source: "本人が登録・編集した値",
  };
  for (const k of ["p", "f", "c"])
    food[k] =
      $("foodEdit" + k.toUpperCase()).value === ""
        ? null
        : Number($("foodEdit" + k.toUpperCase()).value);
  if (!food.name || food.amount <= 0) return;
  change(() => {
    state.foods = state.foods.filter((f) => f.id !== food.id);
    state.foods.push(food);
    delete state.memories[food.id];
  }, "食品を保存しました。過去の食事は保持されます");
  $("foodEditDialog").close();
  catalog();
  $("catalogDialog").showModal();
};
$("catalogExport").onclick = () =>
  download(
    `caloritype-foods-${today}.json`,
    JSON.stringify(
      { kind: "caloritype-foods", version: 1, mode, foods: state.foods },
      null,
      2,
    ),
  );
$("catalogImport").onclick = () => $("catalogFile").click();
$("catalogFile").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5e6) throw new Error("ファイルが大きすぎます");
    const p = JSON.parse(await file.text());
    if ((p.mode ?? "demo") !== mode)
      throw new Error("食品データと現在のモードが違います");
    const test = { ...state, foods: p.foods };
    if (p.kind !== "caloritype-foods" || p.version !== 1 || !validState(test))
      throw new Error("食品データの形式が違います");
    if (
      !confirm(
        `${p.foods.length}件の食品を同じIDで上書き・追加します。事前にバックアップを書き出します。`,
      )
    )
      return;
    await backup();
    change(() => {
      const map = new Map(state.foods.map((f) => [f.id, f]));
      for (const f of p.foods) {
        map.set(f.id, f);
        delete state.memories[f.id];
      }
      state.foods = [...map.values()];
    }, "食品データを上書きしました");
    catalog();
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
$("settingsMenu").onclick = () => {
  closeMenu();
  $("historyLimit").value = state.historyLimit;
  $("showQuotes").checked = state.showQuotes;
  $("mealSettings").innerHTML = state.meals
    .map(
      (m) =>
        `<label>${esc(m.name)}<div class="meal-setting-row"><input data-meal-name="${m.id}" value="${esc(m.name)}" maxlength="20" required><input data-meal-time="${m.id}" type="time" value="${m.time}" aria-label="${esc(m.name)}の開始時刻" required></div></label>`,
    )
    .join("");
  $("settingsDialog").showModal();
};
$("settingsForm").onsubmit = (e) => {
  e.preventDefault();
  const times = [...$("mealSettings").querySelectorAll("[data-meal-time]")].map(
    (i) => i.value,
  );
  if (times.some((v, i) => !v || (i > 0 && v <= times[i - 1])))
    return toast("開始時刻は重複せず、朝食から夜食へ昇順に設定してください");
  change(() => {
    state.historyLimit = Number($("historyLimit").value);
    state.showQuotes = $("showQuotes").checked;
    for (const input of $("mealSettings").querySelectorAll("[data-meal-name]"))
      state.meals.find((m) => m.id === input.dataset.mealName).name =
        input.value.trim() || "食事";
    for (const input of $("mealSettings").querySelectorAll("[data-meal-time]"))
      state.meals.find((m) => m.id === input.dataset.mealTime).time =
        input.value;
    state.meals.forEach(
      (m, i) => (m.rangeEnd = state.meals[(i + 1) % state.meals.length].time),
    );
  }, "設定を更新しました");
  undo = undo.slice(-state.historyLimit);
  $("settingsDialog").close();
};
$("nextQuote").onclick = () => {
  quoteIndex++;
  renderQuote();
};
$("repairMenu").onclick = async () => {
  closeMenu();
  await backup();
  if (!(await save()))
    return toast("未保存の変更があります。書き出したJSONを保管してください");
  try {
    const full = await store.full(mode);
    if (!validState(full)) throw new Error("保存形式が不正です");
    state = await store.rebuild(mode, true);
    baselines[mode] = clone(state);
    seenRevisions[mode] = state._rev;
    render();
    toast("原本を退避し、日付索引と年次キャッシュを再構築しました");
  } catch {
    toast("自動修復できません。書き出したJSONを保管してください。");
  }
};
const lessons = [
  [
    "◒",
    "食事と、ちょうどいい毎日。",
    "これはサンプルで試す操作モックです。食品の数値は目安。データはこのブラウザのIndexedDBに保存されます。",
  ],
  [
    "⌕",
    "打って、あなたの量に。",
    "名前から候補を選び、グラム・個数・分数で調整。外食スイッチと10%刻みの補正も試せます。次回は前回値を補完します。",
  ],
  [
    "⠿",
    "食事も、日付の区切りも。",
    "⠿をつかんで食事間を移動。✎から移動先も編集できます。区切りは15分刻みでスナップ。変更後は所属日を確認してください。",
  ],
  [
    "▥",
    "長い目で、自分のペースを。",
    "記録完了した日だけを長期差分に使います。左上メニューに食品編集・JSON入出力・設定があります。自動目標・モデル推測・本格的な修復は未実装です。",
  ],
];
let lesson = 0;
function showLesson() {
  const l = lessons[lesson];
  $("tutorialVisual").textContent = l[0];
  $("tutorialStep").textContent = `WELCOME · ${lesson + 1} / 4`;
  $("tutorialTitle").textContent = l[1];
  $("tutorialBody").textContent = l[2];
  $("tutorialDots").innerHTML = lessons
    .map((_, i) => `<i class="${i === lesson ? "active" : ""}"></i>`)
    .join("");
  $("nextTutorial").textContent = lesson === 3 ? "記録をはじめる" : "次へ →";
}
function tutorial() {
  closeMenu();
  lesson = 0;
  showLesson();
  $("tutorial").showModal();
}
function finish() {
  $("tutorial").close();
  try {
    localStorage.setItem(DB + ".onboarded", "1");
  } catch {}
}
$("helpBtn").onclick = tutorial;
$("tutorialMenu").onclick = tutorial;
$("skipTutorial").onclick = finish;
$("nextTutorial").onclick = () => {
  if (lesson === 3) finish();
  else {
    lesson++;
    showLesson();
  }
};
document.addEventListener("keydown", (e) => {
  if (e.isComposing) return;
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement.tagName,
  );
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    view("home");
    $("foodSearch").focus();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
    e.preventDefault();
    $(e.shiftKey ? "redoBtn" : "undoBtn").click();
  }
});
function renderMode() {
  $("modeSwitch").value = mode;
  $("modeBar").dataset.mode = mode;
  $("modeCaption").textContent =
    mode === "demo" ? "デモモード" : "記録モード（試用）";
  $("modeDescription").textContent =
    mode === "demo"
      ? "サンプルで自由に試せます。記録モードとは別保存。"
      : "この端末の自分の記録。デモとは別保存。";
  $("resetDemo").hidden = mode !== "demo";
  document.querySelector(".demo-notice").textContent =
    mode === "demo"
      ? "デモ · サンプルデータから始まります"
      : "記録（試用）· 初期食品は参考値／目標は手動設定";
}
async function switchMode(next) {
  if (!["demo", "record"].includes(next) || next === mode) return;
  const previous = mode;
  $("modeSwitch").disabled = true;
  setBusy(true, "保存してモードを切り替えています…");
  try {
    if (working && !confirm("入力中の内容を破棄してモードを切り替えますか？"))
      return;
    if (!(await save())) return;
    const stored = await readDB(next);
    if (stored && !validState(stored))
      throw new Error("切替先の保存データを読めません");
    modeHistories[mode] = { undo, redo };
    mode = next;
    state = stored || (mode === "demo" ? initial() : emptyRecord());
    baselines[mode] = stored ? clone(stored) : null;
    seenRevisions[mode] = stored?._rev || 0;
    ({ undo, redo } = modeHistories[mode]);
    cancel();
    selected = today;
    month = date(today);
    render();
    if (!(await save()))
      toast("切替先を保存できません。JSONを書き出してください");
    try {
      localStorage.setItem(DB + ".mode", mode);
    } catch {}
    toast(
      mode === "demo"
        ? "デモに切り替えました。自分の記録は保持されています。"
        : "記録モードへ切り替えました。目標は手動で設定できます。",
    );
  } catch (err) {
    mode = previous;
    toast(err.message);
  } finally {
    $("modeSwitch").disabled = false;
    $("modeSwitch").value = mode;
    setBusy(false);
  }
}
$("modeSwitch").onchange = (e) => switchMode(e.target.value);
$("resetDemo").onclick = async () => {
  if (
    mode !== "demo" ||
    !confirm("デモの変更をリセットします。記録モードのデータは変わりません。")
  )
    return;
  await saveQueue;
  state = await store.replace(mode, initial());
  pendingPatches[mode] = [];
  baselines[mode] = clone(state);
  seenRevisions[mode] = state._rev;
  undo = [];
  redo = [];
  modeHistories.demo = { undo, redo };
  cancel();
  selected = today;
  render();
  toast("デモだけをリセットしました");
};
(async () => {
  try {
    db = await openDB();
    let stored = await readDB();
    if (stored) {
      if (!validState(stored)) throw new Error("保存データの形式が違います");
      state = stored;
      baselines[mode] = clone(stored);
      seenRevisions[mode] = stored._rev;
    } else state = mode === "demo" ? initial() : emptyRecord();
  } catch (err) {
    state = mode === "demo" ? initial() : emptyRecord();
    document.querySelector(".local-dot").textContent = "保存データを確認";
    toast("保存データを読めません。原本を上書きせずメモリ上で起動します。");
    db = null;
  }
  render();
  if (db) await save();
  setBusy(false);
  try {
    if (!localStorage.getItem(DB + ".onboarded")) setTimeout(tutorial, 600);
  } catch {}
})();

$("kcalInput").onchange = () => {
  if (!working) return;
  const next = Number($("kcalInput").value),
    factor = working.eatingOut ? 1 + working.rate / 100 : 1;
  dirtyFields.delete("kcalInput");
  $("kcalInput").value = working.kcal * factor;
  adjustKcal(next);
};

for (const id of ["kcalInput", "pInput", "fInput", "cInput"])
  $(id).addEventListener("input", () => dirtyFields.add(id));

function estimatePfc() {
  if (!working || !Number.isFinite(working.kcal) || working.kcal <= 0) return;
  if (["p", "f", "c"].some((k) => working[k] === null)) {
    working.pfcEstimated = true;
    working.ratios ??= [15, 25, 60];
    const [p, f, c] = working.ratios;
    working.p = (working.kcal * p) / 100 / 4;
    working.f = (working.kcal * f) / 100 / 9;
    working.c = (working.kcal * c) / 100 / 4;
  }
}
function renderRatio() {
  if (!working) return;
  $("pfcEstimator").hidden = !working.pfcEstimated;
  if (!working.pfcEstimated) return;
  const r = working.ratios || [15, 25, 60];
  $("pfcFirst").value = r[0];
  $("pfcSecond").value = r[0] + r[1];
  $("ratioLabels").innerHTML =
    `<button type="button" data-ratio-focus="pfcFirst">P ${r[0]}%</button><button type="button" data-ratio-focus="pfcSecond">F ${r[1]}%</button><span>C ${r[2]}%</span>`;
  $("ratioTrack").style.setProperty(
    "--ratioBackground",
    `linear-gradient(to right,#6d9bd2 0%,#6d9bd2 ${r[0]}%,#d6af62 ${r[0]}%,#d6af62 ${r[0] + r[1]}%,#72aa8b ${r[0] + r[1]}%,#72aa8b 100%)`,
  );
  $("pfcFirst").setAttribute("aria-valuetext", `P ${r[0]}パーセント`);
  $("pfcSecond").setAttribute(
    "aria-valuetext",
    `PとFの合計 ${r[0] + r[1]}パーセント`,
  );
}
for (const id of ["pfcFirst", "pfcSecond"])
  $(id).oninput = () => {
    if (!working) return;
    syncWorking();
    let a = Number($("pfcFirst").value),
      b = Number($("pfcSecond").value);
    if (id === "pfcFirst") a = Math.min(a, b);
    else b = Math.max(a, b);
    working.ratios = [a, b - a, 100 - b];
    working.pfcEstimated = true;
    working.p = (working.kcal * a) / 100 / 4;
    working.f = (working.kcal * (b - a)) / 100 / 9;
    working.c = (working.kcal * (100 - b)) / 100 / 4;
    showWorking();
  };
$("setNow").onclick = () => {
  if (!working) return;
  const now = new Date(),
    actual = key(now),
    time =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
  const ordered = [...state.meals].sort((a, b) => a.time.localeCompare(b.time));
  working.meal = (
    [...ordered].reverse().find((m) => m.time <= time) || ordered.at(-1)
  ).id;
  working.fixedDate = actual;
  working.time = time;
  selected = belonging({ date: actual, time });
  $("timeInput").value = time;
  renderHome();
  toast("現在の日時を指定しました");
};
$("timeInput").onchange = () => {
  if (working) {
    working.time = $("timeInput").value;
    delete working.fixedDate;
  }
};
function previewGoal() {
  const target = Number($("goalKcal").value),
    effective = $("goalEffective").value;
  if (!target || !effective) return toast("目標と適用日を入力してください");
  const draft = clone(state);
  draft.goalHistory ??= [];
  draft.goalHistory.push({
    id: uid(),
    effectiveDate: effective,
    target,
    committedRevision: Number.MAX_SAFE_INTEGER,
    createdAt: new Date().toISOString(),
  });
  const d = date(today),
    week = shift(today, -((d.getDay() + 6) % 7)),
    end = shift(week, 6),
    map = dailyMap(),
    surplus = [...map]
      .filter(
        ([day]) =>
          day >= week &&
          day <= today &&
          state.completed[day] &&
          CaloriStore.goalAt(draft, day) !== null,
      )
      .reduce((a, [day, v]) => a + v - CaloriStore.goalAt(draft, day), 0),
    future = daysBetween(shift(today, 1), end),
    budget = future.reduce(
      (a, day) => a + (CaloriStore.goalAt(draft, day) || 0),
      0,
    );
  $("goalPreview").textContent =
    `適用日 ${effective} / 新目標 ${fmt(target)} kcal\n今週の過去差分 ${surplus >= 0 ? "+" : ""}${fmt(surplus)} kcal / 翌日以降の予算 ${fmt(budget - surplus)} kcal\n当時の目標を保持し、変更前の差分を引き継ぎます。`;
}
$("rebuildAnnual").onclick = async () => {
  if (!(await save())) return;
  state = await store.rebuild(mode);
  baselines[mode] = clone(state);
  seenRevisions[mode] = state._rev;
  render();
  toast("年次キャッシュを再計算しました");
};
async function handleStoreMessage(msg) {
  if (!msg || typeof msg !== "object" || !Number.isFinite(msg.rev)) return;
  if (msg.client === store.client || msg.mode !== mode) return;
  await saveQueue;
  if (msg.mode !== mode) return;
  const fresh = await readDB();
  if (!fresh || fresh._rev <= (seenRevisions[mode] || 0)) return;
  for (const p of pendingPatches[mode]) CaloriStore.apply(fresh, p);
  state = fresh;
  seenRevisions[mode] = fresh._rev;
  baselines[mode] = clone(fresh);
  render();
  toast("別タブの更新を反映し、後勝ちで再描画・再計算しました。");
}
if (store.channel) store.channel.onmessage = (e) => handleStoreMessage(e.data);
window.addEventListener("storage", (e) => {
  if (e.key === DB + ".notify" && e.newValue)
    try {
      handleStoreMessage(JSON.parse(e.newValue));
    } catch {}
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ratio-focus]");
  if (!b) return;
  for (const id of ["pfcFirst", "pfcSecond"])
    $(id).style.zIndex = id === b.dataset.ratioFocus ? "3" : "1";
  $(b.dataset.ratioFocus).focus();
});

function extraSchemaCheck(s) {
  try {
    if (
      !s ||
      !Array.isArray(s.entries) ||
      !Array.isArray(s.foods) ||
      !Array.isArray(s.meals)
    )
      return false;
    const id = (x) =>
        typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x),
      day = (x) =>
        typeof x === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(x) &&
        !Number.isNaN(date(x).getTime()) &&
        key(date(x)) === x,
      time = (x) =>
        typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x),
      ratio = (x) =>
        x == null ||
        (Array.isArray(x) &&
          x.length === 3 &&
          x.every((v) => Number.isFinite(v) && v >= 0 && v <= 100) &&
          Math.abs(x.reduce((a, b) => a + b, 0) - 100) < 0.001),
      entry = (e) =>
        id(e.id) &&
        day(e.date) &&
        time(e.time) &&
        typeof e.name === "string" &&
        Number.isFinite(e.kcal) &&
        e.kcal >= 0 &&
        typeof e.eatingOut === "boolean" &&
        Number.isFinite(e.rate) &&
        e.rate >= -90 &&
        e.rate <= 200 &&
        Number.isFinite(e.amount) &&
        e.amount >= 0 &&
        ["serving", "g", "piece"].includes(e.unit) &&
        ["p", "f", "c"].every(
          (k) => e[k] === null || (Number.isFinite(e[k]) && e[k] >= 0),
        ) &&
        ratio(e.ratios);
    if (
      !s.entries.every(entry) ||
      !s.meals.every((m) => time(m.time)) ||
      new Set(s.meals.map((m) => m.id)).size !== s.meals.length ||
      new Set(s.meals.map((m) => m.time)).size !== s.meals.length ||
      new Set(s.foods.map((f) => f.id)).size !== s.foods.length
    )
      return false;
    if (
      s.goalHistory !== undefined &&
      (!Array.isArray(s.goalHistory) ||
        !s.goalHistory.every(
          (p) =>
            id(p.id) &&
            day(p.effectiveDate) &&
            Number.isFinite(p.target) &&
            p.target > 0 &&
            p.target <= 10000 &&
            typeof p.createdAt === "string" &&
            Number.isFinite(Date.parse(p.createdAt)) &&
            (p.committedRevision === undefined ||
              (Number.isSafeInteger(p.committedRevision) &&
                p.committedRevision >= 0)),
        ))
    )
      return false;
    if (
      !Object.entries(s.completed || {}).every(
        ([d, v]) => day(d) && typeof v === "boolean",
      ) ||
      !Object.entries(s.boundaries || {}).every(([d]) => day(d))
    )
      return false;
    if (!Object.entries(s.memories || {}).every(([k, e]) => id(k) && entry(e)))
      return false;
    return s.foods.every((f) => ratio(f.ratios));
  } catch {
    return false;
  }
}

function setBusy(b, text) {
  $("bootStatus").hidden = !b;
  if (text) $("bootStatus").textContent = text;
  const app = document.querySelector(".app");
  app.inert = b;
  app.setAttribute("aria-busy", String(b));
}
