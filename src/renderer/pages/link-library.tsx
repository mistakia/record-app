// Linking a library (spec §8.6.5), one question at a time: its address,
// echoed in its readable form as it is typed, then an optional alias. A
// link lands on the library's tracks, which arrive as it replicates.

import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { Library } from '#renderer/api/types.ts'
import { StepForm } from '#renderer/components/common/step-form.tsx'
import { parse_library_address, short_address } from '#renderer/components/library/library-category.ts'
import { tracks_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { library_linked } from '#renderer/store/replication.ts'
import { report_write } from '#renderer/store/write.ts'

export const LinkLibrary = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [step, set_step] = useState<1 | 2>(1)
  const [address, set_address] = useState('')
  const [alias, set_alias] = useState('')
  const [linking, set_linking] = useState(false)
  const library_address = address.trim()
  const parsed = parse_library_address(library_address)

  const link = async (chosen_alias: string) => {
    set_linking(true)
    const linked = await report_write<Library>({
      dispatch,
      write: dispatch(node_api.endpoints.link_library.initiate({ library_address, alias: chosen_alias.trim() === '' ? null : chosen_alias.trim() })),
      success: 'Linked. Its tracks arrive as it replicates.'
    })
    set_linking(false)
    if (linked === null) return
    dispatch(library_linked(linked.address))
    navigate(tracks_route({ library_address: linked.address }), { replace: true })
  }

  if (step === 1) {
    return (
      <StepForm
        step={1}
        steps={2}
        question='Paste the library’s address'
        hint={parsed === null ? 'It looks like /record/zBwWX…/mixes. Ask its owner to copy it from their library’s header.' : `Found ${short_address(library_address)}.`}
        error={library_address !== '' && parsed === null ? 'That is not a library address.' : null}
        next_label='Continue'
        next_disabled={parsed === null}
        on_next={() => { set_step(2) }}
        on_back={() => { navigate(-1) }}
      >
        <input autoFocus aria-label='Library address' placeholder='/record/…' spellCheck={false} value={address} onChange={(event) => { set_address(event.target.value) }} />
      </StepForm>
    )
  }
  return (
    <StepForm
      step={2}
      steps={2}
      question='What do you call it?'
      hint={`Only you see this name. Leave it empty to use the name ${short_address(library_address)} gives itself.`}
      next_label={linking ? 'Linking' : 'Link library'}
      next_disabled={!writes_allowed || linking}
      on_next={() => { link(alias).catch(() => { set_linking(false) }) }}
      on_back={() => { set_step(1) }}
    >
      <input autoFocus aria-label='Alias' placeholder='Optional' maxLength={128} value={alias} onChange={(event) => { set_alias(event.target.value) }} />
    </StepForm>
  )
}
