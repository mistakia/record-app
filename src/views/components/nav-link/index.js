import React from 'react'
import { Route } from 'react-router'
import { Link } from 'react-router-native'

const NavLink = ({
  to,
  style,
  active,
  children,
  ...rest
}) => {
  const path = typeof to === 'object' ? to.pathname : to
  const escapedPath = path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')

  const getChildren = ({ location, match }) => {
    const isActive = !!match

    return (
      <Link to={to} style={isActive ? [style, active] : style}>{children}</Link>
    )
  }

  return (
    <Route
      path={escapedPath}
      children={getChildren} />
  )
}

export default NavLink
