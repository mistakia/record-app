import React from 'react'
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'

import ImporterProgress from '@components/importer-progress'
import './page.styl'

export const PageLayout = ({ help, head, body, title, scroll, onHelpClose }) => (
  <section className='page'>
    { help &&
      <div className='page__help'>
        <div className='page__help-body'>
          {help}
        </div>
        <IconButton onClick={onHelpClose} style={{ position: 'absolute', top: '4px', right: '4px' }}>
          <CloseIcon />
        </IconButton>
      </div>
    }
    { (head || title) &&
      <div className='page__head'>
        <div className='page__container'>
          <div className='page__nav-info'>
            { title ? <div className='page__title'>{title}</div> : head }
          </div>
        </div>
      </div>
    }
    <div className={'page__body' + (scroll ? ' scroll' : '')}>
      { body }
    </div>
    <ImporterProgress />
  </section>
)

export default PageLayout
