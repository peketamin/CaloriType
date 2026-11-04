const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base =
  process.env.CALORITYPE_TEST_URL || "http://127.0.0.1:8080/CaloriType/";
let activeBrowser;
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  activeBrowser = browser;
  const legacyContext = await browser.newContext();
  const legacy = await legacyContext.newPage();
  await legacy.goto(new URL("/legacy-init", base).href);
  await legacy.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("caloritype-prototype-v1/CaloriType", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("data");
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    const d = new Date(),
      day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      entry = {
        id: "legacy-entry",
        foodId: "food-0",
        name: "旧データ",
        date: day,
        time: "12:00",
        meal: "lunch",
        kcal: 123,
        p: 1,
        f: 2,
        c: 3,
        unit: "serving",
        amount: 1,
        eatingOut: false,
        rate: 0,
      };
    await new Promise((resolve, reject) => {
      const t = db.transaction("data", "readwrite");
      t.objectStore("data").put(
        {
          version: 1,
          entries: [entry],
          foods: [
            {
              id: "food-0",
              name: "旧食品",
              aliases: "",
              unit: "serving",
              amount: 1,
              kcal: 123,
              p: 1,
              f: 2,
              c: 3,
            },
          ],
          meals: [
            {
              id: "lunch",
              name: "昼食",
              time: "11:00",
              icon: "◦",
              bg: "#ecf2e7",
            },
          ],
          goal: 2000,
          currentWeight: null,
          goalWeight: null,
          boundaries: {},
          completed: {},
          historyLimit: 1000,
          showQuotes: true,
          memories: {},
        },
        "demo",
      );
      t.oncomplete = resolve;
      t.onerror = reject;
    });
    db.close();
  });
  await legacy.addInitScript(() =>
    localStorage.setItem("caloritype-prototype-v1/CaloriType.onboarded", "1"),
  );
  await legacy.goto(base);
  await legacy.waitForFunction(
    () => document.getElementById("total").textContent === "123",
  );
  await legacyContext.close();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    const name =
      "caloritype-prototype-v1" +
      location.pathname.replace(/\/(?:index\.html)?$/, "");
    localStorage.setItem(name + ".onboarded", "1");
  });
  const p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.locator(".food-row").first().waitFor();
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  assert.ok((await p.locator("#quoteEnglish").innerText()).length > 10);
  await p.locator("#foodSearch").fill("新規PFC推定");
  await p.locator("[data-custom]").click();
  await p.locator("#kcalInput").fill("400");
  await p.locator("#kcalInput").press("Tab");
  assert.equal(await p.locator("#pfcEstimator").isVisible(), true);
  assert.equal(await p.locator("#pInput").inputValue(), "15");
  assert.match(await p.locator("#ratioLabels").innerText(), /15%/);
  await p.locator("#pfcFirst").focus();
  await p.locator("#pfcFirst").press("ArrowRight");
  assert.equal(await p.locator("#pfcFirst").inputValue(), "17.5");
  assert.match(await p.locator("#ratioLabels").innerText(), /22.5%/);
  assert.equal(await p.locator("#pInput").inputValue(), "17.5");
  await p.locator("#mealSelect").selectOption("dinner");
  assert.equal(await p.locator("#timeInput").inputValue(), "17:00");
  await p.locator("#setNow").click();
  assert.match(await p.locator("#timeInput").inputValue(), /^\d\d:\d\d$/);
  await p.locator("#saveFood").click();
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  assert.ok(await p.locator(".tag").filter({ hasText: "PFC推定" }).count());
  await p.locator("#undoBtn").click();
  await p.locator("#redoBtn").click();
  assert.ok(
    await p.locator(".food-info").filter({ hasText: "新規PFC推定" }).count(),
  );
  await p.locator("#menuBtn").click();
  await p.locator("#catalogMenu").click();
  await p
    .locator(".catalog-item")
    .filter({ hasText: "ごはん" })
    .locator("button")
    .click();
  assert.equal(await p.locator("#foodEditDialog").isVisible(), true);
  await p.locator("#foodEditName").fill("ごはん（編集確認）");
  await p.locator("#foodEditKcal").fill("240");
  await p.locator("#foodEditForm .primary").click();
  assert.ok(
    await p
      .locator(".catalog-item")
      .filter({ hasText: "ごはん（編集確認）" })
      .count(),
  );
  await p.locator("#catalogDialog .close-dialog").click();
  await p.locator("#modeSwitch").selectOption("record");
  await p.waitForFunction(
    () =>
      document.getElementById("modeCaption").textContent ===
      "記録モード（試用）",
  );
  await p.locator('header [data-view="stats"]').click();
  await p.locator("#editGoal").click();
  await p.locator("#goalKcal").fill("2000");
  await p.locator("#recalculateGoal").click();
  assert.match(await p.locator("#goalPreview").innerText(), /新目標 2,000/);
  await p.locator("#goalForm .primary").click();
  await p.locator('header [data-view="home"]').click();
  await p.waitForFunction(
    () => document.getElementById("targetLabel").textContent === "2,000",
  );
  await p.locator("#menuBtn").click();
  await p.locator("#goalMenu").click();
  await p.locator("#goalKcal").fill("1800");
  await p.locator("#recalculateGoal").click();
  await p.locator("#goalForm .primary").click();
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  assert.equal(await p.locator("#targetLabel").innerText(), "2,000");
  const goalResult = await p.evaluate(async () => {
    const st = new CaloriStore(
      "caloritype-prototype-v1" +
        location.pathname.replace(/\/(?:index\.html)?$/, ""),
    );
    await st.open();
    const s = await st.read("record"),
      d = CaloriStore.key(new Date()),
      t = new Date();
    t.setDate(t.getDate() + 1);
    const r = {
      today: CaloriStore.goalAt(s, d),
      tomorrow: CaloriStore.goalAt(s, CaloriStore.key(t)),
      plans: s.goalHistory.length,
    };
    st.db.close();
    st.channel?.close();
    return r;
  });
  assert.equal(goalResult.today, 2000);
  assert.equal(goalResult.tomorrow, 1800);
  assert.equal(goalResult.plans, 2);
  // Seed old/recent records via the same repository layer; no app data is committed.
  const seeded = await p.evaluate(async () => {
    const st = new CaloriStore(
      "caloritype-prototype-v1" +
        location.pathname.replace(/\/(?:index\.html)?$/, ""),
    );
    await st.open();
    const s = await st.full("record"),
      cut = CaloriStore.cutoff(),
      oldYear = String(Number(cut.slice(0, 4)) - 2),
      old = oldYear + "-07-04",
      partial =
        cut > cut.slice(0, 4) + "-01-01"
          ? cut.slice(0, 4) + "-01-01"
          : String(Number(cut.slice(0, 4)) - 1) + "-12-31",
      recent = new Date(cut + "T12:00:00");
    recent.setDate(recent.getDate() + 1);
    const rd = CaloriStore.key(recent),
      now = CaloriStore.key(new Date());
    const entry = (id, date, kcal) => ({
      id,
      foodId: "food-0",
      name: id,
      date,
      time: "12:00",
      meal: "lunch",
      kcal,
      p: 10,
      f: 5,
      c: 20,
      unit: "serving",
      amount: 1,
      eatingOut: false,
      rate: 0,
    });
    s.entries = [
      entry("archive-old", old, 400),
      entry("archive-partial", partial, 250),
      entry("recent-record", rd, 123),
      entry("current-record", now, 100),
    ];
    s.completed = { [old]: true, [partial]: true, [rd]: true, [now]: true };
    s.goalHistory = [
      {
        id: "historic-goal",
        effectiveDate: "2000-01-01",
        target: 2000,
        createdAt: "2020-01-01T00:00:00Z",
      },
    ];
    s.goal = 2000;
    await st.replace("record", s);
    const active = await st.read("record"),
      full = await st.full("record");
    const out = {
      old,
      partial,
      oldYear,
      cut,
      active: active.entries.length,
      full: full.entries.length,
      cache: active._annual,
    };
    st.db.close();
    st.channel?.close();
    return out;
  });
  assert.equal(seeded.active, 2);
  assert.equal(seeded.full, 4);
  assert.equal(seeded.cache[seeded.oldYear].kcal, 400);
  assert.equal(seeded.cache[seeded.partial.slice(0, 4)].kcal, 250);
  assert.ok(seeded.cache[seeded.partial.slice(0, 4)].through < seeded.cut);
  const untouched = seeded.cache[seeded.partial.slice(0, 4)].builtAt;
  await p.reload();
  await p.locator('[data-entry="current-record"]').waitFor();
  await p.locator("#dayInput").fill(seeded.old);
  await p.locator("#dayInput").dispatchEvent("change");
  await p.locator('[data-entry="archive-old"]').waitFor();
  await p.locator('[data-entry="archive-old"] .edit-food').click();
  await p.locator("#kcalInput").fill("500");
  await p.locator("#kcalInput").press("Tab");
  await p.locator("#saveFood").click();
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  const cache = await p.evaluate(async () => {
    const st = new CaloriStore(
      "caloritype-prototype-v1" +
        location.pathname.replace(/\/(?:index\.html)?$/, ""),
    );
    await st.open();
    const s = await st.read("record");
    st.db.close();
    st.channel?.close();
    return s._annual;
  });
  assert.equal(cache[seeded.oldYear].kcal, 500);
  assert.equal(cache[seeded.partial.slice(0, 4)].builtAt, untouched);
  await p.locator("#todayBtn").click();
  await p.locator('[data-entry="current-record"]').waitFor();
  const p2 = await context.newPage();
  p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(base);
  await p2.locator('[data-entry="current-record"]').waitFor();
  await p2.locator('[data-entry="current-record"] .edit-food').click();
  await p2.locator("#kcalInput").fill("333");
  await p2.locator("#kcalInput").press("Tab");
  await p.locator('[data-entry="current-record"] .edit-food').click();
  await p.locator("#kcalInput").fill("222");
  await p.locator("#kcalInput").press("Tab");
  await p.locator("#saveFood").click();
  await p2.waitForFunction(() =>
    document.getElementById("toast").textContent.includes("別タブ"),
  );
  await p2.locator("#saveFood").click();
  await p.waitForFunction(() =>
    document
      .querySelector('[data-entry="current-record"] .food-kcal')
      .textContent.includes("333"),
  );
  assert.match(await p.locator("#toast").innerText(), /別タブ/);
  const merged = await p.evaluate(async () => {
    const n =
        "caloritype-prototype-v1" +
        location.pathname.replace(/\/(?:index\.html)?$/, ""),
      a = new CaloriStore(n),
      b = new CaloriStore(n);
    await a.open();
    await b.open();
    const s = await a.read("record"),
      x = structuredClone(s),
      y = structuredClone(s);
    x.entries.find((e) => e.id === "current-record").kcal = 444;
    const extra = {
      ...x.entries.find((e) => e.id === "current-record"),
      id: "other-tab-new",
      kcal: 55,
    };
    y.entries.push(extra);
    const r = await Promise.all([
      a.commit("record", CaloriStore.diff(s, x), s._rev),
      b.commit("record", CaloriStore.diff(s, y), s._rev),
    ]);
    const full = await a.full("record");
    a.db.close();
    b.db.close();
    a.channel?.close();
    b.channel?.close();
    return {
      conflict: r.some((x) => x.conflict),
      current: full.entries.find((e) => e.id === "current-record").kcal,
      extra: full.entries.find((e) => e.id === "other-tab-new").kcal,
    };
  });
  assert.equal(merged.conflict, true);
  assert.equal(merged.current, 444);
  assert.equal(merged.extra, 55);
  const invalid = await p.evaluate(async () => {
    const st = new CaloriStore("caloritype-prototype-v1/CaloriType");
    await st.open();
    const s = await st.full("record");
    st.db.close();
    st.channel?.close();
    s.entries[0].rate = "<img src=x onerror=window.__xss=1>";
    return JSON.stringify({
      kind: "caloritype-backup",
      mode: "record",
      state: s,
    });
  });
  await p.locator("#restoreFile").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(invalid),
  });
  await p.waitForFunction(() =>
    document.getElementById("toast").textContent.includes("対応する形式"),
  );
  assert.equal(await p.evaluate(() => window.__xss), undefined);
  await p.evaluate(() => {
    const original = store.commit.bind(store);
    let once = true;
    store.commit = async (...args) => {
      if (once) {
        once = false;
        throw new Error("injected storage failure");
      }
      return original(...args);
    };
  });
  await p.locator("#foodSearch").fill("卵");
  await p.locator('[data-food="food-3"]').click();
  await p.locator("#saveFood").click();
  await p.waitForFunction(
    () => document.querySelector(".local-dot").textContent === "保存できません",
  );
  await p.locator("#menuBtn").click();
  const failedDownload = p.waitForEvent("download");
  await p.locator("#jsonExport").click();
  const fd = await failedDownload;
  await fd.saveAs("/tmp/caloritype-unsaved-test.json");
  const unsaved = JSON.parse(
    require("fs").readFileSync("/tmp/caloritype-unsaved-test.json", "utf8"),
  );
  assert.ok(unsaved.state.entries.some((e) => e.foodId === "food-3"));
  await p.locator("#modeSwitch").selectOption("demo");
  await p.waitForFunction(
    () => document.getElementById("modeCaption").textContent === "デモモード",
  );
  await p.locator("#modeSwitch").selectOption("record");
  await p.waitForFunction(
    () =>
      document.getElementById("modeCaption").textContent ===
      "記録モード（試用）",
  );
  assert.ok(await p.locator(".food-info").filter({ hasText: "卵" }).count());
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator("#foodSearch").fill("PFCスマホ");
  await p.locator("[data-custom]").click();
  await p.locator("#kcalInput").fill("400");
  await p.locator("#kcalInput").press("Tab");
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.screenshot({
    path: "/tmp/caloritype-next-mobile.png",
    fullPage: true,
  });
  const copyContext = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 390, height: 844 },
  });
  await copyContext.addInitScript(() =>
    localStorage.setItem("caloritype-prototype-v1/CaloriType.onboarded", "1"),
  );
  const copyPage = await copyContext.newPage();
  copyPage.on("pageerror", (e) => errors.push(e.message));
  await copyPage.goto(base + "?mode=record");
  await copyPage.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  const copyDates = await copyPage.evaluate(async () => {
    const st = new CaloriStore("caloritype-prototype-v1/CaloriType");
    await st.open();
    const s = await st.full("record");
    const day = CaloriStore.key(new Date());
    const offset = (n) => {
      const d = new Date(day + "T12:00:00");
      d.setDate(d.getDate() + n);
      return CaloriStore.key(d);
    };
    const names = { breakfast: "朝", lunch: "昼", dinner: "夜", late: "夜食" };
    s.meals.forEach((m) => {
      m.name = names[m.id];
    });
    const entry = (id, name, kcal, meal, time, date = day) => ({
      id,
      name,
      kcal,
      meal,
      time,
      date,
      foodId: "food-0",
      p: null,
      f: null,
      c: null,
      unit: "serving",
      amount: 1,
      eatingOut: false,
      rate: 0,
    });
    s.entries = [
      entry("copy-yogurt", "ヨーグルト", 280, "breakfast", "08:00"),
      entry("copy-bread", "パン", 120, "breakfast", "07:00"),
      entry(
        "copy-lunch",
        "カレー *辛口*\n[大盛] & <具>",
        650,
        "lunch",
        "12:00",
      ),
      entry("copy-midnight", "牛乳", 100, "late", "01:00", offset(1)),
      entry("copy-evening", "ナッツ", 25, "late", "21:30"),
      entry(
        "copy-other-day",
        "別の日の食事",
        600,
        "lunch",
        "12:00",
        offset(-1),
      ),
      entry(
        "copy-after-boundary",
        "翌日の食事",
        300,
        "late",
        "03:00",
        offset(1),
      ),
    ];
    s.boundaries = { [day]: 26 };
    await st.replace("record", s);
    st.db.close();
    st.channel?.close();
    return { day, other: offset(-1), empty: offset(7) };
  });
  await copyPage.reload();
  await copyPage.locator('[data-entry="copy-bread"]').waitFor();
  const expectedCopy = [
    "- 朝: 小計 400 kcal",
    "    - パン: 120 kcal",
    "    - ヨーグルト: 280 kcal",
    "- 昼: 小計 650 kcal",
    "    - カレー \\*辛口\\* \\[大盛\\] \\& \\<具\\>: 650 kcal",
    "- 夜食: 小計 125 kcal",
    "    - ナッツ: 25 kcal",
    "    - 牛乳: 100 kcal",
    "",
  ].join("\n");
  await copyPage.locator("#copyDayMarkdown").click();
  await copyPage.waitForFunction(() =>
    document.getElementById("toast").textContent.includes("コピーしました"),
  );
  assert.equal(
    await copyPage.evaluate(() => navigator.clipboard.readText()),
    expectedCopy,
  );
  assert.equal(
    await copyPage.locator("#copyMarkdownDialog").isVisible(),
    false,
  );
  await copyPage.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
    });
  });
  await copyPage.locator("#copyDayMarkdown").click();
  await copyPage.locator("#copyMarkdownDialog").waitFor();
  assert.equal(
    await copyPage.locator("#copyMarkdownText").inputValue(),
    expectedCopy,
  );
  await copyPage.locator("#selectMarkdownText").click();
  assert.equal(
    await copyPage
      .locator("#copyMarkdownText")
      .evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd)),
    expectedCopy,
  );
  assert.equal(
    await copyPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await copyPage.screenshot({
    path: "/tmp/caloritype-markdown-copy-mobile.png",
  });
  await copyPage.locator("#copyMarkdownDialog .close-dialog").click();
  await copyPage.locator("#dayInput").fill(copyDates.empty);
  await copyPage.locator("#dayInput").dispatchEvent("change");
  await copyPage.waitForFunction(
    () => document.getElementById("entryCount").textContent === "0",
  );
  await copyPage.locator("#copyDayMarkdown").click();
  assert.match(
    await copyPage.locator("#toast").innerText(),
    /記録がありません/,
  );
  assert.equal(
    await copyPage.locator("#copyMarkdownDialog").isVisible(),
    false,
  );
  assert.equal(
    await copyPage.evaluate(() => navigator.clipboard.readText()),
    expectedCopy,
  );
  await copyPage.locator("#dayInput").fill(copyDates.other);
  await copyPage.locator("#dayInput").dispatchEvent("change");
  await copyPage.locator('[data-entry="copy-other-day"]').waitFor();
  await copyPage.locator("#copyDayMarkdown").click();
  await copyPage.locator("#copyMarkdownDialog").waitFor();
  assert.equal(
    await copyPage.locator("#copyMarkdownText").inputValue(),
    "- 昼: 小計 600 kcal\n    - 別の日の食事: 600 kcal\n",
  );
  await copyPage.locator("#copyMarkdownDialog .close-dialog").click();
  await copyPage.locator("#modeSwitch").selectOption("demo");
  await copyPage.waitForFunction(
    () => document.getElementById("modeCaption").textContent === "デモモード",
  );
  await copyPage.locator("#copyDayMarkdown").click();
  await copyPage.locator("#copyMarkdownDialog").waitFor();
  assert.doesNotMatch(
    await copyPage.locator("#copyMarkdownText").inputValue(),
    /カレー|別の日の食事/,
  );
  await copyContext.close();
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "failed save exported and retried",
        "v1 database migration",
        "malformed backup rejected",
        "English quote",
        "2.5% dual PFC handles",
        "calorie-to-PFC",
        "meal start correction",
        "current time",
        "delta undo/redo",
        "food editor screen",
        "goal recalculation preview",
        "goal versions",
        "two-year indexed reads",
        "annual partial coverage",
        "old record retention",
        "one-year invalidation",
        "cross-tab redraw/toast",
        "same-record last-commit-wins",
        "unrelated concurrent edits merged",
        "mobile layout",
        "day Markdown clipboard and meal subtotals",
        "logical-day boundary and mode isolation in copied text",
        "Markdown names escaped and empty groups omitted",
        "clipboard denial manual selection and empty-day preservation",
      ],
    }),
  );
})().catch(async (e) => {
  console.error(e);
  await activeBrowser?.close();
  process.exitCode = 1;
});
