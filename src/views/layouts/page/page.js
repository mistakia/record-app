import React from 'react'

import IconButton from '@components/icon-button'
import history from '@core/history'

import './page.styl'

export const PageLayout = ({ head, body, title }) => (
  <section className='page'>
    <div className='page__head'>
      <div className='page__container'>
        <IconButton
          icon='arrow-back'
          label='go back'
          onClick={history.goBack}
          disabled={history.length < 2}
        />
        { title ? <h1>{title}</h1> : head }
      </div>
    </div>
    <div className='page__container'>
      { body }
    </div>
  </section>
)

export default PageLayout
