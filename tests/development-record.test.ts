import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseDevelopmentRecord } from "../src/domain/evidence";

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function cloneFixture(): any {
  return structuredClone(
    loadJson("src/data/snapshots/2026-10-05/developments.json"),
  );
}

describe("development evidence validation", () => {
  it("keeps the official dated record but abstains on the unproven phase coordinate", () => {
    const result = parseDevelopmentRecord(cloneFixture());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.development.name).toBe(
      "Punggol Point Cove (Phase 2)",
    );
    expect(result.data.status).toEqual({
      value: "completed",
      effectiveDate: "2025-01",
      precision: "month",
    });
    expect(result.data.unitCount).toBe(1179);
    expect(result.data.evidenceStatus).toBe("insufficient_evidence");
    expect("provenance" in result.data).toBe(false);
    expect(result.data.location.kind).toBe("candidate_representative_block");
    expect(result.data.location.provenance).toBe("derived_value");
    expect(result.data.location.relationshipEvidenceStatus).toBe("not_established");
    expect(result.data.location.sourceIds).toEqual(
      expect.arrayContaining([
        "hdb-punggol-point-completion-annex-a",
        "onemap-821442",
      ]),
    );
  });

  it("retains an original snapshot for every cited source", () => {
    const result = parseDevelopmentRecord(cloneFixture());

    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const source of result.data.sources) {
      const snapshot = readFileSync(resolve(process.cwd(), source.snapshotPath));
      const digest = createHash("sha256").update(snapshot).digest("hex");
      expect(digest).toBe(source.snapshotSha256);
    }
  });

  it("rejects a missing candidate coordinate", () => {
    const fixture = cloneFixture();
    delete fixture.location.latitude;

    const result = parseDevelopmentRecord(fixture);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
      "location.latitude",
    );
  });

  it("rejects an ambiguous development status", () => {
    const fixture = cloneFixture();
    fixture.status.value = "completed_or_occupied";

    const result = parseDevelopmentRecord(fixture);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
      "status.value",
    );
  });

  it("cannot promote an unproven block-to-phase join to usable", () => {
    const fixture = cloneFixture();
    fixture.evidenceStatus = "usable_snapshot";
    fixture.location.relationshipEvidenceStatus = "supported";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects an invented decision claim even with a real excerpt", () => {
    const fixture = cloneFixture();
    fixture.decisionClaims[0].claim = "The Phase 2 flats are occupied by Pilates customers.";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects an absolute snapshot path", () => {
    const fixture = cloneFixture();
    fixture.sources[0].snapshotPath = "/tmp/hdb-annex.pdf";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a missing HDB extraction", () => {
    const fixture = cloneFixture();
    fixture.sources[0].extractionPath = "src/data/snapshots/2026-10-05/extractions/missing.txt";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a changed coordinate even within Singapore", () => {
    const fixture = cloneFixture();
    fixture.location.latitude = 1.4;
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects provenance metadata changed to a future retrieval time", () => {
    const fixture = cloneFixture();
    fixture.sources[0].retrievedAt = "2030-01-01T00:00:00Z";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a location label that falsely confirms the phase join", () => {
    const fixture = cloneFixture();
    fixture.location.label = "Block 442A confirmed as Phase 2";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a misleading fallback that says the join is confirmed", () => {
    const fixture = cloneFixture();
    fixture.fallback.limitation = "Block 442A is definitely Phase 2.";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a one-character supporting excerpt", () => {
    const fixture = cloneFixture();
    fixture.decisionClaims[0].evidenceExcerpt = "P";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a fabricated development record ID", () => {
    const fixture = cloneFixture();
    fixture.id = "different-development";
    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects a decision claim marked as unsupported", () => {
    const fixture = cloneFixture();
    fixture.decisionClaims[0].support = "not_established";

    const result = parseDevelopmentRecord(fixture);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
      "decisionClaims.0.support",
    );
  });

  it.each([
    ["invented source excerpt", (fixture: any) => {
      fixture.decisionClaims[0].evidenceExcerpt =
        "This invented sentence does not occur in the source extraction.";
    }],
    ["unsupported unit count", (fixture: any) => {
      fixture.unitCount = 100000;
    }],
    ["unsupported effective month", (fixture: any) => {
      fixture.status.effectiveDate = "2025-02";
    }],
  ])("rejects an unsupported claim fact: %s", (_name, mutate) => {
    const fixture = cloneFixture();
    mutate(fixture);

    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it.each([
    ["missing snapshot", (fixture: any) => {
      fixture.sources[0].snapshotPath =
        "src/data/snapshots/2026-10-05/original/missing.pdf";
    }],
    ["wrong snapshot hash", (fixture: any) => {
      fixture.sources[0].snapshotSha256 = "0".repeat(64);
    }],
    ["escaped snapshot path", (fixture: any) => {
      fixture.sources[0].snapshotPath = "../../.env";
    }],
  ])("does not label a record usable with a %s", (_name, mutate) => {
    const fixture = cloneFixture();
    mutate(fixture);

    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects coordinates outside Singapore", () => {
    const fixture = cloneFixture();
    fixture.location.latitude = 40.7128;
    fixture.location.longitude = -74.006;

    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });

  it("rejects duplicate source IDs", () => {
    const fixture = cloneFixture();
    fixture.sources.push({
      ...fixture.sources[0],
      title: "Conflicting duplicate",
      sourceUrl: "https://example.com/conflicting-source",
    });

    expect(parseDevelopmentRecord(fixture).success).toBe(false);
  });
});
