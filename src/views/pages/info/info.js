import React from 'react'
import hashicon from 'hashicon'
import { Link } from 'react-router-dom'

import PageLayout from '@layouts/page'
import Button from '@components/button'
import CopyText from '@components/copy-text'

import './info.styl'

export default function () {
  const { app, info, getPrivateKey, setIdentity } = this.props

  const peers = info.peers.map((peer, index) => {
    return (
      <tr key={index}>
        <td>{index + 1}</td>
        <td>{peer.address}</td>
      </tr>
    )
  })

  const showPrivateKey = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    getPrivateKey()
  }

  const generateIdentity = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    setIdentity()
  }

  const appIcon = app.id ? hashicon(app.id, 40) : null
  const addressIcon = app.address ? hashicon(app.address, 40) : null
  const keyIcon = app.privateKey ? hashicon(app.privateKey, 40) : null

  const body = (
    <div id='info-container'>
      <div>
        <CopyText text={app.id}>
          <label>ID</label>
          <img src={appIcon && appIcon.toDataURL()} />
          <small>{app.id}</small>
        </CopyText>
        <CopyText text={app.orbitdb.address}>
          <label>Address</label>
          <img src={addressIcon && addressIcon.toDataURL()} />
          <small>{app.orbitdb.address}</small>
        </CopyText>
        <CopyText text={app.privateKey} disabled={!app.privateKey}>
          <label>Secret Key</label>
          <img src={keyIcon && keyIcon.toDataURL()} />
          <small>
            { app.privateKey
              ? app.privateKey
              : <button onClick={showPrivateKey}>Reveal Secret Key</button>
            }
          </small>
        </CopyText>
        <div>
          <Link className='button' to='/set-identity'>Load Existing Account</Link>
          <Button onClick={generateIdentity} isLoading={app.isPending}>Generate new Account</Button>
        </div>
      </div>
      <div>
        <table>
          <tbody>
            <tr>
              <th><label>IPFS State</label></th>
              <td>{info.state}</td>
            </tr>
            <tr>
              <th><label>OrbitDB State</label></th>
              <td>{app.isReplicating ? 'Replicating' : 'Offline'}</td>
            </tr>
            <tr>
              <th><label>IPFS Agent Version</label></th>
              <td>{app.ipfs.agentVersion}</td>
            </tr>
            <tr>
              <th><label>IPFS Protocol Version</label></th>
              <td>{app.ipfs.protocolVersion}</td>
            </tr>
            <tr>
              <th><label>Data Sent</label></th>
              <td>{info.bitswap.dataSent}</td>
            </tr>
            <tr>
              <th><label>Data Received</label></th>
              <td>{info.bitswap.dataReceived}</td>
            </tr>
            <tr>
              <th><label>Repo Objects</label></th>
              <td>{info.repo.numObjects}</td>
            </tr>
            <tr>
              <th><label>Repo Size</label></th>
              <td>{parseFloat(info.repo.repoSize).toFixed(2)} Mb</td>
            </tr>
            <tr>
              <th><label>Repo Version</label></th>
              <td>{info.repo.version}</td>
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
              <td>e</td>
              <td>go to explore page</td>
            </tr>
            <tr>
              <td>i</td>
              <td>go to info page</td>
            </tr>
            <tr>
              <td>t</td>
              <td>go to my tracks page</td>
            </tr>
          </tbody>
        </table>
        {/* <table>
            <thead>
            <tr>
            <th />
            <th>IPFS Peer</th>
            </tr>
            </thead>
            <tbody>
            {peers}
            </tbody>
            </table> */}
      </div>
    </div>
  )

  return (
    <PageLayout title='Info' body={body} scroll />
  )
}
