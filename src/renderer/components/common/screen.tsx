// A phosphor screen (STYLE.md § Screen scope, § Screen effects): the .screen
// scope re-maps the role tokens to phosphor, and the aria-hidden glass child
// draws the scanlines and vignette under the content. The flicker stops
// while the window is hidden, so an idle app costs nothing.

import { forwardRef, useSyncExternalStore, type HTMLAttributes, type ReactNode } from 'react'

const subscribe_visibility = (listener: () => void): (() => void) => {
  document.addEventListener('visibilitychange', listener)
  return () => { document.removeEventListener('visibilitychange', listener) }
}

export const use_document_hidden = (): boolean =>
  useSyncExternalStore(subscribe_visibility, () => document.visibilityState === 'hidden', () => false)

export const Screen = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { children: ReactNode, as?: 'div' | 'section' | 'footer' }>(
  ({ children, className, as = 'div', ...rest }, ref) => {
    const hidden = use_document_hidden()
    const Element = as
    return (
      <Element ref={ref} {...rest} className={className === undefined ? 'screen' : `screen ${className}`} data-paused={hidden ? '' : undefined}>
        <div className='screen__glass' aria-hidden='true' data-testid='screen-glass' />
        {children}
      </Element>
    )
  }
)
Screen.displayName = 'Screen'
