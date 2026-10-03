// Client-side names for the generated chapter 7 schemas, and the WebSocket
// event union from the yaml's x-websocket-events, which openapi-typescript
// does not generate.

import type { components } from './generated-types.ts'

type Schemas = components['schemas']

export type Track = Schemas['Track']
export type TrackList = Schemas['TrackList']
export type Library = Schemas['Library']
export type About = Schemas['About']
export type Settings = Schemas['Settings']
export type TagCount = Schemas['TagCount']
export type Peer = Schemas['Peer']
export type ImportAck = Schemas['ImportAck']
export type ListenCount = Schemas['ListenCount']
export type ApiError = Schemas['Error']

interface LibraryAddressPayload { library_address: string }

interface NodeEventPayloads {
  'track:added': LibraryAddressPayload & { track: Track }
  'track:removed': LibraryAddressPayload & { track_id: string }
  'library:linked': LibraryAddressPayload & { about: About }
  'library:unlinked': LibraryAddressPayload
  'library:connected': LibraryAddressPayload
  'library:disconnected': LibraryAddressPayload
  'library:loading': { library: Library }
  'library:loaded': { library: Library }
  'library:replicated': LibraryAddressPayload & { length: number }
  'library:replicate-progress': LibraryAddressPayload & { progress: number, total: number }
  'library:index-updated': LibraryAddressPayload & {
    track_count: number
    linked_library_count: number
    is_processing_index: boolean
    processing_count: number
  }
  'library:peer-joined': LibraryAddressPayload & { peer_id: string }
  'library:peer-left': LibraryAddressPayload & { peer_id: string }
  'identity:library-created': { library: Library }
  'identity:library-retired': LibraryAddressPayload
  'peer:joined': { peer_id: string, peer_count: number }
  'peer:left': { peer_id: string, peer_count: number }
  'import:starting': { import_id: string, source: 'file' | 'url', file_count: number }
  'import:processed-file': { import_id: string, file_path: string, track: Track, completed: number, remaining: number }
  'import:error': { import_id: string, file_path: string, error: ApiError }
  'import:finished': { import_id: string, track_count: number, error_count: number }
}

export type NodeEventType = keyof NodeEventPayloads

export type NodeEvent = { [type in NodeEventType]: { type: type, payload: NodeEventPayloads[type] } }[NodeEventType]

// Rows per track list page.
export const TRACK_PAGE_SIZE = 200
