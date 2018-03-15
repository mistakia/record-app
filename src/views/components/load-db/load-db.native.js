import React from 'react'
import { View, TextInput } from 'react-native'
import { connect } from 'react-redux'

import { dbActions } from '@core/db'

class LoadDB extends React.Component {
  constructor(props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(event) {
    const value = event.nativeEvent.text.trim()
    console.log(value)
    this.props.load(value)
    //TODO
  }

  render = () => (
    <View>
      <TextInput
	  style={{height: 40, borderColor: 'gray', borderWidth: 1}}
	  autoCorrect={false}
	  placeholder='/orbitdb/xxxx/'
	  onSubmitEditing={this.handleSubmit}
      />
    </View>
  )
}

const mapDispatchToProps = {
  load: dbActions.load
}

export default connect(
  null,
  mapDispatchToProps
)(LoadDB)
