import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

import Taglist from '@components/taglist'
import Button from '@components/button'

const render = ({ trackItems, loading, showAdd }) => (
  <View>
    {showAdd && <Link component={Button} to='/tracks/new'>
      <Text>Add Track</Text>
    </Link>}
    <Taglist />
    {trackItems}
    {loading}
  </View>
)

export default render
