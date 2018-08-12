import React from 'react'

import Feedlist from '@components/feedlist'
import PageLayout from '@layouts/page'

export default function () {
  const head = (
    <div>
      <h1>Feed</h1>
    </div>
  )

  const body = (
    <Feedlist />
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
