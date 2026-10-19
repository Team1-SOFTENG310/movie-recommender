import { Component, type ErrorInfo, type ReactNode } from "react";
import "../pages/NotFound.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Without this, an error thrown while rendering any component unmounts the whole app
 * and leaves a blank page. React only supports error boundaries as class components.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected error while rendering:", error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="not-found" role="alert">
        <h1>Something went wrong</h1>
        <p>An unexpected error stopped this page from loading. Reloading usually fixes it.</p>
        <button type="button" className="not-found__home" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </main>
    );
  }
}
