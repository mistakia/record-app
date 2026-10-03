// The library whose first track page the hibernation snapshot restored, with
// trimmed tracks (spec §8.8.3), until the first reconcile has refetched it.

let restored_page: string | null = null

export const mark_restored_page = (library_address: string): void => { restored_page = library_address === '' ? '*' : library_address }

export const take_restored_page = (): string | null => {
  const page = restored_page
  restored_page = null
  return page
}
