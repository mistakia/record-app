import React from 'react'

import './loading-indicator.styl'

const LoadingIndicator = ({ className }) => (
  <div className={className}>
    <div className='md-loading-indicator indeterminate'>
      <div className='md-spinner-wrapper'>
        <div className='md-inner'>
          <div className='md-gap' />
          <div className='md-left'>
            <div className='md-half-circle' />
          </div>
          <div className='md-right'>
            <div className='md-half-circle' />
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default LoadingIndicator
