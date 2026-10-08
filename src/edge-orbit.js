// Signed orbit input: only the outer 7% (up to 88px) responds.
export function edgeOrbitInput(x, width) {
  if (width <= 0 || x < 0 || x > width) return 0;
  const zone = Math.min(88, width * .07);
  const strength = x < zone ? -(1 - x / zone)
    : x > width - zone ? (x - width + zone) / zone : 0;
  return Math.sign(strength) * strength * strength;
}
