/* A release gate, not an authorization replacement: hosted data still uses
   the existing authentication, property membership and database policies. */
export function assetTwinAvailable({ localReview = false, remote = false, hostedEnabled = false, role } = {}) {
  return localReview || (hostedEnabled && remote && ['operator', 'owner'].includes(role));
}
