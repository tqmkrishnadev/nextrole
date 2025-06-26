import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react-native';

interface AIInsightCardProps {
  title: string;
  description: string;
  type: 'suggestion' | 'improvement' | 'achievement' | 'warning';
  priority: 'high' | 'medium' | 'low';
  onPress?: () => void;
  actionText?: string;
}

const insightConfig = {
  suggestion: {
    icon: Brain,
    color: '#667eea',
    gradient: ['rgba(102, 126, 234, 0.2)', 'rgba(102, 126, 234, 0.1)'],
  },
  improvement: {
    icon: TrendingUp,
    color: '#f093fb',
    gradient: ['rgba(240, 147, 251, 0.2)', 'rgba(240, 147, 251, 0.1)'],
  },
  achievement: {
    icon: CheckCircle,
    color: '#4ecdc4',
    gradient: ['rgba(78, 205, 196, 0.2)', 'rgba(78, 205, 196, 0.1)'],
  },
  warning: {
    icon: AlertCircle,
    color: '#ff6b6b',
    gradient: ['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)'],
  },
};

export default function AIInsightCard({
  title,
  description,
  type,
  priority,
  onPress,
  actionText = 'Learn More'
}: AIInsightCardProps) {
  const scale = useSharedValue(1);
  const shimmerX = useSharedValue(-200);
  const pulseScale = useSharedValue(1);
  const config = insightConfig[type];
  const IconComponent = config.icon;

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  React.useEffect(() => {
    // Shimmer effect for AI presence
    const shimmerAnimation = () => {
      shimmerX.value = withSequence(
        withTiming(300, { duration: 2000 }),
        withTiming(-200, { duration: 0 })
      );
    };

    // Pulse for high priority items
    if (priority === 'high') {
      const pulseAnimation = () => {
        pulseScale.value = withSequence(
          withTiming(1.02, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        );
      };
      
      const pulseInterval = setInterval(pulseAnimation, 3000);
      return () => clearInterval(pulseInterval);
    }

    const shimmerInterval = setInterval(shimmerAnimation, 4000);
    return () => clearInterval(shimmerInterval);
  }, [priority]);

  const cardTap = Gesture.Tap()
    .onStart(() => {
      triggerHaptics();
      scale.value = withSpring(0.98);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (onPress) {
        onPress();
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

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  const getPriorityIndicator = () => {
    switch (priority) {
      case 'high':
        return <View style={[styles.priorityDot, { backgroundColor: '#ff6b6b' }]} />;
      case 'medium':
        return <View style={[styles.priorityDot, { backgroundColor: '#feca57' }]} />;
      case 'low':
        return <View style={[styles.priorityDot, { backgroundColor: '#4ecdc4' }]} />;
      default:
        return null;
    }
  };

  return (
    <GestureDetector gesture={cardTap}>
      <Animated.View style={[styles.container, cardStyle]}>
        <BlurView intensity={20} style={styles.blur}>
          <LinearGradient
            colors={config.gradient}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconBackground, { backgroundColor: `${config.color}20` }]}>
                    <IconComponent color={config.color} size={20} strokeWidth={2} />
                  </View>
                  {getPriorityIndicator()}
                </View>
                
                <View style={styles.aiIndicator}>
                  <Sparkles color={config.color} size={16} strokeWidth={2} />
                  <Text style={[styles.aiText, { color: config.color }]}>AI</Text>
                </View>
              </View>

              {/* Content */}
              <View style={styles.textContent}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>

              {/* Action */}
              {onPress && (
                <TouchableOpacity style={styles.actionButton} onPress={onPress}>
                  <Text style={[styles.actionText, { color: config.color }]}>
                    {actionText}
                  </Text>
                  <ArrowRight color={config.color} size={16} strokeWidth={2} />
                </TouchableOpacity>
              )}

              {/* Shimmer overlay for AI effect */}
              <View style={styles.shimmerContainer}>
                <Animated.View style={[styles.shimmer, shimmerStyle]}>
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0)',
                      'rgba(255,255,255,0.1)',
                      'rgba(255,255,255,0)'
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  blur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.8)',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  textContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginRight: 6,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
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