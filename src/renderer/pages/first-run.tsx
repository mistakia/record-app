// The bundled first run (spec §8.9.1, STYLE.md § Step flows): one question,
// the person's name, written to the identity's profile (§4.8.2), never to a
// library. Skip leaves the profile unnamed, going by the handle from the key.

import { useState } from 'react'

import { StepForm } from '#renderer/components/common/step-form.tsx'
import { first_run_key, should_ask_name } from '#renderer/identity/first-run.ts'
import { key_handle } from '#renderer/identity/default-name.ts'
import { use_view_pref, write_view_pref } from '#renderer/prefs/view-prefs.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

// Whether to show the first run instead of the page.
export const use_first_run = (): boolean => {
  const config = use_app_selector((state) => state.connection.config)
  const running = use_app_selector((state) => state.bundled.state?.status === 'running')
  const node_key = config?.node_key ?? null
  const bundled = config?.mode === 'bundled' && running
  const profile = node_api.endpoints.get_profile.useQuery(undefined, { skip: !bundled }).data
  const [done] = use_view_pref(first_run_key(node_key ?? ''), false)
  return should_ask_name({ mode: config?.mode, running, node_key, profile, done })
}

export const FirstRun = () => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const node_key = use_app_selector((state) => state.connection.config?.node_key ?? '')
  const public_key = node_api.endpoints.get_public_key.useQuery().data
  const [name, set_name] = useState('')
  const [saving, set_saving] = useState(false)
  const handle = public_key === undefined ? null : key_handle(public_key)
  const finish = () => { write_view_pref(first_run_key(node_key), true) }

  const save = async () => {
    set_saving(true)
    const saved = await report_write({ dispatch, write: dispatch(node_api.endpoints.update_profile.initiate({ name: name.trim() })), success: null })
    set_saving(false)
    if (saved.ok) finish()
  }

  return (
    <div data-testid='first-run'>
      <StepForm
        step={1}
        steps={1}
        question='What should people call you?'
        hint={`Peers who see your libraries see this name. You can change it on Identity.${handle === null ? '' : ` Skip, and you go by ${handle}.`}`}
        next_label={saving ? 'Saving' : 'Continue'}
        next_disabled={!writes_allowed || saving || name.trim() === ''}
        on_next={() => { save().catch(() => { set_saving(false) }) }}
        skip={finish}
      >
        <input autoFocus aria-label='Your name' maxLength={128} value={name} onChange={(event) => { set_name(event.target.value) }} />
      </StepForm>
    </div>
  )
}
