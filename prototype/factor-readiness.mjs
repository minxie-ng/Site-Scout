const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export function factorCards(factors) {
  if (!Array.isArray(factors) || factors.length === 0) throw new Error("Factor evidence missing");
  const ids = new Set();
  return factors.map(factor => {
    if (!factor || typeof factor !== "object" || typeof factor.id !== "string" || ids.has(factor.id)
      || factor.status !== "research_only" || !Array.isArray(factor.linkedClusterIds) || factor.linkedClusterIds.length
      || ![factor.title, factor.summary, factor.blocker, factor.sourceName, factor.scope].every(value => typeof value === "string" && value.trim())
      || !factor.scope.includes("Singapore") || typeof factor.sourceUrl !== "string" || !/^https:\/\//.test(factor.sourceUrl)
      || typeof factor.retrievedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(factor.retrievedOn)) {
      throw new Error("Factor evidence is not safe for research-only display");
    }
    ids.add(factor.id);
    return `<article class="factor-card"><span class="factor-state">RESEARCH LEAD · NOT CLUSTER-VERIFIED</span><h3>${escapeHtml(factor.title)}</h3><p>${escapeHtml(factor.summary)}</p><p class="factor-blocker"><strong>Missing for a decision:</strong> ${escapeHtml(factor.blocker)}</p><small>${escapeHtml(factor.scope)} · retrieved <time datetime="${escapeHtml(factor.retrievedOn)}">${escapeHtml(factor.retrievedOn)}</time><br><a href="${escapeHtml(factor.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(factor.sourceName)} ↗</a></small></article>`;
  }).join("");
}
