import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect, Component } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root error boundary to prevent full-page white-screens in production.
 */
class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[RootErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            backgroundColor: "#fafafa",
            padding: "24px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 20,
                fontWeight: 700,
                color: "#ef4444",
              }}
            >
              !
            </div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#18181b",
                margin: "0 0 8px",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#71717a",
                margin: "0 0 24px",
                lineHeight: 1.5,
              }}
            >
              The app ran into an unexpected error. Please refresh the page to
              try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#18181b",
                color: "white",
                border: "none",
                padding: "10px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout({ children }) {
  useEffect(() => {
    // Load Inter font if not already present
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    document.body.style.fontFamily =
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    document.body.style.backgroundColor = "#fafafa";
    document.body.style.margin = "0";
  }, []);

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
