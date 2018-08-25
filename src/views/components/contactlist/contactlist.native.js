import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

import Button from '@components/button'

const render = ({ contactItems, loading, showAdd }) => (
  <View>
    {showAdd && <Link component={Button} to='/new-contact'>
      <Text>Add Contact</Text>
    </Link>}
    {contactItems}
    {loading}
  </View>
)

export default render
