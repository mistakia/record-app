import { createSelector } from 'reselect';


export function getIdentities(state) {
  return state.identities;
}

export function getIdentityById(state, id) {
  return getIdentitie(state).get(id);
}


//=====================================
//  MEMOIZED SELECTORS
//-------------------------------------

export const getCurrentIdentity = createSelector(
  getIdentities,
  identities => identities.get(identities.get('currentIdentity'))
)
