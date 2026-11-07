// What the end-to-end scripts ask the in-process node directly: a JSON
// read or write through its API, and a bounded wait for its state.

export const node_json = async <T>(node_url: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${node_url}/api${path}`, init)
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path}: ${response.status}`)
  return await response.json() as T
}

// Polls until the condition holds, for about 30 seconds.
export const until = async (condition: () => Promise<boolean>, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`timed out waiting for ${label}`)
}
