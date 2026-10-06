/** Label placement for three already verified nearby address points. */
export function selectedLabelPositions(points) {
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const leftSide = Math.max(...points.map(point => point.x)) > 600;
  const x = leftSide ? Math.min(...points.map(point => point.x)) - 22 : Math.max(...points.map(point => point.x)) + 22;
  return points.map((_, index) => ({ x, y: Math.round(meanY) + (index - 1) * 22, anchor: leftSide ? "end" : "start" }));
}
