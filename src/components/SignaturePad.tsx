// Digital signature capture -- pure react-native-svg (already a dependency,
// already used for every icon in this app) + PanResponder (core React Native).
// No new native module: the "sign as guardian" flow needs neither
// react-native-view-shot nor any third-party signature-pad package --
// react-native-svg's own <Svg> ref exposes toDataURL(), which rasterizes
// exactly what's drawn to a real PNG, all inside the same native module already
// linked into this Expo Go build. This is the one thing the earlier
// expo-file-system regression taught us to be careful about: nothing here adds
// a new dependency to package.json.

import { useEffect, useRef, useState } from 'react';
import type { ElementRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { parentColors } from '@/lib/theme';

export interface SignaturePadHandle {
  /** Raw base64 PNG of whatever is currently drawn, or null if the pad is empty. */
  capture: () => Promise<string | null>;
}

interface Point {
  x: number;
  y: number;
}

function pathFromPoints(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M${first!.x},${first!.y} ` + rest.map((p) => `L${p.x},${p.y}`).join(' ');
}

export function SignaturePad({
  onChange,
  padRef,
}: {
  onChange?: (hasSignature: boolean) => void;
  padRef: React.MutableRefObject<SignaturePadHandle | null>;
}) {
  const svgRef = useRef<ElementRef<typeof Svg>>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Refs are an escape hatch from render, not something render should itself
  // assign to -- kept in sync via an effect (runs after each commit, so
  // `capture()` always closes over the latest `strokes`) instead of a direct
  // assignment in the component body.
  useEffect(() => {
    padRef.current = {
      capture: () =>
        new Promise((resolve) => {
          if (strokes.length === 0 || !svgRef.current) {
            resolve(null);
            return;
          }
          svgRef.current.toDataURL((base64: string) => resolve(base64));
        }),
    };
  }, [strokes, padRef]);

  // Deliberately NOT memoized: PanResponder.create() is a trivial factory (a
  // handful of function references, no expensive work), recreated every
  // render so each callback closes over that render's own `currentStroke` --
  // React keeps the underlying native view's props (panHandlers) up to date
  // every render exactly like any other prop, so whichever touch event fires
  // next always calls into the latest closure. This also avoids
  // onPanResponderRelease ever nesting setStrokes/onChange *inside*
  // setCurrentStroke's updater (that impure-updater nesting is what produced
  // "Cannot update a component while rendering a different component" --
  // React updater functions must be pure, and calling another component's
  // setState, via onChange, from inside one is exactly the anti-pattern that
  // triggers it): here all three setState calls are separate, top-level
  // statements in a real event handler, which is the correct, ordinary way to
  // update several pieces of state at once.
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (currentStroke.length > 1) {
        setStrokes((prev) => [...prev, currentStroke]);
        onChange?.(true);
      }
      setCurrentStroke([]);
    },
  });

  function reset() {
    setStrokes([]);
    setCurrentStroke([]);
    onChange?.(false);
  }

  const isEmpty = strokes.length === 0 && currentStroke.length === 0;

  return (
    <View>
      <View style={styles.padBox} {...panResponder.panHandlers}>
        <Svg ref={svgRef} width="100%" height="100%" viewBox="0 0 320 180">
          {strokes.map((stroke, i) => (
            <Path key={i} d={pathFromPoints(stroke)} stroke={parentColors.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentStroke.length > 1 ? (
            <Path d={pathFromPoints(currentStroke)} stroke={parentColors.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {isEmpty ? <Text style={styles.placeholder}>Sign here</Text> : null}
      </View>
      <Text style={styles.resetLink} onPress={reset}>
        Reset
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  padBox: {
    height: 180,
    borderWidth: 1.5,
    borderColor: parentColors.fieldBorder,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    color: parentColors.mutedLight,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  resetLink: {
    alignSelf: 'flex-end',
    marginTop: 10,
    color: parentColors.blueDeep,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
});
