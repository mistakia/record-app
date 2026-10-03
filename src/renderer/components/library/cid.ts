// Whether a string is a well-formed CID: v0 (base58btc `Qm...`) or v1 in
// base32 (`b...`) or base58btc (`z...`) multibase. The node decides whether
// the content exists.

const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
const CID_V1_BASE32 = /^b[a-z2-7]{50,}$/
const CID_V1_BASE58 = /^z[1-9A-HJ-NP-Za-km-z]{40,}$/

export const is_cid = (value: string): boolean => CID_V0.test(value) || CID_V1_BASE32.test(value) || CID_V1_BASE58.test(value)
