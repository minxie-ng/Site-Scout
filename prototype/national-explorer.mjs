import { isVerifiedPriorityMapFeed } from './priority-map.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** Browse all currently checked witnesses; an unprobed town is never scored zero. */
export function nationalExplorerView(feed) {
  if (!isVerifiedPriorityMapFeed(feed)) throw new Error('Checked Singapore sample unavailable');
  const towns = feed.townCoverage.map(town => {
    const groups = feed.sampledGroups.filter(group => group.townCode === town.code);
    const points = feed.checkedPoints.filter(point => point.townCode === town.code);
    const evidence = groups.length ? groups.map(group => `<li>Derived three-block witness: ${group.members.map(member =>
      `${escape(member.block)} ${escape(member.street)}`).join(' · ')} · ${group.maxPairwiseMetres.toFixed(0)} m maximum straight-line span · <strong>Insufficient evidence</strong></li>`).join('') :
      '<li>No checked three-block group in this small sample; this is unknown, not a negative result.</li>';
    const sources = points.map(point => `<li>Checked address: Block ${escape(point.block)} ${escape(point.street)} · <a href="${escape(point.sourceUrl)}" target="_blank" rel="noopener noreferrer">OneMap</a> retrieved ${escape(point.retrievedAt.slice(0, 10))} · <a href="${escape(point.hdbSourceUrl)}" target="_blank" rel="noopener noreferrer">HDB</a> retrieved ${escape(point.hdbRetrievedDate)}</li>`).join('');
    return `<details><summary><strong>${escape(town.code)}</strong><span>${town.checkedAddressPointCount} checked points · ${groups.length} sampled groups · ${town.totalHdbLeads} HDB leads</span></summary><ul>${evidence}${sources}</ul></details>`;
  }).join('');
  return `<p>Singapore HDB block-address sample · source scope: HDB Property Information, Singapore; exact OneMap addresses linked below. HDB housing snapshot retrieved 2026-10-12. 27 HDB town codes · ${feed.coverage.checkedPointCount} checked OneMap address points · ${feed.coverage.eligibleGroupCount} derived three-block witnesses · ${feed.coverage.unprobedLeadCount.toLocaleString('en-SG')} unprobed leads and one unresolved probe. All whole towns remain unassessed; no national site winner.</p><div class="national-explorer-grid">${towns}</div>`;
}
