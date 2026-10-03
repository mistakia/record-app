// Main stops restarting the bundled node after this many restarts in a row
// that did not stay up (spec §8.4.4); the renderer shows the count against it.
export const MAX_FAILED_RESTARTS = 5
