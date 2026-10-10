// A management page with a section index (STYLE.md § Section index): a
// sticky list of its framed sections at the left that scrolls to one,
// unfolding it, marks the one in view, and answers [ and ]. `?section=`
// names the one to open on, and a click keeps it current, so a reload or
// back returns there.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import styles from './indexed-page.module.css'
import { write_view_pref } from '#renderer/prefs/view-prefs.ts'

export interface IndexedSection {
  id: string
  title: string
  // The section's FramedSection fold_id, so going to it unfolds it.
  fold_id?: string | undefined
  node: ReactNode
}

export interface SectionIndexCommands {
  step: (by: 1 | -1) => void
}

let active: SectionIndexCommands | null = null

export const section_index_commands = (): SectionIndexCommands | null => active

// A section counts as in view once its top is this far down the page.
const IN_VIEW_OFFSET = 96
// The scroll a click on the index causes keeps the clicked section marked,
// even one too short to reach the top at the end of the page.
const CLICK_SETTLE_MS = 250

export const IndexedPage = ({ prefix, sections, testid }: { prefix: string, sections: IndexedSection[], testid?: string | undefined }) => {
  const [search, set_search] = useSearchParams()
  const requested = search.get('section')
  const [current, set_current] = useState<string | null>(sections[0]?.id ?? null)
  const root = useRef<HTMLDivElement>(null)
  const scrolled_by_index_at = useRef(0)
  const element_id = useCallback((id: string) => `${prefix}-${id}`, [prefix])

  const scroll_to = useCallback((id: string) => {
    const section = sections.find((candidate) => candidate.id === id)
    if (section === undefined) return
    if (section.fold_id !== undefined) write_view_pref(`fold:${section.fold_id}`, true)
    set_current(id)
    scrolled_by_index_at.current = performance.now()
    // After the unfold renders.
    requestAnimationFrame(() => { document.getElementById(element_id(id))?.scrollIntoView({ block: 'start' }) })
  }, [sections, element_id])

  const go = useCallback((id: string) => {
    if (requested === id) scroll_to(id)
    else set_search((params) => { params.set('section', id); return params }, { replace: true })
  }, [requested, scroll_to, set_search])

  // On the section the route names, once per change of it: the sections are
  // a new array each render, so the latest scroll_to is read from a ref.
  const scroll_to_ref = useRef(scroll_to)
  scroll_to_ref.current = scroll_to
  useEffect(() => { if (requested !== null) scroll_to_ref.current(requested) }, [requested])

  // The section in view: the last whose top has passed the offset, or the
  // last one once the page is scrolled to its end.
  useEffect(() => {
    const spy = () => {
      const page = root.current
      if (page === null || performance.now() - scrolled_by_index_at.current < CLICK_SETTLE_MS) return
      const top = page.getBoundingClientRect().top
      let seen = sections[0]?.id ?? null
      for (const { id } of sections) {
        const rect = document.getElementById(element_id(id))?.getBoundingClientRect()
        if (rect !== undefined && rect.top - top <= IN_VIEW_OFFSET) seen = id
      }
      // The page column's <main> is what scrolls.
      const scroller = page.closest('main')
      if (scroller !== null && scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) seen = sections.at(-1)?.id ?? seen
      set_current(seen)
    }
    document.addEventListener('scroll', spy, { capture: true, passive: true })
    return () => { document.removeEventListener('scroll', spy, { capture: true }) }
  }, [sections, element_id])

  useEffect(() => {
    const commands: SectionIndexCommands = {
      step: (by) => {
        const index = sections.findIndex(({ id }) => id === current)
        const next = sections[Math.min(Math.max(index + by, 0), sections.length - 1)]
        if (next !== undefined) go(next.id)
      }
    }
    active = commands
    return () => { if (active === commands) active = null }
  }, [sections, current, go])

  return (
    <div className={styles.page} ref={root} data-testid={testid}>
      <nav className={styles.index} aria-label='Sections' data-testid='section-index'>
        {sections.map(({ id, title }) => (
          <a
            key={id}
            href={`#${element_id(id)}`}
            className={styles.entry}
            aria-current={current === id ? 'location' : undefined}
            onClick={(event) => { event.preventDefault(); go(id) }}
          >
            {title}
          </a>
        ))}
      </nav>
      <div className={styles.sections}>
        {sections.map(({ id, node }) => <div key={id} id={element_id(id)} className={styles.section}>{node}</div>)}
      </div>
    </div>
  )
}
