import { describe, expect, it } from "vitest";

describe("prototype map labels", () => {
  it("stacks the selected block labels without overlap and inside the plot", async () => {
    const { selectedLabelPositions } = await import(String("../prototype/map-layout.mjs"));
    const nearRightEdge = [{ x: 690, y: 117 }, { x: 702, y: 125 }, { x: 687, y: 136 }];
    const labels = selectedLabelPositions(nearRightEdge);
    expect(labels).toHaveLength(3);
    expect(labels.map((label: { y: number }) => label.y)).toEqual([104, 126, 148]);
    expect(labels.every((label: { x: number; anchor: string }) => label.x < 690 && label.anchor === "end")).toBe(true);

    const central = [{ x: 280, y: 320 }, { x: 290, y: 330 }, { x: 300, y: 340 }];
    const centralLabels = selectedLabelPositions(central);
    expect(centralLabels.map((label: { y: number }) => label.y)).toEqual([308, 330, 352]);
    expect(centralLabels.every((label: { x: number; anchor: string }) => label.x > 300 && label.anchor === "start")).toBe(true);
  });
});
