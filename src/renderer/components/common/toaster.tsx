import { useEffect } from 'react'

import styles from './toaster.module.css'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { dismissed, type Notification } from '#renderer/store/notifications.ts'

const DISMISS_AFTER_MS = 6_000

const Toast = ({ notification }: { notification: Notification }) => {
  const dispatch = use_app_dispatch()
  useEffect(() => {
    const timer = setTimeout(() => { dispatch(dismissed(notification.id)) }, DISMISS_AFTER_MS)
    return () => { clearTimeout(timer) }
  }, [dispatch, notification.id])
  return (
    <div className={notification.kind === 'error' ? `${styles.toast} ${styles.error}` : styles.toast} role={notification.kind === 'error' ? 'alert' : 'status'} data-testid='toast'>
      <span>{notification.message}</span>
      <button type='button' aria-label='Dismiss' onClick={() => { dispatch(dismissed(notification.id)) }}>Close</button>
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
