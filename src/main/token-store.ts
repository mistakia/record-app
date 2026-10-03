// Remote-mode bearer tokens (spec §8.7.3, §8.10.7), one per node URL. On
// macOS they live in the login Keychain, written through /usr/bin/security
// with the token on stdin, never in argv where any process could read it.
// Elsewhere (the Linux test runner) nothing is persisted: the token lasts
// until the app quits. Imports nothing from Electron.

import { spawn } from 'node:child_process'

const SECURITY = '/usr/bin/security'
const SERVICE = 'org.record.app.node-token'
const LABEL = 'Record node access token'
const MAX_TOKEN_CHARS = 4096
// The token travels in the bearer.<token> WebSocket subprotocol, which must
// be an HTTP token (RFC 7230 tchar), so anything else could never be sent.
const TOKEN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/

export type TokenCheck = { ok: true, token: string } | { ok: false, reason: string }

export const check_token = (input: unknown): TokenCheck => {
  if (typeof input !== 'string') return { ok: false, reason: 'Enter an access token.' }
  const token = input.trim()
  if (token === '') return { ok: false, reason: 'Enter an access token.' }
  if (token.length > MAX_TOKEN_CHARS) return { ok: false, reason: `The access token is longer than ${MAX_TOKEN_CHARS} characters.` }
  if (!TOKEN.test(token)) return { ok: false, reason: 'The access token has a space or a character a token cannot carry ( ) < > @ , ; : \\ " / [ ] ? = { }.' }
  return { ok: true, token }
}

export interface TokenStore {
  // Whether a saved token outlives the app.
  persistent: boolean
  get: (node_url: string) => Promise<string | null>
  set: (node_url: string, token: string) => Promise<void>
  delete: (node_url: string) => Promise<void>
}

export interface SecurityRun {
  code: number | null
  stdout: string
  stderr: string
}

export type RunSecurity = (input: { args: string[], stdin?: string }) => Promise<SecurityRun>

const run_security: RunSecurity = async ({ args, stdin }) => await new Promise((resolve, reject) => {
  const child = spawn(SECURITY, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk })
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk })
  child.on('error', reject)
  child.on('close', (code) => { resolve({ code, stdout, stderr }) })
  child.stdin.end(stdin ?? '')
})

// security's exit code for an item that is not in the Keychain.
const ITEM_NOT_FOUND = 44

// A node URL passed check_node_url, so it holds no quote, backslash, or
// whitespace; refuse one that does rather than quote it into a command line.
const check_account = (node_url: string): string => {
  if (/["\\\s]/.test(node_url)) throw new Error('A node URL with quotes or whitespace cannot name a Keychain item.')
  return node_url
}

export const create_keychain_token_store = ({ run = run_security }: { run?: RunSecurity } = {}): TokenStore => {
  const get = async (node_url: string): Promise<string | null> => {
    const result = await run({ args: ['find-generic-password', '-s', SERVICE, '-a', check_account(node_url), '-w'] })
    if (result.code === ITEM_NOT_FOUND) return null
    if (result.code !== 0) throw new Error(`Keychain read failed (${result.code}): ${result.stderr.trim()}`)
    const token = result.stdout.replace(/\n$/, '')
    return token === '' ? null : token
  }
  return {
    persistent: true,
    get,
    set: async (node_url, token) => {
      const checked = check_token(token)
      if (!checked.ok) throw new Error(checked.reason)
      // Interactive mode reads the command from stdin. The token is tchar
      // only, so it holds no double quote and needs no escaping inside one.
      const command = `add-generic-password -U -s "${SERVICE}" -a "${check_account(node_url)}" -l "${LABEL}" -w "${checked.token}"\n`
      const result = await run({ args: ['-i'], stdin: command })
      // Interactive mode exits 0 even when its command fails, so read back.
      if (result.code !== 0 || await get(node_url) !== checked.token) throw new Error(`Keychain write failed: ${result.stderr.trim()}`)
    },
    delete: async (node_url) => {
      const result = await run({ args: ['delete-generic-password', '-s', SERVICE, '-a', check_account(node_url)] })
      if (result.code !== 0 && result.code !== ITEM_NOT_FOUND) throw new Error(`Keychain delete failed (${result.code}): ${result.stderr.trim()}`)
    }
  }
}

export const create_memory_token_store = (): TokenStore => {
  const tokens = new Map<string, string>()
  return {
    persistent: false,
    get: async (node_url) => tokens.get(node_url) ?? null,
    set: async (node_url, token) => { tokens.set(node_url, token) },
    delete: async (node_url) => { tokens.delete(node_url) }
  }
}

export const create_token_store = (): TokenStore =>
  process.platform === 'darwin' ? create_keychain_token_store() : create_memory_token_store()
