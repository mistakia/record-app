import React from 'react'
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native'

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
    Clipboard.setString(text)

    this.setState({ copied: true })
    setTimeout(() => {
      this.setState({ copied: false })
    }, 1500)
  }

  render () {
    const { style } = this.props

    return (
      <TouchableWithoutFeedback onPress={this.copyToClipboard}>
        <View style={style}>
          {(this.state.copied
            ? <View style={styles.overlay}>
              <Text style={styles.text}>Copied</Text>
            </View> : null)}
          {this.props.children}
        </View>
      </TouchableWithoutFeedback>
    )
  }
}

const styles = StyleSheet.create({
  text: {
    color: 'white',
    fontWeight: 'bold'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default CopyText
