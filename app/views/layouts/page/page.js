import React from 'react'

import IconButton from '@components/icon-button'
import './page.styl'

export const PageLayout = ({ help, head, body, title, playerOpen, scroll, onHelpClose }) => (
  <section className={'page' + (playerOpen ? ' player-open' : '')}>
    { help &&
      <div className='page__help'>
        <div className='page__help-body'>
          {help}
        </div>
        <IconButton
          className='page__help-close'
          onClick={onHelpClose}
          icon='remove'
          label='close'
        />
      </div>
    }
    <div className='page__head'>
      <div className='page__container'>
        <div className='page__nav-info'>
          { title ? <div className='page__title'>{title}</div> : head }
        </div>
      </div>
    </div>
    <div className={'page__body' + (scroll ? ' scroll' : '')}>
      { body }
    </div>
  </section>
)

export default PageLayout
