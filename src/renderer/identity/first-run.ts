// A bundled node's first launch asks the person's name (spec §8.9.1): while
// the node's identity has no profile name, until the person answers or
// skips. Skipping is remembered per node in the view prefs (§8.8.4 Layer
// C), so it is asked once; a remote node's identity is its operator's.

import type { Profile } from '#renderer/api/types.ts'

export const first_run_key = (node_key: string): string => `first-run-done:${node_key}`

export const should_ask_name = ({ mode, running, node_key, profile, done }: {
  mode: string | undefined
  running: boolean
  node_key: string | null
  profile: Profile | undefined
  done: boolean
}): boolean => mode === 'bundled' && running && node_key !== null && profile !== undefined && profile.name === null && !done
