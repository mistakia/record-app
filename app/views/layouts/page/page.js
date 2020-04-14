import React from 'react'

import './page.styl'

export const PageLayout = ({ head, body, title, playerOpen, scroll }) => (
  <section className={'page' + (playerOpen ? ' player-open' : '')}>
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
