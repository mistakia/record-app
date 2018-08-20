import React from 'react'
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import NavLink from '@components/nav-link'
import Button from '@components/button'
import TextStyles from '@styles/text'

const Contact = ({ contact, type, removeContact }) => {
  const style = styles[type]

  removeContact = removeContact.bind(null, { contactId: contact.id })

  if (type !== 'profile') {
    return (
      <Link
        to={`/tracks${contact.address}`}
        component={TouchableOpacity}
        style={style.contact}>
        <Image
          style={style.avatar}
          source={{uri: contact.avatar }} />
        <View style={style.body}>
          <Text style={TextStyles.title}>
            { contact.isMe ?
              (contact.name || 'set your name' ) :
              (contact.alias || contact.name) }
          </Text>
          { (contact.isMe || contact.location) && <Text>
            { contact.isMe ?
              (contact.location || 'set your location') :
              contact.location}
          </Text> }
        </View>
        { type === 'item' && <View>
          { contact.haveContact ?
            <Button
              style={style.action}
              onClick={removeContact}>
              <Text>Disconnect</Text>
            </Button> :
            <Link
              style={style.action}
              component={Button}
              to={`/contacts/new/${contact.address}?alias=${contact.name || contact.alias}`}>
              <Text>Connect</Text>
            </Link>
          }
        </View> }
      </Link>
    )
  }

  return (
    <View style={style.contact}>
      <View style={style.body}>
        <Image
          style={style.avatar}
          source={{uri: contact.avatar }} />
        <Text style={style.title}>
          { contact.isMe ?
            (contact.name || 'set your name' ) :
            (contact.alias || contact.name) }
        </Text>
        { (contact.isMe || contact.location) && <Text>
          { contact.isMe ?
            (contact.location || 'set your location') :
            contact.location}
        </Text> }
        { (contact.isMe || contact.bio) && <Text>
          { contact.isMe ?
            (contact.bio || 'set your bio') :
            contact.bio }
        </Text> }
        <View style={style.action}>
          { contact.isMe ?
            <Link to='/edit-profile' component={Button}><Text>Edit</Text></Link> :
            ( contact.haveContact ?
              <Button onClick={removeContact}><Text>Disconnect</Text></Button> :
              <Link
                component={Button}
                to={`/contacts/new/${contact.address}?alias=${contact.name || contact.alias}`}>
                <Text>Connect</Text>
              </Link>
            )
          }
        </View>
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
    ...StyleSheet.absoluteFillObject,
    left: 'auto',
    top: 15,
    right: 15
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: 'white'
  },
  menu: {
    borderColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
    borderTopWidth: 2,
    paddingLeft: 5,
    paddingRight: 5,
    marginBottom: 10,
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  contact: {
    alignSelf: 'stretch'
  },
  menuItem: {
    padding: 10
  },
  menuItemActive: {
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
    paddingTop: 30
  },
  avatar: {
    height: 30,
    width: 30,
    borderRadius: 15,
    marginLeft: 7,
    marginRight: 7,
    backgroundColor: 'white',
    borderColor: '#f0f0f0',
    borderWidth: 1,
    marginLeft: 10,
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
    flexWrap: 'nowrap'
  },
  avatar: {
    height: 50,
    width: 50,
    borderRadius: 25,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: 'white'
  },
  action: {
    marginTop: 5,
    width: 100
  },
  body: {
    marginTop: 5,
    flex: 1
  }
})

const styles = { heading, profile, item }

export default Contact
