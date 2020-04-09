import React from 'react'

import Feedlist from '@components/feedlist'
import PageLayout from '@layouts/page'

export default function () {
  const body = (
    <Feedlist />
  )

  return (
    <PageLayout title='Feed' body={body} />
  )
}
