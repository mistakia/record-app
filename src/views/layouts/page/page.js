import React from 'react'

import IconButton from '@components/icon-button'
import history from '@core/history'

import './page.styl'

export const PageLayout = ({ head, body, title, playerOpen, scroll }) => (
  <section className={'page' + (playerOpen ? ' player-open' : '')}>
    <div className='page__head'>
      <div className='page__container'>
        <IconButton
          icon='arrow-back'
          label='go back'
          onClick={history.goBack}
          disabled={history.length < 2}
        />
        { title ? <div className='page__title'>{title}</div> : head }
      </div>
    </div>
    <div className={'page__body' + (scroll ? ' scroll' : '')}>
      { body }
    </div>
  </section>
)

export default PageLayout
