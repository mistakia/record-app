import React from 'react'

export class UrlContextMenu extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      url: ''
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }

  componentDidMount () {
    this.input.focus()
  }

  handleChange (event) {
    this.setState({ url: event.target.value.toLowerCase() })
  }

  handleKeyPress (event) {
    if (!this.state.url) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      this.props.addTrack(this.address, { url: this.state.url })
      this.props.hide()
    }
  }

  render () {
    return (
      <div>
        <div className='context-menu--input'>
          <input
            ref={(input) => { this.input = input }}
            type='text'
            className='input cursor'
            value={this.state.url}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyPress}
            placeholder='Paste URL'
          />
        </div>
      </div>
    )
  }
}

export default UrlContextMenu
