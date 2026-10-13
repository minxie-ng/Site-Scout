import { buildReviewedCandidates } from './study-memo.mjs';

const textFields = ['businessFormat', 'targetCustomers', 'existingOutlet'];
const positiveIntegers = ['seats', 'classesPerWeek', 'runwayMonths', 'openingMonths'];
const positiveMoney = ['priceSgd', 'rentCeilingSgd', 'openingBudgetSgd'];
const nonnegativeMoney = ['variableCostSgd', 'instructorCostSgd', 'otherFixedSgd'];

const money = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
  Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;

/** Capture only confirmed operator estimates; never infer missing values from the demo fixture. */
export function validateOwnerIntake(input) {
  const missing = [];
  for (const field of textFields) if (typeof input?.[field] !== 'string' || !input[field].trim()) missing.push(field);
  if (typeof input?.businessFormat === 'string' &&
    input.businessFormat.trim().toLowerCase() !== 'group reformer pilates' &&
    !missing.includes('businessFormat')) missing.push('businessFormat');
  for (const field of positiveIntegers) if (!Number.isSafeInteger(input?.[field]) || input[field] <= 0) missing.push(field);
  for (const field of positiveMoney) if (!money(input?.[field]) || input[field] <= 0 ||
    field === 'priceSgd' && money(input?.variableCostSgd) && input[field] <= input.variableCostSgd) missing.push(field);
  for (const field of nonnegativeMoney) if (!money(input?.[field])) missing.push(field);
  if (input?.confirmed !== true) missing.push('confirmation');
  return { ready: missing.length === 0, missing };
}

/** Owner-estimate arithmetic only; 4.33 weeks is a disclosed modelling convention. */
export function runOwnerEconomics(input) {
  if (!validateOwnerIntake(input).ready) throw new RangeError('Confirmed owner inputs are required');
  const classesPerMonth = input.classesPerWeek * 4.33;
  const capacity = input.seats * classesPerMonth;
  const contributionCents = Math.round(input.priceSgd * 100) - Math.round(input.variableCostSgd * 100);
  const fixedCents = Math.round(classesPerMonth * Math.round(input.instructorCostSgd * 100) +
    Math.round(input.otherFixedSgd * 100) + Math.round(input.rentCeilingSgd * 100));
  if (!Number.isFinite(capacity) || capacity <= 0 || capacity > Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(fixedCents) || contributionCents <= 0) throw new RangeError('Owner economics are outside the supported range');
  const requiredPaidVisitsPerMonth = Math.ceil(fixedCents / contributionCents);
  if (!Number.isSafeInteger(requiredPaidVisitsPerMonth)) throw new RangeError('Break-even visits are outside the supported range');
  return { basis: 'owner_confirmed_rent_ceiling', requiredPaidVisitsPerMonth,
    breakEvenAverageUtilisation: requiredPaidVisitsPerMonth / capacity,
    capacityStatus: requiredPaidVisitsPerMonth > capacity ? 'impossible_at_average_capacity' : 'within_average_capacity' };
}

/** Pair owner conditions with checked areas; absent local viability evidence always abstains. */
export function screenOwnerAreas(feed, input) {
  const economics = runOwnerEconomics(input);
  const candidates = buildReviewedCandidates(feed);
  return { economics, candidates: candidates.map(({ id, name, blocks, outcome, rank }) =>
    ({ id, name, blocks, outcome, rank })) };
}

export function invalidateOwnerConfirmation(form, event) {
  if (event.target?.name !== 'confirmed') form.querySelector('[name="confirmed"]').checked = false;
}

/** No form submission: inspect and display status only in this page's memory. */
export function mountOwnerIntake(root, status, feed, { onConfirmed, onInvalidated } = {}) {
  const confirmation = root.querySelector('[name="confirmed"]');
  const fingerprint = () => JSON.stringify([...root.querySelectorAll('input')]
    .filter(field => field.name !== 'confirmed').map(field => [field.name, field.value]));
  let confirmedFingerprint = null;
  const pending = () => {
    onInvalidated?.();
    status.innerHTML = '<strong>No personalized location result yet</strong><p>Confirm your current estimates. Area evidence and premises checks are still missing.</p>';
  };
  const changed = event => {
    if (event.target?.name === 'confirmed') confirmedFingerprint = confirmation.checked ? fingerprint() : null;
    else { invalidateOwnerConfirmation(root, event); confirmedFingerprint = null; }
    pending();
  };
  root.addEventListener('input', changed);
  root.addEventListener('change', changed);
  root.addEventListener('focusin', () => {
    if (confirmedFingerprint !== null && confirmedFingerprint !== fingerprint()) {
      confirmation.checked = false;
      confirmedFingerprint = null;
      pending();
    }
  });
  root.querySelector('.owner-submit').addEventListener('click', () => {
    if (!confirmation.checked || confirmedFingerprint !== fingerprint()) {
      confirmation.checked = false;
      confirmedFingerprint = null;
      pending();
      return;
    }
    const fields = [...root.querySelectorAll('input')];
    const invalid = fields.find(field => !field.checkValidity());
    if (invalid) {
      confirmation.checked = false;
      confirmedFingerprint = null;
      pending();
      invalid.reportValidity();
      return;
    }
    const values = Object.fromEntries(fields.map(field => [field.name,
      field.type === 'checkbox' ? field.checked : field.value]));
    for (const name of ['priceSgd', 'seats', 'classesPerWeek', 'variableCostSgd', 'instructorCostSgd',
      'otherFixedSgd', 'rentCeilingSgd', 'openingBudgetSgd', 'runwayMonths', 'openingMonths']) {
      values[name] = values[name] === '' || values[name] === undefined ? undefined : Number(values[name]);
    }
    const result = validateOwnerIntake(values);
    if (!result.ready) {
      confirmation.checked = false;
      confirmedFingerprint = null;
      status.innerHTML = '<strong>No personalized location result yet</strong><p>Complete and confirm every field with valid estimates before this business can be screened.</p>';
      return;
    }
    try {
      const comparison = screenOwnerAreas(feed, values);
      const economics = comparison.economics;
      const visits = economics.requiredPaidVisitsPerMonth.toLocaleString('en-SG');
      const utilisation = (economics.breakEvenAverageUtilisation * 100).toFixed(1);
      const capacityNote = economics.capacityStatus === 'impossible_at_average_capacity' ?
        'This exceeds the available seats at the stated class schedule.' :
        'This is a required utilisation, not a demand forecast.';
      const areas = comparison.candidates.map(candidate =>
        `<li><strong>${candidate.name}</strong> · Blocks ${candidate.blocks.join(', ')}: insufficient evidence</li>`).join('');
      status.innerHTML = `<strong>Business inputs confirmed for this session</strong><p>Confirmed calculation snapshot: S$${values.priceSgd} per paid visit, ${values.seats} seats, ${values.classesPerWeek} classes per week, and S$${values.rentCeilingSgd} assumed monthly rent ceiling. If form values change, reconfirm before using this snapshot.</p><p>At that rent ceiling, class-only break-even is ${visits} paid visits per month (${utilisation}% of available seat visits). ${capacityNote} This screen assumes scheduled classes with paid seat visits; it does not model other business formats. The model uses 4.33 weeks per month; business format, opening budget, runway, opening horizon, target customers and existing outlet do not affect this calculation.</p><p>Owner economics beside the dated area snapshot ${feed.snapshotDate}. No area-specific fit is established: premises rent, permitted use, demand and local competition are unverified for all three reviewed block groups.</p><ul>${areas}</ul><p>No personalized area recommendation yet; your figures are not saved or sent.</p>`;
      onConfirmed?.(values);
    } catch (cause) {
      onInvalidated?.();
      confirmation.checked = false;
      confirmedFingerprint = null;
      status.innerHTML = cause instanceof RangeError ?
        '<strong>No personalized scenario available</strong><p>These estimates are outside the supported calculation range. Review them before continuing. No personalized location result yet.</p>' :
        '<strong>Evidence unavailable</strong><p>The dated area snapshot failed validation. Restore the reviewed source before comparing areas. No personalized location result yet.</p>';
    }
  });
  return () => confirmation.checked && confirmedFingerprint !== null && confirmedFingerprint === fingerprint();
}
