import React from 'react'

import './page.styl'

export const PageLayout = ({ head, body }) => (
  <section className='page'>
    <div className='page__head'>
      <div className='page__container'>
        { head }
      </div>
    </div>
    <div className='page__container'>
      { body }
    </div>
  </section>
)

export default PageLayout
