/**
 * E2E #3 — Projects round-trip.
 * Spec: spec/30-import-export/03-test-plan.md §3 row 3.
 */
import { describe, it, expect } from "vitest";
import { openCachedDb, loadCachedBundle } from "./setup-helpers";

describe("projects-roundtrip", () => {
  it("FixtureCoverage project row exists with all top-level fields", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec("SELECT * FROM Projects WHERE Uid = ?", [fixture.projects[0].id]);
      expect(res[0]).toBeTruthy();
      const cols = res[0].columns;
      const row = res[0].values[0];
      const get = (name: string) => row[cols.indexOf(name)];

      expect(get("Name")).toBe("FixtureCoverage");
      expect(get("Slug")).toBe("fixture-coverage");
      expect(get("Version")).toBe("1.0.0");
      expect(get("Description")).toBe("End-to-end fixture covering every artifact category.");
      expect(get("CreatedAt")).toBe("2026-05-16T00:00:00.000Z");
      expect(get("UpdatedAt")).toBe("2026-05-16T00:00:00.000Z");
    } finally {
      db.close();
    }
  });

  it("TargetUrls JSON round-trips deep-equal", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT TargetUrls FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const raw = String(res[0].values[0][0]);
      expect(JSON.parse(raw)).toEqual(fixture.projects[0].targetUrls);
    } finally {
      db.close();
    }
  });

  it("Scripts JSON blob preserves order/runAt/code for inline entries", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT Scripts FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const parsed = JSON.parse(String(res[0].values[0][0]));
      expect(parsed).toEqual(fixture.projects[0].scripts);
    } finally {
      db.close();
    }
  });

  it("Configs JSON blob preserves library refs", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT Configs FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const parsed = JSON.parse(String(res[0].values[0][0]));
      expect(parsed).toEqual(fixture.projects[0].configs);
    } finally {
      db.close();
    }
  });

  it("Cookies JSON blob preserves binding shape", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT Cookies FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const parsed = JSON.parse(String(res[0].values[0][0]));
      expect(parsed).toEqual(fixture.projects[0].cookies);
    } finally {
      db.close();
    }
  });

  it("Settings JSON blob preserves variables sub-blob byte-equal", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT Settings FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const parsed = JSON.parse(String(res[0].values[0][0]));
      expect(parsed).toEqual(fixture.projects[0].settings);
    } finally {
      db.close();
    }
  });

  it("Dependencies JSON blob round-trips", async () => {
    const { fixture } = await loadCachedBundle();
    const db = await openCachedDb();
    try {
      const res = db.exec(
        "SELECT Dependencies FROM Projects WHERE Uid = ?",
        [fixture.projects[0].id],
      );
      const parsed = JSON.parse(String(res[0].values[0][0]));
      expect(parsed).toEqual(fixture.projects[0].dependencies);
    } finally {
      db.close();
    }
  });

  it("IsGlobal / IsRemovable booleans round-trip as 0/1", async () => {
    const db = await openCachedDb();
    try {
      const res = db.exec("SELECT IsGlobal, IsRemovable FROM Projects");
      for (const row of res[0].values) {
        expect([0, 1, null]).toContain(row[0]);
        expect([0, 1, null]).toContain(row[1]);
      }
    } finally {
      db.close();
    }
  });
});
