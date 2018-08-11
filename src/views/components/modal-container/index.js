import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import TrackModal from '@components/track-modal'
import { modalTypes, getModalType } from '@core/modal'

const { TRACK_MODAL } = modalTypes

const MODAL_COMPONENTS = {
  TRACK_MODAL: TrackModal
}

const ModalContainer = (props) => {
  if (!props.type) {
    return null
  }

  const SpecificModal = MODAL_COMPONENTS[props.type]

  return <SpecificModal />
}

const mapStateToProps = createSelector(
  getModalType,
  (type) => (type)
)

export default connect(mapStateToProps)(ModalContainer)
