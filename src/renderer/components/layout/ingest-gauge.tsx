// The corner ingest gauge (STYLE.md § Layout › Page column): while an import
// runs and Import is not the page, a small screen in the page column's
// bottom-right corner shows the batch, and opens Import on click.

import { useLocation, useNavigate } from 'react-router'

import styles from './ingest-gauge.module.css'
import { char_gauge } from '#renderer/components/common/char-gauge.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
import { ROUTES } from '#renderer/routes.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const IngestGauge = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const running = use_app_selector((state) => state.imports.items.filter(({ finished }) => !finished))
  if (running.length === 0 || pathname === ROUTES.import) return null
  const total = running.reduce((sum, { file_count }) => sum + (file_count ?? 1), 0)
  const done = running.reduce((sum, { completed, errors }) => sum + completed + errors.length, 0)
  return (
    <Screen className={styles.gauge} data-testid='ingest-gauge'>
      <button type='button' data-variant='glyph' className={styles.button} onClick={() => { navigate(ROUTES.import) }} aria-label={`Importing ${done} of ${total}; open Import`}>
        {char_gauge(total === 0 ? 0 : done / total)} {done}/{total}
      </button>
    </Screen>
  )
}
