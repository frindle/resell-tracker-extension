// "Is the latest GitHub tag newer than what's installed?" Numeric, part by
// part. A plain !== flagged an OLDER tag too: a v1.3.2 build loaded before
// its release was tagged said "update available: ext v1.3.1".
export function isNewerVersion(latest: string, current: string): boolean {
  const parts = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const a = parts(latest), b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}
