// Node URL validation shared by the main process (authoritative, before any
// request) and the connection settings form (inline feedback). Spec §8.7.2:
// a node URL is `<scheme>://<host>:<port>`, port included, with scheme http
// or https; §8.7.4:
// plain http to a non-loopback host carries a visible warning.

export type NodeUrlCheck =
  | { ok: true, node_url: string, warning: string | null }
  | { ok: false, reason: string }

const LOOPBACK_HOSTNAMES = new Set(['localhost', '[::1]'])

export const is_loopback_hostname = (hostname: string): boolean =>
  LOOPBACK_HOSTNAMES.has(hostname) || /^127(\.\d{1,3}){3}$/.test(hostname)

export const check_node_url = (input: string): NodeUrlCheck => {
  const text = input.trim()
  if (text === '') return { ok: false, reason: 'Enter a node URL.' }
  // Control characters and whitespace never belong in a node URL.
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\u0000- \u007f]/.test(text)) return { ok: false, reason: 'The node URL contains whitespace or control characters.' }
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return { ok: false, reason: 'The node URL is not a valid URL.' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'The node URL must start with http:// or https://.' }
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'The node URL must not carry credentials.' }
  if (url.hostname === '') return { ok: false, reason: 'The node URL has no host.' }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search !== '' || url.hash !== '' || /[?#]$/.test(text)) {
    return { ok: false, reason: 'The node URL is scheme, host, and port only, with no path, query, or fragment.' }
  }
  // The port must be written out. Read it from the input, because URL drops
  // a scheme's default port (https://host:443 parses with port '').
  const authority = text.slice(url.protocol.length + 2).split('/')[0] ?? ''
  const port = /:(\d+)$/.exec(authority)?.[1]
  if (port === undefined) return { ok: false, reason: 'The node URL needs an explicit port, as in http://127.0.0.1:3000.' }
  const warning = url.protocol === 'http:' && !is_loopback_hostname(url.hostname)
    ? 'Traffic to this node is unencrypted. Use https:// for a node on another machine.'
    : null
  return { ok: true, node_url: `${url.protocol}//${url.hostname}:${Number(port)}`, warning }
}
