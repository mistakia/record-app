import React from 'react'

class Track extends React.Component {
  render () {
    const { track } = this.props

    return (
      <article>
        <h1>{track.title}</h1>
        <p>{track.url}</p>
      </article>
    )
  }
}

export default Track
