// ARCH-07: React error boundary — prevents unhandled render errors from showing a blank screen.
// Class component required by React's error boundary API. The visible fallback
// is a separate function component, because only a function component can read
// the message catalogue (#284).

import React from "react";
import ErrorBoundaryFallback from "./ErrorBoundaryFallback.jsx";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log for debugging; never surface raw details to the user
    console.error("[ErrorBoundary] Caught render error:", error, info?.componentStack);
    // In dev mode, re-throw so React's error overlay still appears
    if (import.meta.env.DEV) {
      // Defer so the boundary still renders the fallback, but overlay is triggered
      setTimeout(() => {
        throw error;
      }, 0);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback fallbackMessage={this.props.fallbackMessage} />;
    }
    return this.props.children;
  }
}
