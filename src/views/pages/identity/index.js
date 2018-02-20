import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getCurrentIdentity, Identity, identityActions } from '@core/identities'


export class IdentityPage extends React.Component {
  componentWillMount() {
    this.loadIdentity()
  }

  loadIdentity(params) {
    this.props.loadIdentity(params.id)
  }

  render() {
    const { identity } = this.props

    return (
      <section>
	<h1>Identity Page</h1>
      </section>
    )
  }
}

const mapStateToProps = createSelector(
  getCurrentIdentity,
  identity => ({identity})
)

const mapDispatchToProps = {
  loadIdentity: identityActions.loadIdentity
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(IdentityPage)
