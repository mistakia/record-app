// Main stops restarting the bundled node after this many restarts in a row
// that did not stay up (spec §8.4.4); the renderer shows the count against it.
export const MAX_FAILED_RESTARTS = 5

// The bundled node ships ffmpeg and fpcalc but not yt-dlp, whose extractors
// change too often to pin; URL import stays a remote-node feature. Main
// refuses it, and the importer says why.
export const URL_IMPORT_OFF_IN_BUNDLED = 'URL import is off for the bundled node, which does not ship a downloader. Download the file and import it, or connect to a remote node.'
