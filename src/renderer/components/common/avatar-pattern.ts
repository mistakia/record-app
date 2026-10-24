// The avatar a library or identity has without an image: a 5×5 mirrored
// pattern read from a library's address or the identity's public key, so
// each looks the same on every device and to every peer, and two rarely
// look alike.

// FNV-1a, 32 bits: enough for the 15 free cells.
const hash = (seed: string): number => {
  let value = 0x811c9dc5
  for (const char of seed) value = Math.imul(value ^ (char.codePointAt(0) ?? 0), 0x01000193) >>> 0
  return value
}

// Row-major 5×5 cells, the right two columns mirroring the left two.
export const avatar_pattern = (seed: string): boolean[] => {
  const bits = hash(seed)
  const cells: boolean[] = []
  for (let row = 0; row < 5; row++) {
    const [a, b, c] = [0, 1, 2].map((column) => ((bits >>> (row * 3 + column)) & 1) === 1)
    cells.push(a ?? false, b ?? false, c ?? false, b ?? false, a ?? false)
  }
  return cells
}
