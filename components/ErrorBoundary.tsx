import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TriangleAlert as AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });

    // Log to crash reporting service in production
    if (!__DEV__) {
      // Add crash reporting here (e.g., Sentry, Crashlytics)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  const handleRestart = () => {
    if (Platform.OS !== 'web') {
      // For mobile, try to restart the app
      try {
        // This will reload the bundle
        if (Platform.OS === 'ios') {
          // iOS specific restart
          resetError();
        } else {
          // Android specific restart
          resetError();
        }
      } catch (e) {
        resetError();
      }
    } else {
      // For web, reload the page
      window.location.reload();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle color="#ff6b6b" size={48} strokeWidth={2} />
          </View>
          
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.subtitle}>
            We encountered an unexpected error. Don't worry, this happens sometimes. Please try restarting the app.
          </Text>
          
          {__DEV__ && error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details (Development Mode):</Text>
              <Text style={styles.errorText}>{error.message}</Text>
              {error.stack && (
                <Text style={styles.errorStack} numberOfLines={10}>
                  {error.stack}
                </Text>
              )}
            </View>
          )}
          
          <TouchableOpacity style={styles.retryButton} onPress={handleRestart}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.retryButtonGradient}
            >
              <RefreshCw color="white" size={20} strokeWidth={2} />
              <Text style={styles.retryButtonText}>Restart App</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={resetError}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorDetails: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    maxWidth: '100%',
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 107, 107, 0.8)',
  },
  retryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});