import React from 'react'

import './loading-indicator.styl'

const LoadingIndicator = ({ percent, size = 46 }) => {
  const classNames = ['loading-indicator']

  if (typeof percent === 'undefined') {
    classNames.push('indeterminate')

    return (
      <svg
        className={classNames.join(' ')}
        width='100%'
        height='100%'
      >
        <circle
          cx='50%'
          cy='50%'
          r='42%'
          fill='none'
          strokeWidth='6%' />
      </svg>
    )
  }

  const stroke = 3
  const radius = (size - (2 * stroke)) / 2
  const circumference = radius * 2 * Math.PI
  let strokeDashOffsetValue = circumference - percent * circumference
  classNames.push('static')

  return (
    <svg
      className={classNames.join(' ')}
      width={size}
      height={size}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashOffsetValue || circumference}
        strokeWidth={stroke}
        strokeMiterlimit='10' />
    </svg>
  )
}

export default LoadingIndicator
