// A library's avatar (STYLE.md § Artwork and avatars): a library has no
// image of its own, so it shows its owner's profile avatar (spec §4.8.2,
// §5.3.2: the identity's own for an own library, else the one the owner's
// announcement carried), and otherwise the pattern of its address.

import { Avatar } from '#renderer/components/common/avatar.tsx'
import { node_api } from '#renderer/store/api.ts'

export const LibraryAvatar = ({ address, size }: { address: string, size: number }) => {
  const profile = node_api.endpoints.get_library_profile.useQuery(address).data
  return <Avatar seed={address} size={size} cid={profile?.avatar} />
}
