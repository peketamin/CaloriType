const { chromium } = require("playwright");
const assert = require("node:assert/strict");
let activeBrowser;
(async () => {
  const b = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  activeBrowser = b;
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.addInitScript(() =>
    localStorage.setItem("caloritype-prototype-v1/CaloriType.onboarded", "1"),
  );
  await p.goto(
    process.env.CALORITYPE_TEST_URL || "http://127.0.0.1:8080/CaloriType/",
  );
  await p.locator(".food-row").first().waitFor();
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  const metrics = await p.evaluate(async () => {
    const st = new CaloriStore("caloritype-prototype-v1/CaloriType");
    await st.open();
    const s = await st.full("demo");
    s.entries = [];
    s.completed = {};
    s.goalHistory = [
      {
        id: "goal",
        effectiveDate: "2000-01-01",
        target: 2000,
        createdAt: "2020-01-01T00:00:00Z",
      },
    ];
    for (let i = 0; i < 100000; i++) {
      const d = new Date();
      if (i < 95000) d.setFullYear(d.getFullYear() - 6, 0, 1 + (i % 365));
      else d.setDate(d.getDate() - ((i - 95000) % 700));
      const day = CaloriStore.key(d);
      s.entries.push({
        id: "perf-" + i,
        foodId: "food-0",
        name: "性能確認",
        date: day,
        time: "12:00",
        meal: "lunch",
        kcal: 100,
        p: 5,
        f: 2,
        c: 15,
        unit: "serving",
        amount: 1,
        eatingOut: false,
        rate: 0,
      });
      s.completed[day] = true;
    }
    const t0 = performance.now();
    await st.replace("record", s);
    const initialMs = performance.now() - t0,
      t1 = performance.now(),
      recent = await st.read("record"),
      readMs = performance.now() - t1;
    st.db.close();
    st.channel?.close();
    return {
      totalRecords: 100000,
      loadedRecords: recent.entries.length,
      annualCaches: Object.keys(recent._annual).length,
      initialArchiveBuildMs: Math.round(initialMs),
      cachedReadMs: Math.round(readMs),
    };
  });
  assert.equal(metrics.loadedRecords, 5000);
  assert.equal(metrics.annualCaches, 1);
  await p.locator("#modeSwitch").selectOption("record");
  await p.waitForFunction(
    () =>
      document.getElementById("modeCaption").textContent ===
        "記録モード（試用）" && !document.getElementById("modeSwitch").disabled,
  );
  await p.waitForFunction(() =>
    document.querySelector(".local-dot").textContent.includes("保存済み"),
  );
  metrics.candidatePaintMs = await p.evaluate(
    () =>
      new Promise((resolve) => {
        const t = performance.now(),
          i = document.getElementById("foodSearch");
        i.value = "ごはん";
        i.dispatchEvent(new Event("input", { bubbles: true }));
        requestAnimationFrame(() => resolve(Math.round(performance.now() - t)));
      }),
  );
  await p.locator('[data-food="food-0"]').click();
  metrics.saveAndRepaintMs = await p.evaluate(async () => {
    const t = performance.now();
    document.getElementById("saveFood").click();
    await saveQueue;
    return Math.round(performance.now() - t);
  });
  assert.ok(metrics.candidatePaintMs < 100);
  assert.ok(metrics.saveAndRepaintMs < 200);
  await b.close();
  console.log(
    JSON.stringify({
      passed: true,
      environment: "Cloud Linux / Chromium, synthetic data, single measurement",
      ...metrics,
    }),
  );
})().catch(async (e) => {
  console.error(e);
  await activeBrowser?.close();
  process.exitCode = 1;
});
