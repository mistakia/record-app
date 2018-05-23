import React from 'react'
import { StyleSheet, ScrollView, View } from 'react-native'

export const PageLayout = ({ head, body }) => (
  <ScrollView>
    <View style={styles.head}>
      { head }
    </View>
    <View>
      { body }
    </View>
  </ScrollView>
)

const styles = StyleSheet.create({
  head: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default PageLayout
