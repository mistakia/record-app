// A page's help (legacy-v0's help banners), as a framed section shown until
// dismissed once.

import { useLocation } from 'react-router'

import styles from './help-banner.module.css'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { use_view_pref } from '#renderer/prefs/view-prefs.ts'
import { ROUTES } from '#renderer/routes.ts'

const HELP: Record<string, string> = {
  [ROUTES.tracks]: 'Every track in your libraries and the ones you link, in one list. j and k move, Enter plays, t tags, i opens the details, and ? lists every key.',
  [ROUTES.listens]: 'What you played, newest first. A play counts once a minute of it has played.',
  [ROUTES.libraries]: 'Link a library by its address to follow it; its tracks replicate to this node. Your own libraries hold what you import and tag.',
  [ROUTES.import]: 'Add files or folders, drop them here, or paste a URL. Each import goes to the library named as its target.',
  [ROUTES.identity]: 'Your identity signs everything you add, on every device. Back up its key: it is the only way to recover your libraries.'
}

const NONE: readonly string[] = []

export const HelpBanner = () => {
  const { pathname } = useLocation()
  const [dismissed, set_dismissed] = use_view_pref<readonly string[]>('help-dismissed', NONE)
  const text = HELP[pathname]
  if (text === undefined || dismissed.includes(pathname)) return null
  return (
    <div className={styles.banner}>
      <FramedSection
        title='help'
        width='full'
        testid='help-banner'
        controls={<button type='button' aria-label='Dismiss help' onClick={() => { set_dismissed([...dismissed, pathname]) }}>[x]</button>}
      >
        <p className={styles.text}>{text}</p>
      </FramedSection>
    </div>
  )
}
