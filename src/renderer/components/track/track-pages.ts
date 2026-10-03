// Maps the rows the virtual list shows onto the 200-row pages that hold
// them, so only the pages in view (plus one either side) are fetched and
// cached; the rest of a library never sits in memory (spec §8.11.2).

import { TRACK_PAGE_SIZE } from '#renderer/api/types.ts'

export const pages_for_rows = ({ first_row, last_row, total }: { first_row: number, last_row: number, total: number }): number[] => {
  if (total <= 0) return [0]
  const last_page = Math.floor((total - 1) / TRACK_PAGE_SIZE)
  const from = Math.max(0, Math.floor(first_row / TRACK_PAGE_SIZE) - 1)
  const to = Math.min(last_page, Math.floor(Math.max(last_row, first_row) / TRACK_PAGE_SIZE) + 1)
  const pages: number[] = []
  for (let page = from; page <= to; page++) pages.push(page)
  return pages.includes(0) ? pages : [0, ...pages]
}

export const row_location = (row: number): { page: number, offset: number } =>
  ({ page: Math.floor(row / TRACK_PAGE_SIZE), offset: row % TRACK_PAGE_SIZE })
