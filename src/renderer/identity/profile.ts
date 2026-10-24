// The identity's profile as the editor holds it and as PUT /identity/profile
// takes it (spec §4.8.2): the PUT replaces the whole profile, so a field
// left empty is sent as absent, which clears it.

export interface ProfileDraft { name: string, bio: string, avatar: string }

export const profile_body = (draft: ProfileDraft): { name?: string, bio?: string, avatar?: string } => {
  const body: { name?: string, bio?: string, avatar?: string } = {}
  if (draft.name.trim() !== '') body.name = draft.name.trim()
  if (draft.bio.trim() !== '') body.bio = draft.bio.trim()
  if (draft.avatar.trim() !== '') body.avatar = draft.avatar.trim()
  return body
}
