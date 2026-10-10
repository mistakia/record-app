// Letting another identity write to an own library (spec §8.6.4), one
// question at a time: who, what they may do, and for how long, with the
// filter behind `advanced` on the last step. Issuing lands back on Writers.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import styles from './issue-capability.module.css'
import type { Capability } from '#renderer/api/types.ts'
import { ShowStrip } from '#renderer/components/common/show-strip.tsx'
import { StepForm } from '#renderer/components/common/step-form.tsx'
import { FilterEditor } from '#renderer/components/filter/filter-editor.tsx'
import { CAPABILITY_FIELDS, filter_problems } from '#renderer/filter/filter-spec.ts'
import { describe_action, ISSUABLE_ACTIONS, parse_grantee_keys, short_key } from '#renderer/library/capabilities.ts'
import { use_managed_library } from '#renderer/pages/library-manage.tsx'
import { library_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

const DAY_MS = 86_400_000

const DURATIONS = [
  { id: 'revoked', label: 'Until I revoke it', ms: null },
  { id: 'day', label: 'One day', ms: DAY_MS },
  { id: 'week', label: 'One week', ms: 7 * DAY_MS },
  { id: 'month', label: 'Thirty days', ms: 30 * DAY_MS },
  { id: 'date', label: 'Until a date', ms: null }
] as const

type Duration = typeof DURATIONS[number]['id']

// "add tracks and add tags", for the echo under a step.
const sentence = (labels: readonly string[]): string =>
  labels.length < 2 ? labels.join('') : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1) ?? ''}`

export const IssueCapability = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const { library, loading } = use_managed_library()
  const [step, set_step] = useState<1 | 2 | 3>(1)
  const [keys, set_keys] = useState('')
  const [actions, set_actions] = useState<string[]>(['library.append_track'])
  const [duration, set_duration] = useState<Duration>('revoked')
  const [date, set_date] = useState('')
  const [filter, set_filter] = useState<unknown>(null)
  const [issuing, set_issuing] = useState(false)
  if (loading) return null
  if (library === undefined || library.is_retired) return <Navigate to={library_route({ tab: 'tracks', library_address: library?.address ?? '' })} replace />
  const writers = library_route({ tab: 'writers', library_address: library.address })

  const grantee = parse_grantee_keys(keys)
  const chosen = DURATIONS.find(({ id }) => id === duration)
  const expires_at = duration === 'date' ? (date === '' ? Number.NaN : new Date(date).getTime()) : chosen?.ms == null ? null : Date.now() + chosen.ms
  const expiry_ok = expires_at === null || (Number.isFinite(expires_at) && expires_at > Date.now())
  const filter_ok = filter === null || (filter !== undefined && filter_problems(filter).length === 0)

  const issue = async () => {
    if (!grantee.ok || !expiry_ok || !filter_ok) return
    set_issuing(true)
    const issued = await report_write<Capability>({
      dispatch,
      write: dispatch(node_api.endpoints.issue_capability.initiate({
        address: library.address,
        grantee: grantee.grantee,
        actions,
        ...(filter === null ? {} : { filter }),
        ...(expires_at === null ? {} : { conditions: [{ type: 'expires_at', at: expires_at }] })
      })),
      success: 'Capability issued.'
    })
    set_issuing(false)
    if (issued.ok) navigate(writers, { replace: true })
  }

  if (step === 1) {
    const count = grantee.ok ? (grantee.grantee.type === 'key' ? 1 : grantee.grantee.keys.length) : 0
    const first = grantee.ok ? (grantee.grantee.type === 'key' ? grantee.grantee.key : grantee.grantee.keys[0] ?? '') : ''
    return (
      <StepForm
        step={1}
        steps={3}
        question='Who may write?'
        hint={grantee.ok
          ? count === 1 ? `One identity: ${short_key(first)}.` : `${count} identities, starting ${short_key(first)}.`
          : 'Their public key, from their Identity page. Separate several with spaces.'}
        error={keys.trim() !== '' && !grantee.ok ? grantee.reason : null}
        next_label='Continue'
        next_disabled={!grantee.ok}
        on_next={() => { set_step(2) }}
        on_back={() => { navigate(writers) }}
      >
        <input autoFocus aria-label='Grantee public keys' placeholder='02… or 03…' spellCheck={false} value={keys} onChange={(event) => { set_keys(event.target.value) }} />
      </StepForm>
    )
  }

  if (step === 2) {
    return (
      <StepForm
        step={2}
        steps={3}
        question='What may they do?'
        hint={actions.length === 0 ? 'Choose at least one.' : `They may ${sentence(actions.map((verb) => describe_action(verb).toLowerCase()))}.`}
        next_label='Continue'
        next_disabled={actions.length === 0}
        on_next={() => { set_step(3) }}
        on_back={() => { set_step(1) }}
      >
        <fieldset className={styles.choices} aria-label='Actions'>
          {ISSUABLE_ACTIONS.map(({ verb, label }, index) => (
            <label key={verb} className={styles.choice}>
              <input
                type='checkbox'
                autoFocus={index === 0}
                checked={actions.includes(verb)}
                onChange={(event) => { set_actions(event.target.checked ? [...actions, verb] : actions.filter((each) => each !== verb)) }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </StepForm>
    )
  }

  return (
    <StepForm
      step={3}
      steps={3}
      question='For how long?'
      hint={expires_at === null ? 'Until you revoke it on Writers.' : expiry_ok ? `Until ${new Date(expires_at).toLocaleString()}.` : 'Choose the date and time it ends.'}
      error={duration === 'date' && date !== '' && !expiry_ok ? 'The date must be in the future.' : null}
      next_label={issuing ? 'Issuing' : 'Issue'}
      next_disabled={!writes_allowed || issuing || !expiry_ok || !filter_ok}
      on_next={() => { issue().catch(() => { set_issuing(false) }) }}
      on_back={() => { set_step(2) }}
    >
      <fieldset className={styles.choices} aria-label='Duration'>
        {DURATIONS.map(({ id, label }) => (
          <label key={id} className={styles.choice}>
            <input type='radio' name='duration' autoFocus={id === duration} checked={id === duration} onChange={() => { set_duration(id) }} />
            {label}
          </label>
        ))}
        {duration === 'date' && <input className={styles.date} aria-label='Expires' type='datetime-local' value={date} onChange={(event) => { set_date(event.target.value) }} />}
      </fieldset>
      <ShowStrip label='advanced' testid='issue-advanced'>
        <FilterEditor label='Only writes matching' value={filter} on_change={set_filter} fields={CAPABILITY_FIELDS} />
      </ShowStrip>
    </StepForm>
  )
}
