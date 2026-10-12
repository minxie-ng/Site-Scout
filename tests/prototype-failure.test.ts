import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from 'node:fs';

afterEach(() => vi.unstubAllGlobals());

describe("prototype replay failure", () => {
  it('withholds the map before rendering altered coordinates or published units', async () => {
    for (const change of [
      (block: any) => { block.latitude = 1.5; },
      (block: any) => { block.units = 99999; },
    ]) {
      const selectors = ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake"];
      const element = () => ({ textContent: '', innerHTML: '', hidden: false, setAttribute: vi.fn(),
        replaceChildren: vi.fn(), append: vi.fn(), addEventListener: vi.fn(), querySelectorAll: () => [] });
      const nodes = new Map(selectors.map(selector => [selector, element()]));
      const feed = JSON.parse(readFileSync('prototype/data.json', 'utf8'));
      change(feed.clusters[0].blocks[0]);
      vi.stubGlobal('document', { querySelector: (selector: string) => nodes.get(selector), createElementNS: element });
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(feed), { status: 200 })));
      vi.stubGlobal('console', { error: vi.fn() });
      vi.resetModules();
      await import(String('../prototype/app.js'));
      expect(nodes.get('#selection-title')?.textContent).toBe('Evidence unavailable');
      expect(nodes.get('#inspection')?.innerHTML).not.toContain('VERIFIED RESIDENTIAL BLOCKS');
      expect(nodes.get('#study-memo')?.hidden).toBe(true);
      vi.unstubAllGlobals();
    }
  });
  it('withholds all evidence visuals when a block citation changes before rendering', async () => {
    const selectors = ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake"];
    const element = () => ({ textContent: '', innerHTML: '', hidden: false, setAttribute: vi.fn(),
      replaceChildren: vi.fn(), append: vi.fn(), addEventListener: vi.fn(), querySelectorAll: () => [] });
    const nodes = new Map(selectors.map(selector => [selector, element()]));
    const feed = JSON.parse(readFileSync('prototype/data.json', 'utf8'));
    feed.clusters[0].blocks[0].oneMapUrl = 'https://www.onemap.gov.sg/other-block';
    vi.stubGlobal('document', { querySelector: (selector: string) => nodes.get(selector), createElementNS: element });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(feed), { status: 200 })));
    vi.stubGlobal('console', { error: vi.fn() });
    vi.resetModules();
    await import(String('../prototype/app.js'));
    expect(nodes.get('#selection-title')?.textContent).toBe('Evidence unavailable');
    expect(nodes.get('#inspection')?.innerHTML).not.toContain('other-block');
    expect(nodes.get('#sources')?.hidden).toBe(true);
    expect(nodes.get('#study-memo')?.hidden).toBe(true);
  });
  it("shows an unavailable state instead of empty evidence visuals", async () => {
    const nodes = new Map<string, any>();
    for (const selector of ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake"]) {
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
    expect(nodes.get("#factor-readiness").hidden).toBe(true);
    expect(nodes.get("#study-path").hidden).toBe(true);
    expect(nodes.get("#research-progress").hidden).toBe(true);
    expect(nodes.get("#intro-actions").hidden).toBe(true);
    expect(nodes.get("#scenario").hidden).toBe(true);
    expect(nodes.get("#owner-intake").hidden).toBe(true);
    expect(nodes.get("#study-memo").hidden).toBe(true);
    expect(nodes.get("#map-title").textContent).toBe("Evidence unavailable");
    expect(nodes.get("#map-scale-note").textContent).toContain("No points");
    expect(nodes.get("#snapshot-pill").textContent).toBe("EVIDENCE UNAVAILABLE");
    expect(nodes.get("#compare-instruction").textContent).toContain("Restore");
    expect(nodes.get("#map-tag").hidden).toBe(true);
    expect(nodes.get("#map-north").hidden).toBe(true);
    expect(nodes.get("#map-footer").hidden).toBe(true);
  });
});
