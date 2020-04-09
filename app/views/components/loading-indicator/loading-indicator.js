import React from 'react'

import './loading-indicator.styl'

const LoadingIndicator = ({ className }) => (
  <div className='loading-indicator indeterminate'>
    <div className='spinner-wrapper'>
      <div className='inner'>
        <div className='gap' />
        <div className='left'>
          <div className='half-circle' />
        </div>
        <div className='right'>
          <div className='half-circle' />
        </div>
      </div>
    </div>
  </div>
)

export default LoadingIndicator
