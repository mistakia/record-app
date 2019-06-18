import React from 'react'

import PageLayout from '@layouts/page'

export default class EditAboutPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentWillMount () {
    const { app } = this.props
    this.props.loadContact(app.address)
  }

  handleSubmit (event) {
    const data = {
      name: event.target.name.value,
      location: event.target.location.value,
      bio: event.target.bio.value
    }

    if (data.name && data.location && data.bio) {
      this.props.setAbout(data)
    }

    event.preventDefault()
  }

  render () {
    const head = (
      <h1>Edit Profile</h1>
    )

    const { contact } = this.props

    const body = (
      <form onSubmit={this.handleSubmit}>
        <label>
          Name
          <input
            type='text'
            name='name'
            defaultValue={contact.name}
            placeholder='Name' />
        </label>
        <label>
          Location
          <input
            type='text'
            name='location'
            defaultValue={contact.location}
            placeholder='Location' />
        </label>
        <label>
          Bio
          <textarea
            name='bio'
            defaultValue={contact.bio}
            placeholder='Bio' />
        </label>
        <input className='button' type='submit' value='Submit' />
      </form>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}
