import React from 'react'
import { Link } from 'react-router-dom'

import Taglist from '@components/taglist'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'

export default function () {
  const head = (
    <Profile />
  )

  const body = (
    <div>
      <Taglist />
      <Tracklist />
    </div>
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
