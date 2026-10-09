// A character gauge, base's TUI progress: [####------].
export const char_gauge = (fraction: number, width = 10): string => {
  const filled = Math.round(Math.min(Math.max(fraction, 0), 1) * width)
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`
}

export const import_fraction = ({ completed, errors, file_count, finished }: { completed: number, errors: readonly string[], file_count: number | null, finished: boolean }): number =>
  finished ? 1 : file_count === null || file_count === 0 ? 0 : (completed + errors.length) / file_count
