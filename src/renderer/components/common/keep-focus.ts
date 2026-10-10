// A mousedown handler for a control that must not take the focus from the
// field it acts on: a press on it leaves the focus where it was.

export const keep_focus = (event: { preventDefault: () => void }): void => { event.preventDefault() }
