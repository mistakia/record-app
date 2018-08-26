import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export const PageLayout = ({ head, body, title }) => (
  <KeyboardAwareScrollView>
    <View style={styles.head}>
      { title ? <Text style={styles.title}>{title}</Text> : head }
    </View>
    <View style={styles.body}>
      { body }
    </View>
  </KeyboardAwareScrollView>
)

const styles = StyleSheet.create({
  head: {
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    paddingTop: 15,
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    marginBottom: 5
  },
  body: {
    paddingBottom: 45
  },
  title: {
    paddingTop: 25,
    paddingLeft: 15,
    fontSize: 20,
    fontWeight: 'bold',
    paddingBottom: 15
  }
})

export default PageLayout
