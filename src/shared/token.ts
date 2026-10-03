// The bearer-token check shared by main (authoritative) and the connection
// settings form (inline feedback). The token travels in the bearer.<token>
// WebSocket subprotocol, which must be an HTTP token (RFC 7230 tchar), so
// anything else could never be sent. The length cap keeps the Keychain
// command line main writes it with well under security's line limit.

export const MAX_TOKEN_CHARS = 2048
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
