import React from 'react'

import PageLayout from '@layouts/page'

import './settings.styl'

export default function () {
  const { info } = this.props

  const subPeers = Object.values(info.subs).flat()
  const dedupPeers = Array.from(new Set(subPeers))

  const peers = dedupPeers.map((peer, index) => {
    return (
      <tr key={index}>
        <td>{index + 1}</td>
        <td>{peer}</td>
      </tr>
    )
  })

  const body = (
    <div id='settings-container'>
      <div>
        <table>
          <tbody>
            <tr>
              <th><label>Data Sent</label></th>
              <td>{parseFloat(info.bw.totalOut / 1048576).toFixed(2)} Mb</td>
            </tr>
            <tr>
              <th><label>Data Received</label></th>
              <td>{parseFloat(info.bw.totalIn / 1048576).toFixed(2)} Mb</td>
            </tr>
            <tr>
              <th><label>IPFS Repo Objects</label></th>
              <td>{info.repo.numObjects}</td>
            </tr>
            <tr>
              <th><label>IPFS Repo Size</label></th>
              <td>{parseFloat(info.repo.repoSize / 1048576).toFixed(2)} Mb</td>
            </tr>
          </tbody>
        </table>
        <h3>Keyboard Shortcuts</h3>
        <table>
          <tbody>
            <tr>
              <td><strong>spacebar</strong></td>
              <td>play/puase</td>
            </tr>
            <tr>
              <td><strong>←</strong></td>
              <td>play previous</td>
            </tr>
            <tr>
              <td>→</td>
              <td>play next</td>
            </tr>
            <tr>
              <td>a</td>
              <td>go to account page</td>
            </tr>
            <tr>
              <td>s</td>
              <td>go to settings page</td>
            </tr>
            <tr>
              <td>l</td>
              <td>go to my library</td>
            </tr>
            <tr>
              <td>h</td>
              <td>go to home</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th />
              <th>IPFS PubSub Peers</th>
            </tr>
          </thead>
          <tbody>
            {peers}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageLayout title='Settings' body={body} scroll />
  )
}
