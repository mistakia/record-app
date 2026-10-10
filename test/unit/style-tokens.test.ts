import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { Glob } from 'bun'

// STYLE.md § Anti-Patterns: a module reads role tokens only, so a theme is a
// token map rather than a restyle. Literal colors, system colors, primitives,
// and literal font families belong to src/renderer/styles/ alone.
const FORBIDDEN: ReadonlyArray<{ name: string, pattern: RegExp }> = [
  { name: 'hex color', pattern: /#[0-9a-f]{3,8}\b/i },
  { name: 'rgb()', pattern: /\brgba?\(/i },
  { name: 'hsl()', pattern: /\bhsla?\(/i },
  { name: 'system color', pattern: /\b(Canvas|CanvasText|ButtonFace|ButtonText|Field|FieldText|GrayText|Highlight|LinkText)\b/ },
  { name: 'primitive token', pattern: /--(paper|ink|breadcrumb|vermilion|glass)-/ },
  { name: 'literal font family', pattern: /font-family:(?!\s*var\(--font-(mono|display)\))/ },
  { name: 'radius above 2px', pattern: /border-radius:(?!\s*(0\b|var\(--radius-overlay\)|50%))/ }
]

// Comments may name a value without using it.
const strip_comments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')

export const find_style_violations = (css: string): string[] => {
  const violations: string[] = []
  strip_comments(css).split('\n').forEach((line, index) => {
    for (const { name, pattern } of FORBIDDEN) {
      if (pattern.test(line)) violations.push(`${index + 1}: ${name}: ${line.trim()}`)
    }
  })
  return violations
}

describe('module CSS reads role tokens only', () => {
  test('flags each forbidden form', () => {
    expect(find_style_violations('a { color: #ff492f; }')).toHaveLength(1)
    expect(find_style_violations('a { color: rgb(0 0 0); }')).toHaveLength(1)
    expect(find_style_violations('a { background: Canvas; }')).toHaveLength(1)
    expect(find_style_violations('a { color: var(--vermilion-500); }')).toHaveLength(1)
    expect(find_style_violations('a { font-family: monospace; }')).toHaveLength(1)
    expect(find_style_violations('a { border-radius: 6px; }')).toHaveLength(1)
    expect(find_style_violations('a { color: var(--color-accent); font-family: var(--font-mono); border-radius: 0; }')).toEqual([])
    expect(find_style_violations('/* #fff */ a { color: var(--color-text); }')).toEqual([])
  })

  test('no .module.css file under src/renderer breaks the rule', async () => {
    const found: string[] = []
    for await (const path of new Glob('src/renderer/**/*.module.css').scan('.')) {
      for (const violation of find_style_violations(await readFile(path, 'utf8'))) found.push(`${path}:${violation}`)
    }
    expect(found).toEqual([])
  })
})

// CSS Modules rename every animation a module names, so a module that names
// a keyframe from styles/keyframes.css bare animates nothing: the spinner
// stood still. A shared keyframe is named `global(spin)`.
export const find_bare_shared_animations = (css: string, shared: readonly string[]): string[] => {
  const local = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]))
  const bare: string[] = []
  strip_comments(css).split('\n').forEach((line, index) => {
    const value = /\banimation(?:-name)?\s*:([^;]*)/.exec(line)?.[1]
    if (value === undefined) return
    for (const name of shared) {
      if (!local.has(name) && new RegExp(`(^|[\\s,])${name}(?![\\w-])`).test(value)) bare.push(`${index + 1}: ${name}: ${line.trim()}`)
    }
  })
  return bare
}

describe('module CSS names shared keyframes as global', () => {
  test('flags a bare shared keyframe and passes global() or a local one', () => {
    expect(find_bare_shared_animations('a { animation: spin 1s linear infinite; }', ['spin'])).toHaveLength(1)
    expect(find_bare_shared_animations('a { animation-name: spin; }', ['spin'])).toHaveLength(1)
    expect(find_bare_shared_animations('a { animation: global(spin) 1s linear infinite; }', ['spin'])).toEqual([])
    expect(find_bare_shared_animations('a { animation: spin 1s; } @keyframes spin { to { opacity: 0; } }', ['spin'])).toEqual([])
    expect(find_bare_shared_animations('a { animation: spin-fast 1s; }', ['spin'])).toEqual([])
  })

  test('no .module.css file under src/renderer names one bare', async () => {
    const shared = [...(await readFile('src/renderer/styles/keyframes.css', 'utf8')).matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1] ?? '')
    expect(shared.length).toBeGreaterThan(0)
    const found: string[] = []
    for await (const path of new Glob('src/renderer/**/*.module.css').scan('.')) {
      for (const bare of find_bare_shared_animations(await readFile(path, 'utf8'), shared)) found.push(`${path}:${bare}`)
    }
    expect(found).toEqual([])
  })
})
