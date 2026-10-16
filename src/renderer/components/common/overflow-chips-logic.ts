// The pure half of the overflow chips (STYLE.md § Components › Tag chips):
// how many chips fit a line whole, the rest folded into one +N chip.

// The most leading chips that fit the width whole. All of them when they fit
// without the +N chip; otherwise as many as leave room for it beside them,
// and never fewer than one: a first chip too wide for the line still shows,
// ellipsized, so the line never reads as only +N.
export const fit_count = ({ widths, gap, available, more_width }: {
  widths: readonly number[]
  gap: number
  available: number
  more_width: number
}): number => {
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1)
  if (widths.length === 0 || total <= available) return widths.length
  let used = more_width
  let count = 0
  for (const width of widths) {
    used += width + gap
    if (used > available) break
    count += 1
  }
  return Math.max(1, count)
}
