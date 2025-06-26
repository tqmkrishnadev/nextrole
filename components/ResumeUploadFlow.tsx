import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Brain,
  Zap,
  ArrowRight,
  Download
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ResumeUploadFlowProps {
  onUploadComplete: (file: any) => void;
  onError: (error: string) => void;
}

export default function ResumeUploadFlow({ onUploadComplete, onError }: ResumeUploadFlowProps) {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const shimmerX = useSharedValue(-width);
  const checkScale = useSharedValue(0);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  React.useEffect(() => {
    // Pulse animation for idle state
    if (uploadState === 'idle') {
      const interval = setInterval(() => {
        pulseScale.value = withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        );
      }, 2000);
      return () => clearInterval(interval);
    }

    // Shimmer animation during processing
    if (uploadState === 'processing') {
      const shimmerInterval = setInterval(() => {
        shimmerX.value = withSequence(
          withTiming(width, { duration: 1500 }),
          withTiming(-width, { duration: 0 })
        );
      }, 2000);
      return () => clearInterval(shimmerInterval);
    }

    // Check animation for completion
    if (uploadState === 'complete') {
      checkScale.value = withSpring(1, { damping: 12 });
    }
  }, [uploadState]);

  const handleFileUpload = async () => {
    try {
      triggerHaptics();
      setUploadState('uploading');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadedFile(file);
        setUploadState('processing');
        
        // Simulate AI processing with progress
        simulateProcessing();
      } else {
        setUploadState('idle');
      }
    } catch (error) {
      setUploadState('error');
      onError('Failed to upload file. Please try again.');
    }
  };

  const simulateProcessing = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 20;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        progressWidth.value = withTiming(1, { duration: 500 });
        
        setTimeout(() => {
          setUploadState('complete');
          clearInterval(interval);
          onUploadComplete(uploadedFile);
        }, 1000);
      } else {
        setProgress(currentProgress);
        progressWidth.value = withTiming(currentProgress / 100, { duration: 300 });
      }
    }, 200);
  };

  const uploadTap = Gesture.Tap()
    .onStart(() => {
      if (uploadState === 'idle') {
        scale.value = withSpring(0.95);
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (uploadState === 'idle') {
        runOnJS(handleFileUpload)();
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { scale: pulseScale.value }
      ],
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value * 100}%`,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  const checkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkScale.value }],
    };
  });

  const getStateContent = () => {
    switch (uploadState) {
      case 'idle':
        return {
          icon: Upload,
          iconColor: '#667eea',
          title: 'Upload Your Resume',
          subtitle: 'Drop your PDF or DOC file to get started',
          showAction: true,
          actionText: 'Choose File',
        };
      
      case 'uploading':
        return {
          icon: Upload,
          iconColor: '#f093fb',
          title: 'Uploading...',
          subtitle: 'Preparing your resume for AI analysis',
          showAction: false,
        };
      
      case 'processing':
        return {
          icon: Brain,
          iconColor: '#4ecdc4',
          title: 'AI is Analyzing',
          subtitle: 'Creating your cinematic profile...',
          showAction: false,
          showProgress: true,
        };
      
      case 'complete':
        return {
          icon: CheckCircle,
          iconColor: '#4ecdc4',
          title: 'Analysis Complete!',
          subtitle: 'Your cinematic profile is ready',
          showAction: true,
          actionText: 'View Profile',
        };
      
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: '#ff6b6b',
          title: 'Upload Failed',
          subtitle: 'Please try again with a valid resume file',
          showAction: true,
          actionText: 'Try Again',
        };
      
      default:
        return {
          icon: Upload,
          iconColor: '#667eea',
          title: 'Upload Your Resume',
          subtitle: 'Drop your PDF or DOC file to get started',
          showAction: true,
          actionText: 'Choose File',
        };
    }
  };

  const content = getStateContent();
  const IconComponent = content.icon;

  return (
    <GestureDetector gesture={uploadTap}>
      <Animated.View style={[styles.container, cardStyle]}>
        <BlurView intensity={20} style={styles.blur}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                {uploadState === 'complete' ? (
                  <Animated.View style={checkStyle}>
                    <IconComponent color={content.iconColor} size={48} strokeWidth={2} />
                  </Animated.View>
                ) : (
                  <IconComponent color={content.iconColor} size={48} strokeWidth={2} />
                )}
              </View>

              {/* Title and Subtitle */}
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>

              {/* File Info */}
              {uploadedFile && (
                <View style={styles.fileInfo}>
                  <FileText color="#667eea" size={16} strokeWidth={2} />
                  <Text style={styles.fileName}>{uploadedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </Text>
                </View>
              )}

              {/* Progress Bar */}
              {content.showProgress && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View style={[styles.progressFill, progressStyle]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>
              )}

              {/* Action Button */}
              {content.showAction && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={uploadState === 'idle' || uploadState === 'error' ? handleFileUpload : undefined}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.actionButtonGradient}
                  >
                    <Text style={styles.actionButtonText}>{content.actionText}</Text>
                    <ArrowRight color="white" size={18} strokeWidth={2} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* AI Processing Indicators */}
              {uploadState === 'processing' && (
                <View style={styles.aiIndicators}>
                  <View style={styles.aiIndicator}>
                    <Sparkles color="#4ecdc4" size={16} strokeWidth={2} />
                    <Text style={styles.aiIndicatorText}>Extracting Experience</Text>
                  </View>
                  <View style={styles.aiIndicator}>
                    <Zap color="#f093fb" size={16} strokeWidth={2} />
                    <Text style={styles.aiIndicatorText}>Analyzing Skills</Text>
                  </View>
                  <View style={styles.aiIndicator}>
                    <Brain color="#667eea" size={16} strokeWidth={2} />
                    <Text style={styles.aiIndicatorText}>Generating Insights</Text>
                  </View>
                </View>
              )}

              {/* Shimmer Effect */}
              {uploadState === 'processing' && (
                <View style={styles.shimmerContainer}>
                  <Animated.View style={[styles.shimmer, shimmerStyle]}>
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0)'
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shimmerGradient}
                    />
                  </Animated.View>
                </View>
              )}
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  blur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ecdc4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginRight: 8,
  },
  aiIndicators: {
    marginTop: 24,
    alignItems: 'center',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  aiIndicatorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
  },
  shimmer: {
    width: 100,
    height: '100%',
  },
  shimmerGradient: {
    width: '100%',
    height: '100%',
  },
});