import React from 'react'

import './page.styl'

export const PageLayout = ({ head, body }) => (
  <section className='page__container'>
    <div className='page__head'>
      { head }
    </div>
    <div>
      { body }
    </div>
  </section>
)

export default PageLayout
