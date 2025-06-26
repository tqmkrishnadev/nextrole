import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeHaptics } from '@/hooks/useSafeHaptics';
import { safeAsyncHandler } from '@/utils/safeAsyncHandler';

interface SafeButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  hapticFeedback?: boolean;
  icon?: React.ReactNode;
}

export const SafeButton: React.FC<SafeButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  hapticFeedback = true,
  icon
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const { triggerHaptics } = useSafeHaptics();

  const handlePress = async () => {
    if (disabled || loading) return;

    setIsPressed(true);
    
    if (hapticFeedback) {
      triggerHaptics('light');
    }

    await safeAsyncHandler(
      async () => {
        await onPress();
      },
      {
        action: `button_press_${title}`,
        showError: true,
        fallback: () => {
          console.warn(`Button press failed for: ${title}`);
        }
      }
    );

    setIsPressed(false);
  };

  const gesture = Gesture.Tap()
    .onStart(() => {
      if (!disabled && !loading) {
        scale.value = withSpring(0.95);
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (!disabled && !loading) {
        runOnJS(handlePress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const getButtonStyle = () => {
    const baseStyle = [styles.button, style];
    
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, textStyle];
    
    if (variant === 'secondary') {
      baseStyle.push(styles.secondaryText);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outlineText);
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  const renderButton = () => {
    if (variant === 'primary') {
      return (
        <LinearGradient
          colors={disabled || loading ? ['#666', '#555'] : ['#667eea', '#764ba2']}
          style={[styles.gradient, style]}
        >
          <Text style={getTextStyle()}>
            {loading ? 'Loading...' : title}
          </Text>
          {icon && !loading && icon}
        </LinearGradient>
      );
    }

    return (
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <Text style={getTextStyle()}>
          {loading ? 'Loading...' : title}
        </Text>
        {icon && !loading && icon}
      </TouchableOpacity>
    );
  };

  if (variant === 'primary') {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {renderButton()}
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        {renderButton()}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    textAlign: 'center',
  },
  secondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  outlineText: {
    color: '#667eea',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});