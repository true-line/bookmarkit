// ARCH-07: React error boundary — prevents unhandled render errors from showing a blank screen.
// Class component required by React's error boundary API.

import React from "react";
import { Button } from "../design-system/index.js";

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
      return (
        <div
          className="ui-error-fallback"
          style={{
            minHeight: "200px",
            color: "var(--text-primary, #111827)",
            backgroundColor: "var(--bg-primary, #ffffff)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: "12px" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontWeight: 600, fontSize: "16px", marginBottom: "8px" }}>
            Something went wrong.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary, #6b7280)",
              marginBottom: "16px",
            }}
          >
            {this.props.fallbackMessage || "An unexpected error occurred in this section."}
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
