import React from 'react'
import { TextInput, StyleSheet, View } from 'react-native'

import TagsBase from './tags-base'

class Tags extends TagsBase {
  constructor (props) {
    super(props)

    this.onChangeText = this.onChangeText.bind(this)
    this.onKeyPress = this.onKeyPress.bind(this)
  }

  onChangeText (text) {
    this.setState({ tag: text.toLowerCase() })
  }

  onKeyPress (event) {
    const { key } = event.nativeEvent
    if (!this.state.tag && key === 'Backspace' && this.props.track.tags.length) {
      console.log('TODO: remove previous tag')
    }
  }

  render () {
    return (
      <View>
        <View style={styles.tagsContainer}>
          {this.getCurrentTagItems()}
          <TextInput
            style={styles.input}
            placeholder='+Tag'
            value={this.state.tag}
            spellCheck={false}
            keyboardType='default'
            returnKeyLabel='done'
            onChangeText={this.onChangeText}
            onSubmitEditing={this.add.bind(this, this.state.tag)}
            onKeyPress={this.onKeyPress}
          />
        </View>
        <View style={styles.tagsContainer}>{this.getSuggestedTagItems()}</View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  tagsContainer: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row'
  },
  input: {
    flex: 1
  }
})

export default Tags
