import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Screen } from '#renderer/components/common/screen.tsx'

describe('screen', () => {
  test('draws its glass as an aria-hidden first child under the content, in the .screen scope', () => {
    const html = renderToStaticMarkup(createElement(Screen, { className: 'player', children: createElement('p', null, 'now playing') }))
    expect(html).toBe('<div class="screen player"><div class="screen__glass" aria-hidden="true" data-testid="screen-glass"></div><p>now playing</p></div>')
  })
})
