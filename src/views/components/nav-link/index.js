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
  const path = typeof to === "object" ? to.pathname : to
  const escapedPath = path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1")

  return (
    <Route
      path={escapedPath}
      children={({ location, match }) => {
          const isActive = !!match

          return (
            <Link to={to} style={isActive ? [style, active] : style}>{children}</Link>
          )
      }} />
  )
}

export default NavLink
