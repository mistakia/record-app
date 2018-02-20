import React from 'react'

export default class TrackCard extends React.Component {
  render() {
    const { track } = this.props
    return (
      <article>
	<h1>Track id: {track.id}</h1>
      </article>
    )
  }
}
