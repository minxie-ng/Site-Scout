const names = { PG: 'Punggol', SGN: 'Serangoon', CL: 'Clementi' };
const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const exactUrl = (value, host) => {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === host; }
  catch { return false; }
};
const dated = value => typeof value === 'string' && /^2026-10-(05|06|12)T/.test(value) &&
  Number.isFinite(Date.parse(value));
const datedDay = value => value === '2026-10-12';
// Pin the reviewed replay bytes so a changed coordinate cannot appear as checked evidence.
const reviewedFeedSha256 = '3efcfc1f3ab42d5759fb3bce6f90295f0d789ba6b8231f142dbac96c58c14560';
const verifiedFeeds = new WeakSet();
const freezeEvidence = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeEvidence(child);
    Object.freeze(value);
  }
  return value;
};

export async function verifyPriorityMapFeed(rawText) {
  if (typeof rawText !== 'string') throw new Error('Priority map integrity failure');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawText));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== reviewedFeedSha256) throw new Error('Priority map integrity failure');
  const feed = freezeEvidence(validatePriorityMapFeed(JSON.parse(rawText)));
  verifiedFeeds.add(feed);
  return feed;
}

export const isVerifiedPriorityMapFeed = feed => feed !== null && typeof feed === 'object' && verifiedFeeds.has(feed);

/** The browser only plots reviewed snapshot points; it does not rank sites. */
export function validatePriorityMapFeed(feed) {
  if (!feed || feed.snapshotDate !== '2026-10-12' ||
    feed.selectionScope !== 'sampled_groups_research_triage' ||
    feed.outcome !== 'insufficient_evidence' || !Array.isArray(feed.priorities) ||
    feed.priorities.length !== 3 || !feed.coverage ||
    feed.coverage.checkedPointCount !== 89 || feed.coverage.eligibleGroupCount !== 20 ||
    feed.coverage.townsWithEligibleGroups !== 17 || feed.coverage.unprobedLeadCount !== 10727 ||
    feed.coverage.unresolvedSampledLeadCount !== 1 || !Array.isArray(feed.townCoverage) ||
    feed.townCoverage.length !== 27 || !Array.isArray(feed.checkedPoints) ||
    feed.checkedPoints.length !== feed.coverage.checkedPointCount || !Array.isArray(feed.sampledGroups) ||
    feed.sampledGroups.length !== feed.coverage.eligibleGroupCount)
    throw new Error('Priority map evidence unavailable');
  const townCodes = new Set();
  for (const town of feed.townCoverage) {
    if (!/^[A-Z]{2,3}$/.test(town.code) || townCodes.has(town.code) || town.status !== 'unassessed' ||
      !Number.isSafeInteger(town.totalHdbLeads) || town.totalHdbLeads <= 0 ||
      !Number.isSafeInteger(town.checkedAddressPointCount) || town.checkedAddressPointCount < 0 ||
      town.checkedAddressPointCount > town.totalHdbLeads ||
      !Number.isSafeInteger(town.eligibleGroupCount) || town.eligibleGroupCount < 0)
      throw new Error('Town coverage invalid');
    townCodes.add(town.code);
  }
  if (feed.townCoverage.reduce((sum, town) => sum + town.checkedAddressPointCount, 0) !== 89 ||
    feed.townCoverage.reduce((sum, town) => sum + town.totalHdbLeads, 0) !== 10817)
    throw new Error('Town coverage incomplete');
  const pointIds = new Set();
  for (const point of feed.checkedPoints) {
    const id = `${point.townCode}:${point.block}:${point.street}`;
    if (!townCodes.has(point.townCode) || pointIds.has(id) ||
      !/^[0-9A-Z]{1,5}$/.test(point.block) || !/^[A-Z0-9 .'-]{4,80}$/.test(point.street) ||
      !Number.isFinite(point.latitude) || point.latitude < 1.1 || point.latitude > 1.5 ||
      !Number.isFinite(point.longitude) || point.longitude < 103.5 || point.longitude > 104.1 ||
      !exactUrl(point.sourceUrl, 'www.onemap.gov.sg') || !dated(point.retrievedAt) ||
      !exactUrl(point.hdbSourceUrl, 'data.gov.sg') || !datedDay(point.hdbRetrievedDate) ||
      !['checked_replay', 'checked_api_replay'].includes(point.evidenceStatus))
      throw new Error('Checked point invalid');
    pointIds.add(id);
  }
  if (feed.townCoverage.some(town => town.checkedAddressPointCount !==
    feed.checkedPoints.filter(point => point.townCode === town.code).length))
    throw new Error('Town point count mismatch');
  for (const group of feed.sampledGroups) {
    if (!townCodes.has(group.townCode) || group.outcome !== 'insufficient_evidence' ||
      !Number.isFinite(group.maxPairwiseMetres) || group.maxPairwiseMetres > 125 ||
      group.maxPairwiseMetres < 0 || !Array.isArray(group.members) || group.members.length !== 3 ||
      new Set(group.members.map(member => `${member.block}:${member.street}`)).size !== 3 ||
      group.members.some(member => !/^[0-9A-Z]{1,5}$/.test(member.block) ||
        !/^[A-Z0-9 .'-]{4,80}$/.test(member.street) ||
        !exactUrl(member.sourceUrl, 'www.onemap.gov.sg') || !dated(member.retrievedAt) ||
        !exactUrl(member.hdbSourceUrl, 'data.gov.sg') || !datedDay(member.hdbRetrievedDate)))
      throw new Error('Sampled group invalid');
  }
  if (feed.townCoverage.some(town => town.eligibleGroupCount !==
    feed.sampledGroups.filter(group => group.townCode === town.code).length))
    throw new Error('Town group count mismatch');
  const ids = new Set();
  feed.priorities.forEach((priority, index) => {
    if (priority.investigationPriority !== index + 1 ||
      priority.townCode !== Object.keys(names)[index] ||
      priority.evidenceKind !== 'derived_value' || priority.outcome !== 'insufficient_evidence' ||
      priority.siteRank !== null || !Array.isArray(priority.members) || priority.members.length !== 3 ||
      !Number.isFinite(priority.maxPairwiseMetres) || priority.maxPairwiseMetres < 0 ||
      priority.maxPairwiseMetres > 125 || !Number.isSafeInteger(priority.publishedDwellingUnits) ||
      priority.publishedDwellingUnits <= 0)
      throw new Error('Priority map group invalid');
    let sum = 0;
    for (const member of priority.members) {
      const id = `${priority.townCode}:${member.block}:${member.street}`;
      if (ids.has(id) || !/^[0-9A-Z]{1,5}$/.test(member.block) ||
        typeof member.street !== 'string' || !/^[A-Z0-9 .'-]{4,80}$/.test(member.street) ||
        !Number.isFinite(member.latitude) || member.latitude < 1.1 || member.latitude > 1.5 ||
        !Number.isFinite(member.longitude) || member.longitude < 103.5 || member.longitude > 104.1 ||
        !Number.isSafeInteger(member.publishedDwellingUnits) || member.publishedDwellingUnits <= 0 ||
        !exactUrl(member.sourceUrl, 'www.onemap.gov.sg') || !dated(member.retrievedAt) ||
        !['checked_replay', 'checked_api_replay'].includes(member.evidenceStatus) ||
        !exactUrl(member.hdbSourceUrl, 'data.gov.sg') || !datedDay(member.hdbRetrievedDate))
        throw new Error('Priority map point invalid');
      ids.add(id);
      sum += member.publishedDwellingUnits;
    }
    if (sum !== priority.publishedDwellingUnits) throw new Error('Priority map total invalid');
  });
  return feed;
}

const bounds = (points, padding) => {
  const lats = points.map(point => point.latitude);
  const lons = points.map(point => point.longitude);
  return { minLat: Math.min(...lats) - padding, maxLat: Math.max(...lats) + padding,
    minLon: Math.min(...lons) - padding, maxLon: Math.max(...lons) + padding };
};
const project = (point, box, width, height) => ({
  x: 36 + (point.longitude - box.minLon) / (box.maxLon - box.minLon) * (width - 72),
  y: height - 30 - (point.latitude - box.minLat) / (box.maxLat - box.minLat) * (height - 60),
});

export function priorityMapView(feed, selected) {
  validatePriorityMapFeed(feed);
  if (!Number.isSafeInteger(selected) || selected < 0 || selected > 2)
    throw new Error('Invalid priority selection');
  const anchors = feed.priorities.map(priority => ({ latitude: priority.members.reduce((sum, m) => sum + m.latitude, 0) / 3,
    longitude: priority.members.reduce((sum, m) => sum + m.longitude, 0) / 3 }));
  const overviewBounds = { minLon: 103.58, maxLon: 104.02, minLat: 1.23, maxLat: 1.47 };
  const overview = `<svg viewBox="0 0 680 350" role="group" aria-label="Geographic address-point overview of three sampled Singapore block groups"><path d="M36 30H644V320H36Z" fill="none" stroke="#bfd6d0"/><path d="M36 175H644M340 30V320" stroke="#dcebe6" stroke-dasharray="4 7"/>${anchors.map((anchor, index) => {
    const point = project(anchor, overviewBounds, 680, 350);
    return `<g class="priority-map-pin${index === selected ? ' active' : ''}" data-priority="${index}" role="button" tabindex="0" aria-label="Inspect ${names[feed.priorities[index].townCode]} sampled block group"><circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${index === selected ? 20 : 16}"/><text x="${point.x.toFixed(2)}" y="${(point.y + 4).toFixed(2)}" text-anchor="middle">${index + 1}</text><text class="town-label" x="${point.x.toFixed(2)}" y="${(point.y + 37).toFixed(2)}" text-anchor="middle">${names[feed.priorities[index].townCode]}</text></g>`;
  }).join('')}<text class="axis-label" x="36" y="343">WEST · 103.58°E</text><text class="axis-label" x="546" y="343">104.02°E · EAST</text></svg>`;
  const priority = feed.priorities[selected];
  const localBounds = bounds(priority.members, 0.0007);
  const local = `<svg viewBox="0 0 420 250" role="img" aria-label="Exact address points for Blocks ${priority.members.map(m => escape(m.block)).join(', ')}"><path d="M36 30H384V220H36Z" fill="none" stroke="#bfd6d0"/>${priority.members.map(member => {
    const point = project(member, localBounds, 420, 250);
    return `<g><circle class="block-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="7"/><text class="block-label" x="${(point.x + 10).toFixed(2)}" y="${(point.y - 9).toFixed(2)}">${escape(member.block)}</text></g>`;
  }).join('')}<text class="axis-label" x="37" y="241">WGS84 address points · magnified view</text></svg>`;
  const choices = feed.priorities.map((item, index) => `<button type="button" data-priority="${index}" aria-pressed="${index === selected}"><span>0${index + 1} · ${names[item.townCode]}</span><small>${item.members.map(m => escape(m.block)).join(' · ')} · ${item.publishedDwellingUnits} published homes</small></button>`).join('');
  const detail = `<span class="candidate-index">INVESTIGATION PRIORITY 0${selected + 1} · DERIVED HOUSING-STOCK ORDER</span><h3>${names[priority.townCode]}</h3><p class="priority-map-status">Insufficient evidence for an outlet decision</p><p>${priority.publishedDwellingUnits} published dwellings across three checked HDB blocks. This is housing stock, not occupied homes, Pilates demand or a national site ranking.</p><ul>${priority.members.map(member => `<li><strong>Block ${escape(member.block)} ${escape(member.street)}</strong><span>Checked address replay · ${member.publishedDwellingUnits} published dwellings</span><span><a href="${escape(member.sourceUrl)}" target="_blank" rel="noopener noreferrer">OneMap address</a> retrieved <time datetime="${escape(member.retrievedAt)}">${escape(member.retrievedAt.slice(0, 10))}</time> · <a href="${escape(member.hdbSourceUrl)}" target="_blank" rel="noopener noreferrer">HDB housing record</a> retrieved <time datetime="${escape(member.hdbRetrievedDate)}">${escape(member.hdbRetrievedDate.slice(0, 10))}</time></span></li>`).join('')}</ul>`;
  const coverage = `${feed.coverage.checkedPointCount} checked address points · ${feed.coverage.eligibleGroupCount} sampled three-block groups · ${feed.coverage.unprobedLeadCount.toLocaleString('en-SG')} HDB leads unprobed · 27 whole towns unassessed. One sampled lead was not found. No national winner established.`;
  return { overview, local, choices, detail, coverage };
}

export function mountPriorityMap(root, rawFeed, onSelect) {
  const feed = validatePriorityMapFeed(rawFeed);
  const nodes = Object.fromEntries(['overview', 'local', 'choices', 'detail', 'coverage'].map(name =>
    [name, root.querySelector(`#priority-${name}`)]));
  if (Object.values(nodes).some(node => !node)) throw new Error('Priority map container unavailable');
  let selected = 0;
  const render = () => { const view = priorityMapView(feed, selected);
    for (const [name, html] of Object.entries(view)) nodes[name].innerHTML = html; };
  const choose = event => {
    const target = event.target.closest('[data-priority]');
    if (!target) return;
    const next = Number(target.dataset.priority);
    if (Number.isSafeInteger(next) && next >= 0 && next < 3) {
      const keepFocus = typeof document !== 'undefined' && document.activeElement === target;
      const region = nodes.overview.contains?.(target) ? nodes.overview : nodes.choices;
      selected = next;
      render();
      onSelect?.(selected);
      if (keepFocus) region.querySelector(`[data-priority="${next}"]`)?.focus();
    }
  };
  nodes.choices.addEventListener('click', choose);
  nodes.overview.addEventListener('click', choose);
  nodes.overview.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(event); }
  });
  render();
  onSelect?.(selected);
}
