// Maps the rows the virtual list shows onto the 200-row pages that hold
// them, so only the pages in view (plus one either side) are fetched and
// cached; the rest of a library never sits in memory (spec §8.11.2).

import { TRACK_PAGE_SIZE } from '#renderer/api/types.ts'

// The pages to hold: the ones the rows show plus page 0 (it carries the
// total, and the snapshot reads it), and the neighbour the list is moving
// toward, to fetch ahead once those have loaded. A node runs its page
// queries one at a time and answers requests that arrive together all at
// the end, so a neighbour asked for alongside the page in view delays it.
export const pages_for_rows = ({ first_row, last_row, total, direction = 'forward' }: {
  first_row: number
  last_row: number
  total: number
  direction?: 'forward' | 'backward'
}): { shown: number[], ahead: number[] } => {
  if (total <= 0) return { shown: [0], ahead: [] }
  const last_page = Math.floor((total - 1) / TRACK_PAGE_SIZE)
  const first = Math.min(last_page, Math.floor(first_row / TRACK_PAGE_SIZE))
  const last = Math.min(last_page, Math.floor(Math.max(last_row, first_row) / TRACK_PAGE_SIZE))
  const shown: number[] = []
  for (let page = first; page <= last; page++) shown.push(page)
  if (!shown.includes(0)) shown.push(0)
  const next = direction === 'forward' ? last + 1 : first - 1
  const ahead = next >= 0 && next <= last_page && !shown.includes(next) ? [next] : []
  return { shown, ahead }
}

export const row_location = (row: number): { page: number, offset: number } =>
  ({ page: Math.floor(row / TRACK_PAGE_SIZE), offset: row % TRACK_PAGE_SIZE })
