import React from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export const PageLayout = ({ head, body }) => (
  <KeyboardAwareScrollView>
    <View style={styles.head}>
      { head }
    </View>
    <View>
      { body }
    </View>
  </KeyboardAwareScrollView>
)

const styles = StyleSheet.create({
  head: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default PageLayout
