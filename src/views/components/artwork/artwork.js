import React from 'react'

import './artwork.styl'

export default function Artwork ({ className, children, background, url }) {
  const classNames = ['artwork', className]

  const style = background && {
    backgroundImage: `url("${url}")`
  }

  return (
    <div className={classNames.join(' ')}>
      <div className='disc'>
        <div className='disc-label' />
      </div>
      <div className='children' style={style}>
        { (url && !background) && <img src={url} /> }
        {children}
      </div>
    </div>
  )
}
