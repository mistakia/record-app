import React from 'react'
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import NavLink from '@components/nav-link'
import TextStyles from '@styles/text'

const Log = ({
  logName,
  logLocation,
  logBio,
  log,
  type,
  unlink
}) => {
  const style = styles[type]

  /* const connectAction = (
   *   <Link
   *     text='Link'
   *     style={style.action}
   *     component={Button}
   *     to={`/link-log${log.address}?alias=${log.name || log.alias}`} />
   * )

   * const disconnectAction = (
   *   <Button
   *     text='Unlink'
   *     style={style.action}
   *     onClick={unlink} />
   * )

   * const selfAction = (
   *   <Link to='/edit-about' style={style.action} component={Button} text='Edit' />
   * )

   * const logAction = (log.isMe
   *   ? selfAction
   *   : (log.isLinked
   *     ? disconnectAction
   *     : connectAction
   *   )
   * )
   */
  if (type !== 'profile') {
    return (
      <Link
        to={`/tracks${log.address}`}
        component={TouchableOpacity}
        style={style.log}>
        <Image
          style={style.avatar}
          source={{ uri: log.avatar }} />
        <View style={style.body}>
          <Text style={TextStyles.title}>{logName}</Text>
          {logLocation && <Text>{logLocation}</Text>}
        </View>
        {type === 'item' && <View style={style.actionContainer}>
          {/* {log.isLinked ? disconnectAction : connectAction} */}
        </View>}
      </Link>
    )
  }

  return (
    <View style={style.log}>
      <View style={style.body}>
        <Image
          style={style.avatar}
          source={{ uri: log.avatar }} />
        <Text style={style.title}>{logName}</Text>
        {logLocation && <Text>{logLocation}</Text>}
        {logBio && <Text>{logBio}</Text>}
        {/* <View style={style.action}>{logAction}</View> */}
      </View>
      <View style={style.menu}>
        <NavLink
          style={style.menuItem}
          active={style.menuItemActive}
          to={`/tracks${log.address}`}>
          <Text>Tracks</Text>
        </NavLink>
        <NavLink
          style={style.menuItem}
          active={style.menuItemActive}
          to={`/logs${log.address}`}>
          <Text>Logs</Text>
        </NavLink>
      </View>
    </View>
  )
}

const profile = StyleSheet.create({
  title: {
    fontWeight: '100',
    fontSize: 38
  },
  action: {
    position: 'absolute',
    right: 5
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: 'white'
  },
  menu: {
    borderColor: '#f0f0f0',
    borderBottomWidth: 1,
    marginBottom: -1,
    backgroundColor: '#f9f9f9',
    paddingLeft: 5,
    paddingRight: 5,
    flexDirection: 'row',
    alignSelf: 'stretch'
  },
  log: {
    alignSelf: 'stretch'
  },
  menuItem: {
    padding: 10,
    marginBottom: -1
  },
  menuItemActive: {
    borderColor: '#f0f0f0',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 2,
    borderTopColor: '#D3E478',
    backgroundColor: 'white'
  },
  body: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 20,
    paddingRight: 20,
    alignSelf: 'stretch'
  }
})

const heading = StyleSheet.create({
  log: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingTop: 30,
    marginBottom: 10
  },
  avatar: {
    height: 30,
    width: 30,
    borderRadius: 15,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    marginLeft: 5,
    marginRight: 10,
    backgroundColor: 'white'
  },
  body: {
    flex: 5
  }
})

const item = StyleSheet.create({
  log: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginTop: -1,
    marginLeft: 10,
    marginRight: 10,
    justifyContent: 'center'
  },
  avatar: {
    height: 50,
    width: 50,
    backgroundColor: '#f0f0f0'
  },
  actionContainer: {
    justifyContent: 'center'
  },
  action: {
    width: 100
  },
  body: {
    paddingLeft: 10,
    justifyContent: 'center',
    flex: 1
  }
})

const styles = { heading, profile, item }

export default Log
