import React from 'react'

import { copyToClipboard } from '@core/utils'
import './copy-text.styl'

export class CopyText extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      copied: false
    }

    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this)
  }

  handleCopyToClipboard () {
    const { text } = this.props

    copyToClipboard(text)
    this.setState({ copied: true })
    setTimeout(() => {
      this.setState({ copied: false })
    }, 1500)
  }

  render () {
    const { disabled } = this.props

    if (disabled) {
      return (
        <div className='copyTextContainer'>
          {this.props.children}
        </div>
      )
    }

    return (
      <div className='copyTextContainer cursor' onClick={this.handleCopyToClipboard}>
        {(this.state.copied
          ? <div className='copyTextOverlay' style={{ opacity: 1 }}>Copied</div>
          : <div className='copyTextOverlay'>Click to Copy</div>)}
        {this.props.children}
      </div>
    )
  }
}

export default CopyText
