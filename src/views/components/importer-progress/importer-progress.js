import React from 'react'

import CircularProgress from '@material-ui/core/CircularProgress'

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
      <CircularProgress variant='determinate' value={completed / total * 100} size={62} />
    </div>
  )
}

export default ImporterProgress
