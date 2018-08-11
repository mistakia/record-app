import React from 'react'
import { connect } from 'react-redux'
import { StyleSheet, View } from 'react-native'

import IconButton from '@components/icon-button'
import { modalActions } from '@core/modal'

const Modal = function (props) {
  return (
    <View style={styles.modalContainer}>
      <IconButton
        style={styles.close}
        iconStyle={styles.closeIcon}
        onClick={props.hideModal}
        icon='ios-close'
      />
      <View style={styles.modalBody}>
        {props.children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
    paddingTop: 55,
  },
  modalBody: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  close: {
    position: 'absolute',
    borderWidth: 0,
    top: 10,
    right: 10
  },
  closeIcon: {
    color: '#666666',
    fontSize: 40,
    lineHeight: 40,
    textAlign: 'center'
  }
})

const mapDispatchToProps = {
  hideModal: modalActions.hideModal
}

export default connect(
  null,
  mapDispatchToProps
)(Modal)
