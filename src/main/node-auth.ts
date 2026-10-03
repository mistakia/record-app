// Bearer auth against a remote node (spec §8.7.3). main holds the token and
// attaches it to every request on the renderer's behalf; the renderer only
// learns whether one is saved (§8.10.7). A 401 means the token is invalid:
// it is deleted from the Keychain, and nothing more is sent to that node
// until the user enters a new token. A node that answers 401 with no token
// sent is one that needs a token, and gets the same treatment. Imports
// nothing from Electron.
//
// Each node's credentials carry a generation, bumped by every save, log
// out, and rejection. A request records the generation it was sent under,
// and a 401 only rejects that generation, so a late 401 for a replaced
// token (even one replaced by the same value) changes nothing. Keychain
// writes for one node run one at a time, in the order they were asked for.

import type { AuthView } from '#shared/bridge.ts'
import type { TokenStore } from './token-store.ts'

export interface NodeCredentials {
  token: string | null
  generation: number
}

export const create_node_auth = ({ tokens, log = console.error }: {
  tokens: TokenStore
  log?: (message: string) => void
}) => {
  // The token for each node URL whose Keychain item has been read.
  const loaded = new Map<string, string | null>()
  const generations = new Map<string, number>()
  // Node URLs that refused a request this run: 'token' when one was sent.
  const rejected = new Map<string, 'token' | 'none'>()
  const queues = new Map<string, Promise<unknown>>()

  const token = (node_url: string): string | null => loaded.get(node_url) ?? null
  const generation = (node_url: string): number => generations.get(node_url) ?? 0
  const bump = (node_url: string): void => { generations.set(node_url, generation(node_url) + 1) }

  const queued = async <T>(node_url: string, run: () => Promise<T>): Promise<T> => {
    const next = (queues.get(node_url) ?? Promise.resolve()).then(run)
    queues.set(node_url, next.catch(() => {}))
    return await next
  }

  return {
    // Reads the node's token once; a Keychain failure is logged and leaves
    // the node without a token rather than stopping the app.
    load: async (node_url: string): Promise<void> => {
      if (loaded.has(node_url)) return
      await queued(node_url, async () => {
        if (loaded.has(node_url)) return
        try {
          loaded.set(node_url, await tokens.get(node_url))
        } catch (error) {
          log(`node auth: ${String(error)}`)
          loaded.set(node_url, null)
        }
      })
    },
    credentials: (node_url: string): NodeCredentials => ({ token: token(node_url), generation: generation(node_url) }),
    blocked: (node_url: string): boolean => rejected.has(node_url),
    view: (node_url: string | null): AuthView => {
      const refused = node_url === null ? undefined : rejected.get(node_url)
      const status = node_url === null
        ? 'none'
        : refused === 'token' ? 'rejected' : refused === 'none' ? 'required' : token(node_url) === null ? 'none' : 'saved'
      return { status, persistent: tokens.persistent }
    },
    // The new credentials take effect inside the queued write, once the
    // token is stored: a failed save leaves the current ones, and a 401 for
    // them, in force, and a rejection's delete queued behind the write sees
    // the node no longer rejected and deletes nothing.
    save: async (node_url: string, value: string): Promise<void> => {
      await queued(node_url, async () => {
        await tokens.set(node_url, value)
        bump(node_url)
        loaded.set(node_url, value)
        rejected.delete(node_url)
      })
    },
    logout: async (node_url: string): Promise<void> => {
      bump(node_url)
      await queued(node_url, async () => {
        await tokens.delete(node_url)
        loaded.set(node_url, null)
        rejected.delete(node_url)
      })
    },
    // A 401 for a request sent under `sent`. True when that is news: the
    // node is now blocked, at once, and its token is deleted behind any
    // Keychain write already queued.
    reject: (node_url: string, sent: NodeCredentials): boolean => {
      if (sent.generation !== generation(node_url) || rejected.has(node_url)) return false
      bump(node_url)
      rejected.set(node_url, sent.token === null ? 'none' : 'token')
      loaded.set(node_url, null)
      if (sent.token !== null) {
        queued(node_url, async () => {
          // Delete only what was refused: once a save or log out has landed
          // the node is no longer rejected, and its token stays.
          if (rejected.has(node_url) && await tokens.get(node_url) === sent.token) await tokens.delete(node_url)
        }).catch((error: unknown) => { log(`node auth: ${String(error)}`) })
      }
      return true
    }
  }
}

export type NodeAuth = ReturnType<typeof create_node_auth>
