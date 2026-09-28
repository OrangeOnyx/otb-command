/* Pure label helpers for the A-4 Site Evidence sheet (unit-testable). */
/* time-clock-117-5.jpg → "117.5", time-clock-119-5-2.jpg → "119.5 (2nd photo)",
   time-clock-131-133.jpg → "131 / 133", time-clock-135a.jpg → "135A" */
export function clockLabel(file) {
  const key = file.replace(/^.*time-clock-/, '').replace(/\.jpg$/i, '');
  if (key === '131-133') return '131 / 133';
  const m = key.match(/^(\d+)(?:-(5))?(?:-(\d))?([a-z])?$/i);
  if (!m) return key;
  return `${m[1]}${m[2] ? '.' + m[2] : ''}${m[4] ? m[4].toUpperCase() : ''}${m[3] ? ` (${m[3] === '2' ? '2nd' : m[3] + 'th'} photo)` : ''}`;
}
