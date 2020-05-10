import React from 'react'

import LoadingIndicator from '@components/loading-indicator'

import './importer-progress.styl'

const ImporterProgress = ({
  progress
}) => {
  const { completed, total, remaining } = progress

  if (!remaining) {
    return null
  }

  return (
    <div id='importer-progress'>
      <LoadingIndicator percent={completed / total} size={62} />
    </div>
  )
}

export default ImporterProgress
