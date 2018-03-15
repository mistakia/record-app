import React from 'react'

import { View, TextInput } from 'react-native'

class LoadDB extends React.Component {
  constructor(props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(value) {
    console.log(value)
    //TODO
  }

  render = () => (
    <View>
      <TextInput
	  style={{height: 40, borderColor: 'gray', borderWidth: 1}}
	  autoCorrect={false}
	  placeholder='/orbitdb/xxxx/'
	  onChangeText={this.handleSubmit}
      />
    </View>
  )
}

export default LoadDB
