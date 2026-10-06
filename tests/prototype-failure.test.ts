import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("prototype replay failure", () => {
  it("shows an unavailable state instead of empty evidence visuals", async () => {
    const nodes = new Map<string, any>();
    for (const selector of ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer"]) {
      nodes.set(selector, { textContent: "", innerHTML: "", hidden: false, setAttribute: vi.fn() });
    }
    vi.stubGlobal("document", { querySelector: (selector: string) => nodes.get(selector) });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.stubGlobal("console", { error: vi.fn() });
    vi.resetModules();
    await import(String("../prototype/app.js"));
    expect(nodes.get("#selection-title").textContent).toBe("Evidence unavailable");
    expect(nodes.get("#point-map").innerHTML).toContain("Evidence unavailable");
    expect(nodes.get("#cluster-cards").textContent).toContain("Evidence unavailable");
    expect(nodes.get("#intro-summary").textContent).toContain("could not be loaded");
    expect(nodes.get("#sources").hidden).toBe(true);
    expect(nodes.get("#map-title").textContent).toBe("Evidence unavailable");
    expect(nodes.get("#map-scale-note").textContent).toContain("No points");
    expect(nodes.get("#snapshot-pill").textContent).toBe("EVIDENCE UNAVAILABLE");
    expect(nodes.get("#compare-instruction").textContent).toContain("Restore");
    expect(nodes.get("#map-tag").hidden).toBe(true);
    expect(nodes.get("#map-north").hidden).toBe(true);
    expect(nodes.get("#map-footer").hidden).toBe(true);
  });
});
