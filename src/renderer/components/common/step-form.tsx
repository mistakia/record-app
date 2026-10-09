// One step of a guided flow (STYLE.md § Step flows): a kicker with the step
// count, one question in the display face, one input, one line of hint or
// echo, and back and continue. Enter continues; Esc goes back.

import type { ReactNode } from 'react'

import styles from './step-form.module.css'

export const StepForm = ({ step, steps, question, children, hint, error, next_label, next_disabled, on_next, on_back, skip }: {
  step: number
  steps: number
  question: string
  // The one input; it should take autoFocus.
  children: ReactNode
  hint?: ReactNode
  error?: string | null | undefined
  next_label: string
  next_disabled: boolean
  on_next: () => void
  on_back: () => void
  // An optional step offers to continue without an answer.
  skip?: (() => void) | undefined
}) => (
  <form
    className={styles.flow}
    data-testid='step-form'
    data-step={step}
    onSubmit={(event) => { event.preventDefault(); if (!next_disabled) on_next() }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); on_back() } }}
  >
    <p className={styles.kicker}>Step {step} of {steps}</p>
    <h2 className={styles.question}>{question}</h2>
    <div className={styles.input}>{children}</div>
    {error !== null && error !== undefined
      ? <p className={styles.error} role='alert'>!! {error}</p>
      : <p className={styles.hint}>{hint ?? ' '}</p>}
    <div className={styles.actions}>
      <button type='button' data-variant='ghost' onClick={on_back}>{step === 1 ? 'Cancel' : 'Back'}</button>
      <span className={styles.spacer} />
      {skip !== undefined && <button type='button' data-variant='ghost' onClick={skip}>Skip</button>}
      <button type='submit' data-variant='primary' disabled={next_disabled}>{next_label}</button>
    </div>
  </form>
)
