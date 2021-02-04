import React from 'react'
import { View } from 'react-native'
// import { Link } from 'react-router-native'

import Taglist from '@components/taglist'

const render = ({ trackItems, loading, showAdd }) => (
  <View>
    {/* {showAdd && <Link style={styles.button} component={Button} to='/importer' text='Add Track' />} */}
    <Taglist />
    {trackItems}
    {loading}
  </View>
)

/* const styles = StyleSheet.create({
 *   button: {
 *     marginTop: 10,
 *     alignSelf: 'flex-end'
 *   }
 * })
 *  */
export default render
