import React from 'react'

import { shell } from 'electron'
import IconButton from '@components/icon-button'
import Icon from '@components/icon'
import Loglist from '@components/loglist'
import PageLayout from '@layouts/page'

export default function () {
  const { logs, allLoglist, isHomeHelpVisible, toggleHomeHelp } = this.props

  const help = (
    <div>
      <div className='page__help-row'>
        <div className='page__help-lead'>Here you will see libraries that you discover on the network.</div>
      </div>
      <div className='page__help-row'>
        <Icon name='sync' />
        <div>To access a library you will first need to synchronize with it.</div>
      </div>
      <div className='page__help-row'>
        <Icon name='link' />
        <div>You should link to libraries you want to keep around.</div>
      </div>
      <div className='page__help-row'>
        <IconButton className='button__outline' icon='link' label='link' link='/link-log' />
        <div>If you have a library's address, you can add it directly.</div>
      </div>
      <a onClick={shell.openExternal.bind(null, 'https://github.com/mistakia/record-app/wiki')} className='button button__text page__help-link'>Learn more</a>
    </div>
  )

  const body = (
    <Loglist
      showAdd
      logs={logs}
      displayLoadingIndicator={allLoglist.isPending} />
  )

  return (
    <PageLayout title='Home' help={isHomeHelpVisible && help} body={body} onHelpClose={toggleHomeHelp} />
  )
}
