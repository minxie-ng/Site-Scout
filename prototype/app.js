import { selectedLabelPositions } from "./map-layout.mjs";

const svgNS = "http://www.w3.org/2000/svg";
const map = document.querySelector("#point-map");
const inspection = document.querySelector("#inspection");
const cards = document.querySelector("#cluster-cards");
const title = document.querySelector("#selection-title");
let clusters = [];
let selected = 0;

function safe(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function svgElement(name, attributes = {}, parent = map) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  parent.append(element);
  return element;
}

function plot() {
  map.replaceChildren();
  const points = clusters.flatMap(cluster => cluster.blocks);
  const minLon = Math.min(...points.map(point => point.longitude)) - .003;
  const maxLon = Math.max(...points.map(point => point.longitude)) + .003;
  const minLat = Math.min(...points.map(point => point.latitude)) - .003;
  const maxLat = Math.max(...points.map(point => point.latitude)) + .003;
  const position = point => ({ x: 72 + (point.longitude - minLon) / (maxLon - minLon) * 616, y: 474 - (point.latitude - minLat) / (maxLat - minLat) * 418 });

  for (let i = 0; i < 7; i++) {
    const x = 55 + i * 108;
    const y = 45 + i * 74;
    svgElement("line", { x1: x, y1: 0, x2: x, y2: 530, class: "grid-line" });
    svgElement("line", { x1: 0, y1: y, x2: 760, y2: y, class: "grid-line" });
  }

  clusters.forEach((cluster, index) => {
    const positions = cluster.blocks.map(position);
    const anchor = positions[0];
    const group = svgElement("g", { class: "plot-button", role: "button", tabindex: "0", "aria-label": `Inspect ${cluster.name}` });
    group.addEventListener("click", () => select(index));
    group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(index); } });
    svgElement("polyline", { points: positions.map(point => `${point.x},${point.y}`).join(" "), class: "point-line" }, group);
    if (index === selected) svgElement("circle", { cx: anchor.x, cy: anchor.y, r: 49, class: "point-halo" }, group);
    const labels = index === selected ? selectedLabelPositions(positions) : [];
    positions.forEach((point, blockIndex) => {
      svgElement("circle", { cx: point.x, cy: point.y, r: index === selected ? 10 : 8, class: `point-marker${index === selected ? " active" : ""}` }, group);
      if (index === selected) {
        const label = labels[blockIndex];
        svgElement("line", { x1: point.x, y1: point.y, x2: label.x, y2: label.y - 4, class: "label-leader" }, group);
        const blockText = svgElement("text", { x: label.x, y: label.y, "text-anchor": label.anchor, class: "point-label active" }, group);
        blockText.textContent = cluster.blocks[blockIndex].id;
      }
    });
    const labelX = index === 0 ? anchor.x - 175 : index === 1 ? anchor.x - 164 : anchor.x + 38;
    const labelY = index === 0 ? anchor.y + 75 : index === 1 ? anchor.y - 42 : anchor.y + 50;
    const name = svgElement("text", { x: labelX, y: labelY, class: `map-group-label${index === selected ? "" : " muted"}` }, group);
    name.textContent = cluster.name.split(":")[0];
    const sub = svgElement("text", { x: labelX, y: labelY + 18, class: "map-group-sub" }, group);
    sub.textContent = "THREE HDB BLOCKS";
  });
}

function renderCards() {
  cards.innerHTML = clusters.map((cluster, index) => {
    const group = safe(cluster.name.split(":")[0]);
    const blocks = cluster.blocks.map(block => safe(block.id)).join(" · ");
    return `<button type="button" class="cluster-card${index === selected ? " active" : ""}" data-cluster="${index}" aria-pressed="${index === selected}"><span class="card-top"><span>CANDIDATE ${String(index + 1).padStart(2, "0")}</span><b>INSUFFICIENT EVIDENCE</b></span><h3>${group}</h3><p>Blocks ${blocks}</p><span class="card-bottom"><span><strong>3</strong> source-backed block points</span><span>Inspect ↗</span></span></button>`;
  }).join("");
  cards.querySelectorAll("button").forEach(button => button.addEventListener("click", () => select(Number(button.dataset.cluster))));
}

function shortDate(iso) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${names[Number(month) - 1]} ${year}`;
}

function renderInspection() {
  const cluster = clusters[selected];
  const shortName = cluster.name.split(":")[0];
  const totalUnits = cluster.blocks.reduce((sum, block) => sum + block.units, 0);
  title.textContent = shortName;
  const blockRows = cluster.blocks.map(block => `<div class="block-item">
    <div><strong>Block ${safe(block.id)}</strong><small>${safe(block.postal)} · completed ${safe(block.completed)} · ${safe(block.units)} published units</small>
    <small class="source-dates"><a href="${safe(block.oneMapUrl)}" target="_blank" rel="noopener noreferrer">OneMap ↗</a> retrieved <time datetime="${safe(block.oneMapRetrievedAt)}">${safe(shortDate(block.oneMapRetrievedAt))}</time> · <a href="${safe(block.hdbUrl)}" target="_blank" rel="noopener noreferrer">HDB ↗</a> retrieved <time datetime="${safe(block.hdbRetrievedAt)}">${safe(shortDate(block.hdbRetrievedAt))}</time></small></div>
  </div>`).join("");
  inspection.innerHTML = `<div class="candidate-index">CANDIDATE ${String(selected + 1).padStart(2, "0")} · PUNGGOL, SINGAPORE</div>
    <div class="decision-line">A real location.<br>Still an open question.</div>
    <p class="inspection-copy">These exact HDB blocks and address points are source-backed. No verified premises, local competitor catchment, or owner-confirmed economics connects them to a safe outlet decision.</p>
    <div class="metric-row"><div><strong>3</strong><span>VERIFIED RESIDENTIAL BLOCKS</span></div><div><strong>${totalUnits}</strong><span>PUBLISHED DWELLING UNITS · NOT OCCUPANCY</span></div></div>
    <div class="block-list"><h3>INSPECT EACH BLOCK'S SOURCE AND RETRIEVAL DATE</h3>${blockRows}</div>
    <div class="gap-note"><strong>What stops a recommendation?</strong><br>${selected === 1 || selected === 2 ? "Sapphire and Ripples are only about 413 m apart; their markets may overlap. " : "The Phase 2 development-to-block relationship is unproven. "}Premises rent and permitted use, competition, and demand remain unresolved.</div>`;
}

function select(index) {
  selected = index;
  plot();
  renderCards();
  renderInspection();
}

try {
  const response = await fetch("./data.json");
  if (!response.ok) throw new Error(`Evidence feed returned HTTP ${response.status}`);
  const feed = await response.json();
  if (feed.decision !== "insufficient_evidence" || !Array.isArray(feed.clusters) || feed.clusters.length !== 3 || feed.clusters.some(cluster => cluster.blocks.length !== 3 || cluster.linkedDevelopmentIds.length || cluster.linkedCompetitorIds.length)) throw new Error("Evidence feed failed the prototype contract");
  clusters = feed.clusters;
  select(0);
} catch (error) {
  title.textContent = "Evidence unavailable";
  inspection.textContent = "The dated block snapshot could not be loaded. Start the local server from the repository root and reload this page.";
  map.innerHTML = '<text x="380" y="260" text-anchor="middle" fill="#607580" font-size="22">Evidence unavailable</text>';
  cards.textContent = "Evidence unavailable. Restore the local snapshot to compare candidate blocks.";
  document.querySelector("#intro-summary").textContent = "The dated block snapshot could not be loaded, so this preview cannot show or compare verified points.";
  document.querySelector("#status-card").textContent = "Decision withheld · evidence unavailable";
  document.querySelector("#sources").hidden = true;
  document.querySelector("#map-title").textContent = "Evidence unavailable";
  document.querySelector("#map-scale-note").textContent = "No points loaded · no map comparison available";
  document.querySelector("#snapshot-pill").textContent = "EVIDENCE UNAVAILABLE";
  document.querySelector("#compare-instruction").textContent = "Restore the local snapshot to inspect candidate blocks.";
  document.querySelector("#map-tag").hidden = true;
  document.querySelector("#map-north").hidden = true;
  document.querySelector("#map-footer").hidden = true;
  map.setAttribute("aria-label", "Block evidence could not be loaded");
  console.error(error);
}
