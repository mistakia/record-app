import React from 'react'

import './page.styl'

export const PageLayout = ({ head, body}) => (
  <section className="page__container">
    <div>
      { head }
    </div>
    <div>
      { body }
    </div>
  </section>
)

export default PageLayout
