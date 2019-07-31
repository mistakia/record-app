import { Map, List } from 'immutable'

import { contactlistActions } from '@core/contactlists'
import { contactActions } from './actions'
import { feedActions } from '@core/feed'
import { createContact } from './contact'

export function contactsReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case contactlistActions.FETCH_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_PEER_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_ALL_CONTACTS_FULFILLED:
      return state.withMutations(contacts => {
        payload.data.forEach(contactData => {
          contacts.set(contactData.id, createContact(contactData))
        })
      })

    case feedActions.FETCH_FEED_FULFILLED:
      return state.withMutations(contacts => {
        payload.data.forEach(feedData => {
          if (feedData.entryType === 'contact') {
            contacts.set(feedData.entryId, createContact(feedData.content))
          }

          contacts.set(feedData.contact.id, createContact(feedData.contact))
        })
      })

    case contactActions.CONTACT_REPLICATED:
      return state.withMutations(contacts => {
        contacts.setIn([payload.contactId, 'length'], payload.length)
        contacts.setIn([payload.contactId, 'max'], payload.replicationStatus.max)
      })

    case contactActions.CONTACT_REPLICATE_PROGRESS:
      return state.withMutations(contacts => {
        contacts.setIn([payload.contactId, 'length'], payload.length)
        contacts.setIn([payload.contactId, 'max'], payload.replicationStatus.max)
      })

    case contactActions.CONTACT_CONNECTED:
      return state.withMutations(contacts => {
        const contact = contacts.get(payload.contactId)
        if (contact) {
          contacts.setIn([payload.contactId, 'isReplicating'], true)
        }
      })

    case contactActions.CONTACT_DISCONNECTED:
      return state.withMutations(contacts => {
        const contact = contacts.get(payload.contactId)
        if (contact) {
          contacts.setIn([payload.contactId, 'isReplicating'], false)
        }
      })

    case contactActions.FETCH_CONTACT_FULFILLED:
      return state.withMutations(contacts => {
        contacts.set(payload.data.id, createContact(payload.data))
      })

    case contactlistActions.DELETE_CONTACT_FULFILLED:
      return state.withMutations(contacts => {
        contacts.setIn([payload.data.id, 'haveContact'], false)
        contacts.setIn([payload.data.id, 'isUpdating'], false)
      })

    case contactlistActions.ADD_CONTACT:
      return state.withMutations(contacts => {
        contacts.map(contact => {
          if (contact.address === payload.logId) {
            contacts.setIn([contact.id, 'isUpdating'], true)
          }
        })
      })

    case contactlistActions.REMOVE_CONTACT:
      return state.withMutations(contacts => {
        contacts.setIn([payload.data.contactId, 'isUpdating'], true)
      })

    case contactlistActions.POST_CONTACT_FAILED:
    case contactlistActions.POST_CONTACT_FULFILLED:
    case contactlistActions.DELETE_CONTACT_FAILED:
      return state.withMutations(contacts => {
        contacts.map(contact => contact.set('isUpdating', false))
      })

    case contactActions.RECORD_PEER_JOINED:
    case contactActions.CONTACT_PEER_JOINED:
      return state.withMutations(contacts => {
        contacts.map((contact) => {
          if (contact.address === payload.logId) {
            contacts.setIn([contact.id, 'peers'], mergePeers(contact.peers, [payload.peerId]))
          }
        })
      })

    case contactActions.RECORD_PEER_LEFT:
      return state.withMutations(contacts => {
        contacts.map((contact) => {
          const idx = contact.peers.indexOf(payload.peerId)
          if (idx > 0) contact.peers.delete(idx)
        })
      })

    default:
      return state
  }
}

function mergePeers (peerList, collection) {
  let peers = peerList.toJS()
  let newPeers = collection.reduce((list, peer) => {
    if (peers.indexOf(peer) === -1) list.push(peer)
    return list
  }, [])

  return newPeers.length ? new List(peers.concat(newPeers)) : peerList
}
