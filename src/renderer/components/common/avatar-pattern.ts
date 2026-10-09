// The avatar a library has before it is given an image: a 5×5 mirrored
// pattern read from its address, so the same library looks the same on
// every device and to every peer, and two libraries rarely look alike. The
// identity goes by its default library's, so it shares that pattern.

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
