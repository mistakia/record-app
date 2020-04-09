import React from 'react'

import './copy-text.styl'

const copyToClipboard = str => {
  // https://gist.github.com/Chalarangelo/4ff1e8c0ec03d9294628efbae49216db#file-copytoclipboard-js
  const el = document.createElement('textarea') // Create a <textarea> element
  el.value = str // Set its value to the string that you want copied
  el.setAttribute('readonly', '') // Make it readonly to be tamper-proof
  el.style.position = 'absolute'
  el.style.left = '-9999px' // Move outside the screen to make it invisible
  document.body.appendChild(el) // Append the <textarea> element to the HTML document
  const selected =
    document.getSelection().rangeCount > 0 // Check if there is any content selected previously
      ? document.getSelection().getRangeAt(0) // Store selection if found
      : false // Mark as false to know no selection existed before
  el.select() // Select the <textarea> content
  document.execCommand('copy') // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el) // Remove the <textarea> element
  if (selected) { // If a selection existed before copying
    document.getSelection().removeAllRanges() // Unselect everything on the HTML document
    document.getSelection().addRange(selected) // Restore the original selection
  }
}

export class CopyText extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      copied: false
    }

    this.copyToClipboard = this.copyToClipboard.bind(this)
  }

  copyToClipboard () {
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
      <div className='copyTextContainer cursor' onClick={this.copyToClipboard}>
        {(this.state.copied
          ? <div className='copyTextOverlay' style={{ opacity: 1 }}>Copied</div>
          : <div className='copyTextOverlay'>Click to Copy</div>)}
        {this.props.children}
      </div>
    )
  }
}

export default CopyText
