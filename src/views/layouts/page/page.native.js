import React from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export const PageLayout = ({ head, body }) => (
  <KeyboardAwareScrollView>
    <View style={styles.head}>
      { head }
    </View>
    <View style={styles.body}>
      { body }
    </View>
  </KeyboardAwareScrollView>
)

const styles = StyleSheet.create({
  head: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center'
  },
  body: {
    paddingBottom: 75
  }
})

export default PageLayout
