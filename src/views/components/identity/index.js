import React from 'react'
import { Link } from 'react-router'
import { Identity } from '@core/identities'

function IdentityCard({identity}) (
  <article>
    <h1>{identity.id}</h1>
    <Link to={`/identities/${identity.id}`}>Profile</Link>
  </article>
)
