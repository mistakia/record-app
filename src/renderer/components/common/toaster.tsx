// Toasts (STYLE.md § Dialogs, context menu, toasts): bottom-centre of the
// page column, above the player bar, framed with the title on the stroke,
// an optional action, and a 1px rule depleting along the bottom edge for
// the toast's lifetime. An error says what failed in words.

import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import styles from './toaster.module.css'
import { tip } from './tooltip-logic.ts'
import { node_api } from '#renderer/store/api.ts'
import type { AppDispatch } from '#renderer/store/index.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { dismissed, type Notification, type ToastAction } from '#renderer/store/notifications.ts'

const DISMISS_AFTER_MS = 6_000

// Runs a toast's action; separate from the component so a test can drive it.
export const run_toast_action = ({ action, dispatch, navigate }: { action: ToastAction, dispatch: AppDispatch, navigate: (route: string) => void }): void => {
  if (action.invalidate !== undefined) dispatch(node_api.util.invalidateTags(action.invalidate))
  if (action.route !== undefined) navigate(action.route)
}

const Toast = ({ notification }: { notification: Notification }) => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  useEffect(() => {
    const timer = setTimeout(() => { dispatch(dismissed(notification.id)) }, DISMISS_AFTER_MS)
    return () => { clearTimeout(timer) }
  }, [dispatch, notification.id])
  const { action } = notification
  const title = notification.title ?? (notification.kind === 'error' ? 'Error' : 'Done')
  return (
    <div className={notification.kind === 'error' ? `${styles.toast} ${styles.error}` : styles.toast} role={notification.kind === 'error' ? 'alert' : 'status'} data-testid='toast'>
      <header className={styles.stroke}>
        <span className={styles.title}>{notification.kind === 'error' ? `!! ${title}` : title}</span>
        <button type='button' className={styles.close} aria-label='Dismiss' {...tip('Dismiss')} onClick={() => { dispatch(dismissed(notification.id)) }}>[x]</button>
      </header>
      <span className={styles.message}>{notification.message}</span>
      {action !== undefined && (
        <button
          type='button'
          data-size='small'
          onClick={() => {
            run_toast_action({ action, dispatch, navigate: (route) => { navigate(route) } })
            dispatch(dismissed(notification.id))
          }}
        >
          {action.label}
        </button>
      )}
      <span className={styles.rule} style={{ animationDuration: `${DISMISS_AFTER_MS}ms` }} aria-hidden='true' />
    </div>
  )
}

export const Toaster = () => {
  const items = use_app_selector((state) => state.notifications.items)
  return (
    <div className={styles.toaster}>
      {items.map((notification) => <Toast key={notification.id} notification={notification} />)}
    </div>
  )
}
