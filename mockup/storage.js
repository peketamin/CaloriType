/* CaloriType storage: local IndexedDB, per-record last-commit-wins patches. */
"use strict";
class CaloriStore {
  constructor(name) {
    this.name = name;
    this.db = null;
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(name + ".changes")
        : null;
    this.client = crypto.randomUUID();
  }
  static key(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  static cutoff() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const month = d.getMonth();
    d.setFullYear(d.getFullYear() - 2);
    if (d.getMonth() !== month) d.setDate(0);
    return CaloriStore.key(d);
  }
  static goalAt(s, day) {
    const plans = s.goalHistory || [];
    let found = null;
    for (const p of plans)
      if (
        p.effectiveDate <= day &&
        (!found ||
          p.effectiveDate > found.effectiveDate ||
          (p.effectiveDate === found.effectiveDate &&
            ((p.committedRevision ?? 0) > (found.committedRevision ?? 0) ||
              ((p.committedRevision ?? 0) === (found.committedRevision ?? 0) &&
                p.createdAt >= found.createdAt))))
      )
        found = p;
    return Array.isArray(s.goalHistory)
      ? found
        ? found.target
        : null
      : (s.goal ?? null);
  }
  static day(s, e) {
    const at = new Date(e.date + "T" + e.time + ":00").getTime(),
      d = new Date(e.date + "T12:00:00");
    for (const offset of [-1, 0, 1]) {
      const t = new Date(d);
      t.setDate(t.getDate() + offset);
      const key = CaloriStore.key(t),
        prev = new Date(t);
      prev.setDate(prev.getDate() - 1);
      const p = CaloriStore.key(prev),
        start =
          new Date(p + "T00:00:00").getTime() +
          (s.boundaries[p] ?? 24) * 3600000,
        end =
          new Date(key + "T00:00:00").getTime() +
          (s.boundaries[key] ?? 24) * 3600000;
      if (at >= start && at < end) return key;
    }
    return e.date;
  }
  static clean(s) {
    const o = {};
    for (const [k, v] of Object.entries(s))
      if (!k.startsWith("_") && k !== "entries") o[k] = structuredClone(v);
    return o;
  }
  static normalize(s) {
    s = structuredClone(s);
    s.entries ??= [];
    s.meals.sort((a, b) => a.time.localeCompare(b.time));
    s.meals.forEach(
      (m, i) => (m.rangeEnd = s.meals[(i + 1) % s.meals.length].time),
    );
    s.goalHistory ??=
      s.goal === null
        ? []
        : [
            {
              id: crypto.randomUUID(),
              effectiveDate:
                s.entries.map((e) => e.date).sort()[0] ||
                CaloriStore.key(new Date()),
              target: s.goal,
              legacyAssumption: !!s._assumeLegacyGoal,
              createdAt: new Date().toISOString(),
            },
          ];
    s.goalHistory.sort(
      (a, b) =>
        a.effectiveDate.localeCompare(b.effectiveDate) ||
        (a.committedRevision ?? 0) - (b.committedRevision ?? 0) ||
        a.createdAt.localeCompare(b.createdAt),
    );
    s.goalHistory = s.goalHistory.map((p, i) => ({
      ...p,
      committedRevision: i + 1,
    }));
    return s;
  }
  static diff(before, after) {
    const p = { entries: [], fields: {}, maps: {}, lists: {} };
    const a = new Map((before?.entries || []).map((e) => [e.id, e])),
      b = new Map((after.entries || []).map((e) => [e.id, e]));
    for (const id of new Set([...a.keys(), ...b.keys()]))
      if (JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
        p.entries.push({
          id,
          before: a.get(id) || null,
          after: b.get(id) || null,
        });
    const x = CaloriStore.clean(before || {}),
      y = CaloriStore.clean(after);
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (["boundaries", "completed", "memories"].includes(k)) {
        const changes = {};
        for (const id of new Set([
          ...Object.keys(x[k] || {}),
          ...Object.keys(y[k] || {}),
        ]))
          if (JSON.stringify(x[k]?.[id]) !== JSON.stringify(y[k]?.[id]))
            changes[id] = { before: x[k]?.[id], after: y[k]?.[id] };
        if (Object.keys(changes).length) p.maps[k] = changes;
      } else if (["foods", "meals", "goalHistory"].includes(k)) {
        const aa = new Map((x[k] || []).map((e) => [e.id, e])),
          bb = new Map((y[k] || []).map((e) => [e.id, e]));
        const rows = [];
        for (const id of new Set([...aa.keys(), ...bb.keys()]))
          if (JSON.stringify(aa.get(id)) !== JSON.stringify(bb.get(id)))
            rows.push({
              id,
              before: aa.get(id) || null,
              after: bb.get(id) || null,
            });
        if (rows.length) p.lists[k] = rows;
      } else if (JSON.stringify(x[k]) !== JSON.stringify(y[k]))
        p.fields[k] = { before: x[k], after: y[k] };
    }
    return p;
  }
  static has(p) {
    return (
      p.entries.length ||
      Object.keys(p.fields).length ||
      Object.keys(p.maps).length ||
      Object.keys(p.lists).length
    );
  }
  static apply(s, p, side = "after") {
    for (const [k, v] of Object.entries(p.fields)) {
      if (v[side] === undefined) delete s[k];
      else s[k] = structuredClone(v[side]);
    }
    for (const [k, items] of Object.entries(p.maps)) {
      s[k] ??= {};
      for (const [id, v] of Object.entries(items)) {
        if (v[side] === undefined) delete s[k][id];
        else s[k][id] = structuredClone(v[side]);
      }
    }
    for (const [k, items] of Object.entries(p.lists)) {
      const m = new Map((s[k] || []).map((e) => [e.id, e]));
      for (const row of items) {
        if (row[side] === null) m.delete(row.id);
        else m.set(row.id, structuredClone(row[side]));
      }
      s[k] = [...m.values()];
    }
    if (s.entries) {
      const m = new Map(s.entries.map((e) => [e.id, e]));
      for (const row of p.entries) {
        if (row[side] === null) m.delete(row.id);
        else m.set(row.id, structuredClone(row[side]));
      }
      s.entries = [...m.values()];
    }
    return s;
  }
  notify(mode, rev) {
    const data = { mode, rev, client: this.client };
    this.channel?.postMessage(data);
    try {
      localStorage.setItem(this.name + ".notify", JSON.stringify(data));
    } catch {}
  }
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(this.name, 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains("data")) db.createObjectStore("data");
        if (!db.objectStoreNames.contains("entries")) {
          const e = db.createObjectStore("entries", {
            keyPath: ["mode", "id"],
          });
          e.createIndex("byDate", ["mode", "logicalDay"]);
          e.createIndex("byActual", ["mode", "date"]);
          e.createIndex("byMode", "mode");
        }
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () =>
        reject(
          new Error(
            "別タブが旧DBを使用しています。閉じて再読み込みしてください。",
          ),
        );
      r.onsuccess = () => resolve(r.result);
    });
    this.db.onversionchange = () => this.db.close();
    return this.db;
  }
  request(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async raw(mode) {
    return this.request(
      this.db.transaction("data").objectStore("data").get(mode),
    );
  }
  range(mode, from = "", to = "\uffff") {
    return IDBKeyRange.bound([mode, from], [mode, to]);
  }
  async rows(mode, from = "", to = "\uffff") {
    return (
      await this.request(
        this.db
          .transaction("entries")
          .objectStore("entries")
          .index("byDate")
          .getAll(this.range(mode, from, to)),
      )
    ).map(({ mode, ...e }) => e);
  }
  async snapshot(mode, from = "", to = "\uffff", withDay = null) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(["data", "entries"], "readonly"),
        meta = tx.objectStore("data").get(mode),
        index = tx.objectStore("entries").index("byDate"),
        recent = index.getAll(this.range(mode, from, to)),
        older =
          withDay && withDay < from
            ? index.getAll(this.range(mode, withDay, withDay))
            : null;
      tx.oncomplete = () =>
        resolve(
          meta.result
            ? {
                ...meta.result,
                entries: [
                  ...(recent.result || []),
                  ...(older?.result || []),
                ].map(({ mode, ...e }) => e),
              }
            : null,
        );
      tx.onerror = () => reject(tx.error);
    });
  }
  async read(mode, withDay = null, attempt = 0) {
    let s = await this.raw(mode);
    if (!s && mode === "demo") s = await this.raw("state");
    if (!s) return null;
    if (s._format !== 2) {
      if (this.validate && !this.validate(s))
        throw new Error(
          "旧データに不整合があるため原本を保持して移行を中止しました",
        );
      await this.replace(mode, { ...s, _assumeLegacyGoal: true });
    }
    s = await this.snapshot(mode, CaloriStore.cutoff(), "\uffff", withDay);
    if (!s) return null;
    await this.annual(mode, s);
    const latest = await this.raw(mode);
    if (latest?._rev !== s._rev && attempt < 2)
      return this.read(mode, withDay, attempt + 1);
    return s;
  }
  async full(mode) {
    let s = await this.raw(mode);
    if (!s && mode === "demo") s = await this.raw("state");
    if (!s) return null;
    if (s._format !== 2) return structuredClone(s);
    const snapshot = await this.snapshot(mode);
    return { ...CaloriStore.clean(snapshot), entries: snapshot.entries };
  }
  async replace(mode, input) {
    const s = CaloriStore.normalize(input),
      old = await this.raw(mode),
      meta = CaloriStore.clean(s);
    meta._format = 2;
    meta._rev = Math.max(old?._rev || 0, s.goalHistory.length) + 1;
    meta._annual = {};
    meta._dirtyYears = {};
    meta._cacheCutoff = "";
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(["data", "entries"], "readwrite"),
        store = tx.objectStore("entries"),
        r = store.index("byMode").openCursor(IDBKeyRange.only(mode));
      r.onsuccess = () => {
        const c = r.result;
        if (c) {
          c.delete();
          c.continue();
        } else {
          for (const e of s.entries)
            store.put({ ...e, mode, logicalDay: CaloriStore.day(s, e) });
          tx.objectStore("data").put(meta, mode);
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    this.notify(mode, meta._rev);
    return this.read(mode);
  }
  async commit(mode, patch, expected) {
    let rev,
      conflict = false;
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(["data", "entries"], "readwrite"),
        metaStore = tx.objectStore("data"),
        store = tx.objectStore("entries"),
        r = metaStore.get(mode);
      r.onsuccess = () => {
        const latest = r.result;
        if (!latest || latest._format !== 2) {
          tx.abort();
          return;
        }
        conflict = latest._rev !== expected;
        const next = CaloriStore.apply(structuredClone(latest), {
          ...patch,
          entries: [],
        });
        next._rev = latest._rev + 1;
        if (patch.lists.goalHistory)
          for (const row of patch.lists.goalHistory)
            if (row.after) {
              const plan = next.goalHistory.find((p) => p.id === row.id);
              if (plan) plan.committedRevision = next._rev;
            }
        next._dirtyYears ??= {};
        const cutoff = CaloriStore.cutoff(),
          dirty = (day) => {
            if (day && day < cutoff) next._dirtyYears[day.slice(0, 4)] = true;
          };
        for (const item of patch.entries) {
          if (item.before) {
            const day = CaloriStore.day(latest, item.before);
            dirty(day);
            if (!Object.hasOwn(patch.maps.completed || {}, day))
              next.completed[day] = false;
          }
          if (item.after) {
            const e = {
              ...item.after,
              mode,
              logicalDay: CaloriStore.day(next, item.after),
            };
            store.put(e);
            dirty(e.logicalDay);
            if (!Object.hasOwn(patch.maps.completed || {}, e.logicalDay))
              next.completed[e.logicalDay] = false;
          } else store.delete([mode, item.id]);
        }
        for (const day of Object.keys(patch.maps.completed || {})) dirty(day);
        for (const [day] of Object.entries(patch.maps.boundaries || {})) {
          for (const offset of [-1, 0, 1]) {
            const affected = CaloriStore.key(
              new Date(
                new Date(day + "T12:00:00").getTime() + offset * 86400000,
              ),
            );
            dirty(affected);
            if (!Object.hasOwn(patch.maps.completed || {}, affected))
              next.completed[affected] = false;
          }
          const q = store
            .index("byActual")
            .openCursor(
              this.range(
                mode,
                CaloriStore.key(
                  new Date(new Date(day + "T12:00:00").getTime() - 86400000),
                ),
                CaloriStore.key(
                  new Date(new Date(day + "T12:00:00").getTime() + 86400000),
                ),
              ),
            );
          q.onsuccess = () => {
            const c = q.result;
            if (c) {
              dirty(c.value.logicalDay);
              const e = c.value;
              e.logicalDay = CaloriStore.day(next, e);
              dirty(e.logicalDay);
              c.update(e);
              c.continue();
            }
          };
        }
        if (patch.lists.goalHistory)
          for (const p of patch.lists.goalHistory) {
            const first = [p.before?.effectiveDate, p.after?.effectiveDate]
              .filter(Boolean)
              .sort()[0];
            if (first && first < cutoff)
              for (
                let y = Number(first.slice(0, 4));
                y <= Number(cutoff.slice(0, 4));
                y++
              )
                next._dirtyYears[y] = true;
          }
        metaStore.put(next, mode);
        rev = next._rev;
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("保存を中止しました"));
    });
    this.notify(mode, rev);
    return { rev, conflict };
  }
  async rebuild(mode, reindex = false) {
    let rev;
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(["data", "entries"], "readwrite"),
        meta = tx.objectStore("data"),
        r = meta.get(mode);
      r.onsuccess = () => {
        const s = r.result;
        if (!s) {
          tx.abort();
          return;
        }
        s._rev++;
        rev = s._rev;
        s._cacheCutoff = "";
        s._dirtyYears = {};
        meta.put(s, mode);
        if (reindex) {
          const q = tx
            .objectStore("entries")
            .index("byMode")
            .openCursor(IDBKeyRange.only(mode));
          q.onsuccess = () => {
            const c = q.result;
            if (c) {
              const e = c.value;
              e.logicalDay = CaloriStore.day(s, e);
              c.update(e);
              c.continue();
            }
          };
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    this.notify(mode, rev);
    return this.read(mode);
  }
  async annual(mode, s) {
    const cutoff = CaloriStore.cutoff(),
      oldCutoff = s._cacheCutoff || "",
      dirty = new Set(Object.keys(s._dirtyYears || {}));
    if (!oldCutoff) {
      await new Promise((resolve, reject) => {
        const r = this.db
          .transaction("entries")
          .objectStore("entries")
          .index("byDate")
          .openCursor(this.range(mode, "", cutoff));
        r.onsuccess = () => {
          const c = r.result;
          if (c) {
            if (c.value.logicalDay < cutoff)
              dirty.add(c.value.logicalDay.slice(0, 4));
            c.continue();
          } else resolve();
        };
        r.onerror = () => reject(r.error);
      });
      for (const d of Object.keys(s.completed))
        if (d < cutoff) dirty.add(d.slice(0, 4));
    } else if (oldCutoff !== cutoff) {
      for (
        let y = Number(oldCutoff.slice(0, 4));
        y <= Number(cutoff.slice(0, 4));
        y++
      )
        dirty.add(String(y));
    }
    const caches = { ...(s._annual || {}) };
    for (const [y, c] of Object.entries(caches))
      if (c.formatVersion !== 1) dirty.add(y);
    for (const y of dirty) {
      const end =
          cutoff <= `${y}-12-31`
            ? CaloriStore.key(
                new Date(new Date(cutoff + "T12:00:00").getTime() - 86400000),
              )
            : `${y}-12-31`,
        rows = await this.rows(mode, `${y}-01-01`, end),
        daily = new Map();
      let kcal = 0,
        p = 0,
        f = 0,
        c = 0,
        unknownPfcEntries = 0,
        estimatedPfcEntries = 0;
      for (const e of rows) {
        const day = CaloriStore.day(s, e);
        kcal += e.kcal;
        if (["p", "f", "c"].some((k) => e[k] === null)) unknownPfcEntries++;
        if (e.pfcEstimated) estimatedPfcEntries++;
        p += e.p ?? 0;
        f += e.f ?? 0;
        c += e.c ?? 0;
        daily.set(day, (daily.get(day) || 0) + e.kcal);
      }
      let completedDays = 0,
        completedKcal = 0,
        targetKcal = 0,
        scoredDays = 0,
        scoredKcal = 0;
      for (const [d, done] of Object.entries(s.completed))
        if (done && d >= `${y}-01-01` && d <= end) {
          completedDays++;
          completedKcal += daily.get(d) || 0;
          const target = CaloriStore.goalAt(s, d);
          if (target !== null) {
            targetKcal += target;
            scoredDays++;
            scoredKcal += daily.get(d) || 0;
          }
        }
      caches[y] = {
        formatVersion: 1,
        calculationVersion: "goal-history-v1",
        year: y,
        from: `${y}-01-01`,
        through: end,
        entries: rows.length,
        kcal,
        p,
        f,
        c,
        unknownPfcEntries,
        estimatedPfcEntries,
        completedDays,
        completedKcal,
        targetKcal,
        scoredDays,
        scoredKcal,
        builtAt: new Date().toISOString(),
      };
    }
    if (dirty.size || oldCutoff !== cutoff) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction("data", "readwrite"),
          store = tx.objectStore("data"),
          r = store.get(mode);
        r.onsuccess = () => {
          const current = r.result;
          if (current?._rev === s._rev) {
            current._annual = caches;
            current._cacheCutoff = cutoff;
            current._dirtyYears = {};
            store.put(current, mode);
          }
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      s._annual = caches;
      s._cacheCutoff = cutoff;
      s._dirtyYears = {};
    }
    return caches;
  }
}
window.CaloriStore = CaloriStore;
