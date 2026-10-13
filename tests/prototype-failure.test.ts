import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from 'node:fs';

afterEach(() => vi.unstubAllGlobals());

describe("prototype replay failure", () => {
  it('keeps the checked sampled map and labels available when only the Punggol replay fails', async () => {
    const nodes = new Map<string, any>();
    const selectors = ['#point-map', '#inspection', '#cluster-cards', '#selection-title', '#intro-summary',
      '#sources', '#factor-readiness', '#factor-grid', '#status-card', '#map-title', '#map-scale-note',
      '#snapshot-pill', '#compare-instruction', '#map-tag', '#map-north', '#map-footer', '#study-path',
      '#research-progress', '#study-memo', '#intro-actions', '#scenario', '#owner-intake', '#owner-form',
      '#owner-status', '#sample-replay-link', '#owner-journey', '#owner-utilisation', '#owner-journey-result',
      '#owner-journey-memo', '#copy-owner-memo', '#owner-copy-status', '#priority-map', '#priority-overview',
      '#priority-local', '#priority-choices', '#priority-detail', '#priority-coverage', '#national-explorer-content'];
    for (const selector of selectors) nodes.set(selector, { textContent: '', innerHTML: '', hidden: false,
      value: '', disabled: false, setAttribute: vi.fn(), addEventListener: vi.fn(),
      querySelectorAll: () => [], querySelector: (key: string) => key.startsWith('#priority-') ?
        nodes.get(key) : ({ checked: false, addEventListener: vi.fn() }) });
    vi.stubGlobal('document', { querySelector: (key: string) => nodes.get(key) });
    const checkedRaw = readFileSync('prototype/priority-map.json', 'utf8');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Punggol offline'))
      .mockResolvedValueOnce(new Response(checkedRaw, { status: 200 })));
    vi.stubGlobal('console', { error: vi.fn() });
    vi.resetModules();
    await import(String('../prototype/app.js'));
    expect(nodes.get('#priority-detail').innerHTML).toContain('Insufficient evidence');
    expect(nodes.get('#priority-choices').innerHTML).toContain('Ang Mo Kio');
    expect(nodes.get('#owner-intake').hidden).toBe(false);
    expect(nodes.get('#status-card').textContent).toContain('Checked sample');
    expect(nodes.get('#snapshot-pill').textContent).toContain('CHECKED SAMPLE');
  });
  it('withholds the map before rendering altered coordinates or published units', async () => {
    for (const change of [
      (block: any) => { block.latitude = 1.5; },
      (block: any) => { block.units = 99999; },
    ]) {
      const selectors = ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake", "#owner-form", "#owner-status", "#sample-replay-link", "#owner-journey", "#owner-utilisation", "#owner-journey-result", "#owner-journey-memo", "#copy-owner-memo", "#owner-copy-status", "#priority-overview", "#priority-local", "#priority-choices", "#priority-detail", "#priority-coverage", "#national-explorer-content"];
      const element = () => ({ textContent: '', innerHTML: '', hidden: false, setAttribute: vi.fn(),
        replaceChildren: vi.fn(), append: vi.fn(), addEventListener: vi.fn(), querySelectorAll: () => [], querySelector: () => ({ checked: false, addEventListener: vi.fn() }) });
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
    const selectors = ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake", "#owner-form", "#owner-status", "#sample-replay-link", "#owner-journey", "#owner-utilisation", "#owner-journey-result", "#owner-journey-memo", "#copy-owner-memo", "#owner-copy-status", "#priority-overview", "#priority-local", "#priority-choices", "#priority-detail", "#priority-coverage", "#national-explorer-content"];
    const element = () => ({ textContent: '', innerHTML: '', hidden: false, setAttribute: vi.fn(),
      replaceChildren: vi.fn(), append: vi.fn(), addEventListener: vi.fn(), querySelectorAll: () => [], querySelector: () => ({ checked: false, addEventListener: vi.fn() }) });
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
    for (const selector of ["#point-map", "#inspection", "#cluster-cards", "#selection-title", "#intro-summary", "#sources", "#factor-readiness", "#factor-grid", "#status-card", "#map-title", "#map-scale-note", "#snapshot-pill", "#compare-instruction", "#map-tag", "#map-north", "#map-footer", "#study-path", "#research-progress", "#study-memo", "#intro-actions", "#scenario", "#owner-intake", "#owner-form", "#owner-status", "#sample-replay-link", "#owner-journey", "#owner-utilisation", "#owner-journey-result", "#owner-journey-memo", "#copy-owner-memo", "#owner-copy-status", "#priority-overview", "#priority-local", "#priority-choices", "#priority-detail", "#priority-coverage", "#national-explorer-content"]) {
      nodes.set(selector, { textContent: "", innerHTML: "", hidden: false, setAttribute: vi.fn(), addEventListener: vi.fn(), querySelectorAll: () => [], querySelector: () => ({ checked: false, addEventListener: vi.fn() }) });
    }
    vi.stubGlobal("document", { querySelector: (selector: string) => nodes.get(selector) });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.stubGlobal("console", { error: vi.fn() });
    vi.resetModules();
    await import(String("../prototype/app.js"));
    expect(nodes.get("#selection-title").textContent).toBe("Evidence unavailable");
    expect(nodes.get("#point-map").innerHTML).toContain("Evidence unavailable");
    expect(nodes.get("#cluster-cards").textContent).toContain("Evidence unavailable");
    expect(nodes.get("#intro-summary").textContent).toContain("Punggol replay could not be loaded");
    expect(nodes.get("#sources").hidden).toBe(true);
    expect(nodes.get("#factor-readiness").hidden).toBe(true);
    expect(nodes.get("#study-path").hidden).toBe(true);
    expect(nodes.get("#research-progress").hidden).toBe(true);
    expect(nodes.get("#intro-actions").hidden).toBe(false);
    expect(nodes.get("#sample-replay-link").hidden).toBe(true);
    expect(nodes.get("#scenario").hidden).toBe(true);
    expect(nodes.get("#owner-intake").hidden).toBe(false);
    expect(nodes.get("#owner-journey").hidden).toBe(false);
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
