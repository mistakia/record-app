// Bearer auth against a remote node (spec §8.7.3). main holds the token and
// attaches it to every request on the renderer's behalf; the renderer only
// learns whether one is saved (§8.10.7). A 401 means the token is invalid:
// it is deleted from the Keychain, and nothing more is sent to that node
// until the user enters a new token. A node that answers 401 with no token
// sent is one that needs a token, and gets the same treatment. Imports
// nothing from Electron.

import type { AuthView } from '#shared/bridge.ts'
import type { TokenStore } from './token-store.ts'

export const create_node_auth = ({ tokens, log = console.error }: {
  tokens: TokenStore
  log?: (message: string) => void
}) => {
  // The token for each node URL whose Keychain item has been read.
  const loaded = new Map<string, string | null>()
  // Node URLs that refused their token (or the lack of one) this run.
  const rejected = new Set<string>()

  const token = (node_url: string): string | null => loaded.get(node_url) ?? null

  return {
    // Reads the node's token once; a Keychain failure is logged and leaves
    // the node without a token rather than stopping the app.
    load: async (node_url: string): Promise<void> => {
      if (loaded.has(node_url)) return
      try {
        loaded.set(node_url, await tokens.get(node_url))
      } catch (error) {
        log(`node auth: ${String(error)}`)
        loaded.set(node_url, null)
      }
    },
    token,
    blocked: (node_url: string): boolean => rejected.has(node_url),
    view: (node_url: string | null): AuthView => ({
      status: node_url === null ? 'none' : rejected.has(node_url) ? 'rejected' : token(node_url) === null ? 'none' : 'saved',
      persistent: tokens.persistent
    }),
    save: async (node_url: string, value: string): Promise<void> => {
      await tokens.set(node_url, value)
      loaded.set(node_url, value)
      rejected.delete(node_url)
    },
    logout: async (node_url: string): Promise<void> => {
      await tokens.delete(node_url)
      loaded.set(node_url, null)
      rejected.delete(node_url)
    },
    // A 401 for the token that was sent. A token saved since the request
    // left is not the one refused, so it stays.
    reject: async (node_url: string, sent: string | null): Promise<boolean> => {
      if (token(node_url) !== sent || rejected.has(node_url)) return false
      rejected.add(node_url)
      loaded.set(node_url, null)
      if (sent !== null) {
        try {
          await tokens.delete(node_url)
        } catch (error) {
          log(`node auth: ${String(error)}`)
        }
      }
      return true
    }
  }
}

export type NodeAuth = ReturnType<typeof create_node_auth>
