export function getImporter (state) {
  return state.get('importer')
}

export function getImporterFiles (state) {
  const importer = getImporter(state)
  const files = importer.get('files')
  const errors = importer.get('errors')
  return files.concat(errors).toArray()
}

export function getImporterProgress (state) {
  const importer = getImporter(state)
  const completed = importer.get('completed') - importer.get('previouslyCompleted')
  const remaining = importer.get('remaining')
  const total = completed + remaining
  return {
    remaining,
    completed,
    total
  }
}
