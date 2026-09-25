import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Root-level safety net: catches any render-time crash the app doesn't
// already handle (a screen throwing during render, not a network/API
// error -- those already come back as a normal ApiError a screen can
// display inline). Previously there was no error boundary anywhere in this
// app, so this class of failure blanked/crashed the screen in production
// with no fallback UI at all. Deliberately dependency-free and not themed
// (mirrors the website's global-error.tsx reasoning) -- if something this
// fundamental already failed, this boundary shouldn't assume anything else
// in the app is in a working state.
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('[RootErrorBoundary] uncaught render error:', error, info?.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Nothing was changed. Try again, or close and reopen the app if it keeps happening.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  card: {
    maxWidth: 420,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 16,
    padding: 28,
  },
  title: { fontSize: 15, fontWeight: '800', color: '#10243f', textAlign: 'center' },
  body: { fontSize: 13, color: '#5c6b82', textAlign: 'center' },
  button: { borderRadius: 11, backgroundColor: '#1f6feb', paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
