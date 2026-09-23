// The chat screen's first-open empty state mark -- the real Pavakie "P"
// mark (assets/images/brand/pavakie-logo.png, extracted 1:1 from
// brain/pavakie_logo.png, not redrawn). Same intent as the website's own
// .pavakie-logo-anim/.pavakie-logo-spin/.pavakie-logo-bob: real depth via
// extrusion, not rotation alone -- a stack of darkened copies of the same
// image sit a few pixels "behind" the front-facing copy so turning the
// mark reveals genuine thickness between layers, the way a solid object
// -- not a flat card -- looks when it rotates. The old pulsing
// floor-contact shadow pill is gone, replaced by one static, soft ambient
// shadow on the whole mark.
//
// Motion was rebuilt per explicit follow-up feedback that a small
// oscillating rotateY swing read as barely-there/not lively: it's now a
// genuine continuous "turntable" spin (a full slow 360deg rotateY loop,
// linear, so its speed never eases to a visible stop/start) that never
// stops, not just a hover effect -- with an independent gentle vertical
// bob nested inside it, so the mark spins AND drifts up and down at the
// same time, composed from separate nested Animated.Views (one Animated
// transform per node; a single node can't cleanly run two independent
// looping transforms at once).
//
// `size` is the mark's real HEIGHT (real asset is 447x560, taller than
// wide, not a square badge) -- width is derived from that same ratio so
// the mark is never stretched into a square.

import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

const ASPECT_RATIO = 447 / 560;

// Back-to-front depth layers: index 0 is deepest/darkest; the plain front
// copy (full opacity, no tint) is rendered separately, last.
const DEPTH_LAYERS = [
  { offset: 6, opacity: 0.35 },
  { offset: 4, opacity: 0.5 },
  { offset: 2, opacity: 0.7 },
];

export function PavakieLogo3D({ size = 112 }: { size?: number }) {
  const [entrance] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }).start(() => {
      // A continuous 0->1 linear loop mapped to 0deg->360deg: the reset
      // from 360deg back to 0deg at each iteration is visually seamless
      // (a full turn looks identical at both ends), the standard technique
      // for an endless rotation with RN's Animated API.
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [entrance, spin, float]);

  const entranceScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const entranceRotateY = entrance.interpolate({ inputRange: [0, 1], outputRange: ['-32deg', '0deg'] });
  const spinRotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  const width = size * ASPECT_RATIO;
  const logoSource = require('../../../assets/images/brand/pavakie-logo.png');

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={{
          width,
          height: size,
          opacity: entrance,
          transform: [{ perspective: 1000 }, { scale: entranceScale }, { rotateY: entranceRotateY }],
          // One static, soft ambient shadow -- never animated/pulsing.
          shadowColor: '#591BDF',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <Animated.View style={{ width, height: size, transform: [{ perspective: 1000 }, { rotateY: spinRotateY }] }}>
          <Animated.View style={{ width, height: size, transform: [{ translateY: floatY }] }}>
            {DEPTH_LAYERS.map((layer, i) => (
              <Image
                key={i}
                source={logoSource}
                resizeMode="contain"
                style={{
                  position: 'absolute',
                  width,
                  height: size,
                  opacity: layer.opacity,
                  transform: [{ translateX: layer.offset * 0.4 }, { translateY: layer.offset }],
                  tintColor: '#3d1494',
                }}
              />
            ))}
            <Image source={logoSource} resizeMode="contain" style={{ width, height: size }} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
