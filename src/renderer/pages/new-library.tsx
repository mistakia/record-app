// Creating an own library (spec §8.6.1, §8.9.1, §4.8.3): one question, its
// name. The node picks the address, whose discriminator is not a name and
// is never asked for (§3.6.1). A new library lands on its About tab.

import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { Library } from '#renderer/api/types.ts'
import { StepForm } from '#renderer/components/common/step-form.tsx'
import { library_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

export const NewLibrary = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [name, set_name] = useState('')
  const [creating, set_creating] = useState(false)

  const create = async () => {
    set_creating(true)
    const created = await report_write<Library>({ dispatch, write: dispatch(node_api.endpoints.create_own_library.initiate({ name: name.trim() })), success: 'Library created.' })
    set_creating(false)
    if (!created.ok) return
    navigate(library_route({ tab: 'about', library_address: created.data.address }), { replace: true })
  }

  return (
    <StepForm
      step={1}
      steps={1}
      question='Name your library'
      hint='Peers who link it see this name. You can change it later.'
      next_label={creating ? 'Creating' : 'Create library'}
      next_disabled={!writes_allowed || creating || name.trim() === ''}
      on_next={() => { create().catch(() => { set_creating(false) }) }}
      on_back={() => { navigate(-1) }}
    >
      <input autoFocus aria-label='Library name' maxLength={128} value={name} onChange={(event) => { set_name(event.target.value) }} />
    </StepForm>
  )
}
