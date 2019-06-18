import React from 'react'
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import NavLink from '@components/nav-link'
import Button from '@components/button'
import TextStyles from '@styles/text'

const Contact = ({
  contactName,
  contactLocation,
  contactBio,
  contact,
  type,
  disconnect
}) => {
  const style = styles[type]

  const connectAction = (
    <Link
      text='Connect'
      style={style.action}
      component={Button}
      to={`/new-contact${contact.address}?alias=${contact.name || contact.alias}`} />
  )

  const disconnectAction = (
    <Button
      text='Disconnect'
      style={style.action}
      onClick={disconnect} />
  )

  const selfAction = (
    <Link to='/edit-about' style={style.action} component={Button} text='Edit' />
  )

  const contactAction = (contact.isMe
    ? selfAction
    : (contact.haveContact
      ? disconnectAction
      : connectAction
    )
  )

  if (type !== 'profile') {
    return (
      <Link
        to={`/tracks${contact.address}`}
        component={TouchableOpacity}
        style={style.contact}>
        <Image
          style={style.avatar}
          source={{ uri: contact.avatar }} />
        <View style={style.body}>
          <Text style={TextStyles.title}>{contactName}</Text>
          {contactLocation && <Text>{contactLocation}</Text>}
        </View>
        {type === 'item' && <View style={style.actionContainer}>
          {contact.haveContact ? disconnectAction : connectAction}
        </View>}
      </Link>
    )
  }

  return (
    <View style={style.contact}>
      <View style={style.body}>
        <Image
          style={style.avatar}
          source={{ uri: contact.avatar }} />
        <Text style={style.title}>{contactName}</Text>
        {contactLocation && <Text>{contactLocation}</Text>}
        {contactBio && <Text>{contactBio}</Text>}
        <View style={style.action}>{contactAction}</View>
      </View>
      <View style={style.menu}>
        <NavLink
          style={style.menuItem}
          active={style.menuItemActive}
          to={`/tracks${contact.address}`}>
          <Text>Tracks</Text>
        </NavLink>
        <NavLink
          style={style.menuItem}
          active={style.menuItemActive}
          to={`/contacts${contact.address}`}>
          <Text>Contacts</Text>
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
  contact: {
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
  contact: {
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
  contact: {
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

export default Contact
