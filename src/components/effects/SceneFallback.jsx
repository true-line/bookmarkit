import React from "react";

// Error boundary for the lazy 3D scenes. Suspense covers a *pending* import;
// a rejected one (stale web deployment, failed chunk request) lands here
// instead — a decorative scene must never take the bookmark UI down with it.
// Like the WebGL-unavailable path, the fallback is for the life of the mount.

export default class SceneFallback extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { fallback, children } = this.props;
    return this.state.failed ? fallback : children;
  }
}
