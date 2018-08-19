import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import RN from 'react-native/package'

const [major, minor] = RN.version.split('.').map((item) => Number(item))
const hasLoopSupport = !major && minor >= 45

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30
  },

  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default class LoadingIndicator extends PureComponent {
  static defaultProps = {
    animationEasing: Easing.linear,
    animationDuration: 1800,

    animating: true,
    interaction: true,

    color: 'rgb(0, 0, 0)',
    size: 30
  }

  static propTypes = {
    animationEasing: PropTypes.func,
    animationDuration: PropTypes.number,

    animating: PropTypes.bool,
    interaction: PropTypes.bool
  }

  constructor(props) {
    super(props)

    this.startAnimation = this.startAnimation.bind(this)
    this.stopAnimation = this.stopAnimation.bind(this)

    this.state = {
      progress: new Animated.Value(0)
    }

    this.mounted = false
  }

  startAnimation({ finished } = {}) {
    let { progress } = this.state
    let {
      interaction,
      animationEasing,
      animationDuration,
    } = this.props

    if (!this.mounted || false === finished) {
      return
    }

    let animation =
      Animated.timing(progress, {
        duration: animationDuration,
        easing: animationEasing,
        useNativeDriver: true,
        isInteraction: interaction,
        toValue: 1,
      })

    if (hasLoopSupport) {
      Animated
        .loop(animation)
        .start()
    } else {
      progress.setValue(0)
      animation.start(this.startAnimation)
    }

    this.setState({ animation })
  }

  stopAnimation() {
    let { animation } = this.state

    if (animation == null) {
      return
    }

    animation.stop()

    this.setState({ animation: null })
  }

  componentDidMount() {
    let { animating } = this.props

    this.mounted = true

    if (animating) {
      this.startAnimation()
    }
  }

  componentWillUnmount() {
    this.mounted = false
  }

  componentWillReceiveProps(props) {
    let { animating } = this.props

    if (animating ^ props.animating) {
      if (animating) {
        this.stopAnimation()
      } else {
        this.startAnimation()
      }
    }
  }

  render() {
    let { style, size, color, animationDuration, ...props } = this.props
    let { progress } = this.state

    let frames = 60 * animationDuration / 1000
    let easing = Easing.bezier(0.4, 0.0, 0.7, 1.0)

    let inputRange = Array
      .from(new Array(frames), (undefined, frameIndex) => frameIndex / (frames - 1))

    let outputRange = Array
      .from(new Array(frames), (undefined, frameIndex) => {
        let progress = 2 * frameIndex / (frames - 1)
        let rotation = +(360 - 15)

        if (progress > 1.0) {
          progress = 2.0 - progress
        }

        let direction = -1

        return (direction * (180 - 30) * easing(progress) + rotation) + 'deg'
      })

    let layerStyle = {
      width: size,
      height: size,
      transform: [{
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [(0 + 30 + 15) + 'deg', (2 * 360 + 30 + 15) + 'deg'],
        }),
      }]
    }

    let viewportStyle = {
      width: size,
      height: size,
      transform: [{
        translateY: -size / 2,
      }, {
        rotate: progress.interpolate({ inputRange, outputRange }),
      }]
    }

    let containerStyle = {
      width: size,
      height: size / 2,
      overflow: 'hidden'
    }

    let offsetStyle = { top: size / 2 }

    let lineStyle = {
      width: size,
      height: size,
      borderColor: color,
      borderWidth: 1,
      borderRadius: size / 2
    }

    return (
      <View style={[styles.container, style]}>
        <Animated.View {...props}>
          <Animated.View style={styles.layer}>
            <Animated.View style={layerStyle}>
              <Animated.View style={[containerStyle, offsetStyle]} collapsable={false}>
                <Animated.View style={viewportStyle}>
                  <Animated.View style={containerStyle} collapsable={false}>
                    <Animated.View style={lineStyle} />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    )
  }
}
