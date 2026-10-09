// Creating an own library (spec §8.6.1, §4.8.3), one question at a time:
// its name, then the address name, suggested from the name. A new library
// lands on its Profile tab.

import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { Library } from '#renderer/api/types.ts'
import { StepForm } from '#renderer/components/common/step-form.tsx'
import { library_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

const DISCRIMINATOR = /^[0-9a-zA-Z-]{1,64}$/

// The name as an address name: lowercase letters, digits, and single hyphens.
export const suggest_discriminator = (name: string): string =>
  name.toLowerCase().normalize('NFKD').replace(/[^0-9a-z]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '')

export const NewLibrary = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [step, set_step] = useState<1 | 2>(1)
  const [name, set_name] = useState('')
  const [discriminator, set_discriminator] = useState('')
  const [creating, set_creating] = useState(false)
  const chosen = discriminator.trim()
  const valid = chosen === '' || DISCRIMINATOR.test(chosen)

  const create = async () => {
    set_creating(true)
    const created = await report_write<Library>({
      dispatch,
      write: dispatch(node_api.endpoints.create_own_library.initiate({
        ...(chosen === '' ? {} : { discriminator: chosen }),
        about: { name: name.trim() }
      })),
      success: 'Library created.'
    })
    set_creating(false)
    if (!created.ok) return
    navigate(library_route({ tab: 'profile', library_address: created.data.address }), { replace: true })
  }

  if (step === 1) {
    return (
      <StepForm
        step={1}
        steps={2}
        question='Name your library'
        hint='Peers who link it see this name. You can change it later.'
        next_label='Continue'
        next_disabled={name.trim() === ''}
        on_next={() => { set_discriminator(suggest_discriminator(name)); set_step(2) }}
        on_back={() => { navigate(-1) }}
      >
        <input autoFocus aria-label='Library name' maxLength={128} value={name} onChange={(event) => { set_name(event.target.value) }} />
      </StepForm>
    )
  }
  return (
    <StepForm
      step={2}
      steps={2}
      question='Choose its address name'
      hint='It ends the library’s address, as in /record/…/mixes, and can never change. Leave it empty and the node picks one.'
      error={valid ? null : 'Use 1 to 64 letters, digits, and hyphens.'}
      next_label={creating ? 'Creating' : 'Create library'}
      next_disabled={!writes_allowed || creating || !valid}
      on_next={() => { create().catch(() => { set_creating(false) }) }}
      on_back={() => { set_step(1) }}
    >
      <input autoFocus aria-label='Address name' spellCheck={false} maxLength={64} value={discriminator} onChange={(event) => { set_discriminator(event.target.value) }} />
    </StepForm>
  )
}
