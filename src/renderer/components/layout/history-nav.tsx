// Back and forward (legacy-v0's ‹ ›) over the router's history. The router
// stamps each entry with its index: a push drops every entry ahead of it, and
// a pop moves within the entries already there.

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'

import styles from './sidebar.module.css'
import { tip } from '#renderer/components/common/tooltip-logic.ts'

const history_index = (): number => {
  const state = window.history.state as { idx?: unknown } | null
  return typeof state?.idx === 'number' ? state.idx : 0
}

export const HistoryNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const navigation_type = useNavigationType()
  const furthest = useRef(0)
  const [index, set_index] = useState(0)

  useEffect(() => {
    const current = history_index()
    if (navigation_type === 'PUSH') furthest.current = current
    else furthest.current = Math.max(furthest.current, current)
    set_index(current)
  }, [location.key, navigation_type])

  return (
    <div className={styles.history}>
      <button type='button' data-variant='glyph' aria-label='Back' {...tip('Back', 'back')} disabled={index === 0} onClick={() => { navigate(-1) }}>‹</button>
      <button type='button' data-variant='glyph' aria-label='Forward' {...tip('Forward', 'forward')} disabled={index >= furthest.current} onClick={() => { navigate(1) }}>›</button>
    </div>
  )
}
