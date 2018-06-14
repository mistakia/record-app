import React from 'react'

import PageLayout from '@layouts/page'

export class LoadingPage extends React.Component {
  componentWillMount () {
    console.log('here')
  }

  render () {
    const head = (
      <h1>Loading</h1>
    )

    return (
      <PageLayout head={head} />
    )
  }
}

export default LoadingPage
