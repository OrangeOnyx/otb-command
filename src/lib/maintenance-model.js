/* Shared event derivation for the existing M-1 queue and evidence reads. */
export function deriveRequest(row, events = []) {
  const forThis = events.filter(e => e.request_id === row.id);
  const latest = kind => forThis.filter(e => e.kind === kind).slice(-1)[0] || null;
  const st = latest('status'), asg = latest('assign');
  const status = (st && st.status) || 'open';
  const vendorId = asg ? asg.vendor_id : null;
  return {
    ...row, events:forThis, status, vendorId,
    displayStatus:status === 'open' && vendorId ? 'assigned' : status,
    lastAt:forThis.length ? forThis[forThis.length - 1].created_at : row.created_at,
  };
}
