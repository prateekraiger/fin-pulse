import React, { Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

/**
 * Production-ready error boundary for the mobile app.
 * Catches unhandled JS errors in the React tree and shows a
 * user-friendly fallback instead of a white screen / crash.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in dev; in production this is where you'd send
    // to a remote error-reporting service (e.g. Sentry, Bugsnag).
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.description}>
              The app ran into an unexpected error. Please try again.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={6}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ef4444",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18181b",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#18181b",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ErrorBoundary;
