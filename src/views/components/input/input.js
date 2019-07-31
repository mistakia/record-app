import React from 'react'

import IconButton from '@components/icon-button'

import './input.styl'

const input = ({
  onSubmit,
  showClear,
  onClear,
  label,
  className
}) => {
  let formInput = React.createRef()

  const handleSubmit = (event) => {
    const text = event.target.text.value
    if (text) {
      onSubmit(text)
    }

    event.preventDefault()
  }

  const handleClear = () => {
    formInput.current.reset()
    onClear()
  }

  const classNames = ['form-input', className]

  return (
    <form onSubmit={handleSubmit} ref={formInput} className={classNames.join(' ')}>
      <input type='text' name='text' placeholder={label} />
      { showClear &&
        <IconButton
          icon='remove'
          onClick={handleClear}
          label='Clear Search' /> }
    </form>
  )
}

export default input
