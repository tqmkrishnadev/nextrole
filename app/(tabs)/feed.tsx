import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  FlatList,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Verified
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height - 200;

const feedData = [
  {
    id: '1',
    author: 'Emily Rodriguez',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    verified: true,
    title: 'AI Resume Optimization',
    description: 'How I increased my interview callbacks by 300% using AI to optimize my resume. Here are the top 5 strategies that worked.',
    video: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    likes: 1247,
    comments: 89,
    shares: 156,
    duration: '2:34',
    tags: ['AI', 'Resume', 'Career Tips']
  },
  {
    id: '2',
    author: 'Marcus Chen',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    verified: true,
    title: 'Mock Interview Mastery',
    description: 'The #1 mistake people make in interviews and how to avoid it. Plus my secret technique for handling tough questions.',
    video: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    likes: 892,
    comments: 67,
    shares: 134,
    duration: '1:47',
    tags: ['Interview', 'Skills', 'Confidence']
  },
  {
    id: '3',
    author: 'Sarah Johnson',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    verified: false,
    title: 'LinkedIn Profile Glow-Up',
    description: 'Transformed my LinkedIn profile and got 10x more recruiter messages. Here\'s exactly what I changed.',
    video: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800&h=1200&fit=crop',
    likes: 1534,
    comments: 203,
    shares: 287,
    duration: '3:12',
    tags: ['LinkedIn', 'Profile', 'Networking']
  },
];

export default function FeedScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set());
  
  const flatListRef = useRef(null);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLike = (postId) => {
    triggerHaptics();
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBookmark = (postId) => {
    triggerHaptics();
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const FeedItem = ({ item, index }) => {
    const scale = useSharedValue(1);
    const heartScale = useSharedValue(1);
    const bookmarkScale = useSharedValue(1);
    
    const isLiked = likedPosts.has(item.id);
    const isBookmarked = bookmarkedPosts.has(item.id);

    const likeGesture = Gesture.Tap()
      .numberOfTaps(2)
      .onStart(() => {
        triggerHaptics();
        heartScale.value = withSpring(1.2, { damping: 10 });
        if (!isLiked) {
          runOnJS(handleLike)(item.id);
        }
      })
      .onEnd(() => {
        heartScale.value = withSpring(1);
      });

    const heartStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: heartScale.value }],
      };
    });

    const bookmarkStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: bookmarkScale.value }],
      };
    });

    return (
      <GestureDetector gesture={likeGesture}>
        <View style={styles.feedItem}>
          <Image source={{ uri: item.video }} style={styles.backgroundVideo} />
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
          />

          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              <Text style={styles.topBarText}>For You</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <MoreHorizontal color="white" size={24} />
            </TouchableOpacity>
          </View>

          {/* Author Info */}
          <View style={styles.authorInfo}>
            <Image source={{ uri: item.avatar }} style={styles.authorAvatar} />
            <View style={styles.authorDetails}>
              <View style={styles.authorName}>
                <Text style={styles.authorNameText}>{item.author}</Text>
                {item.verified && (
                  <Verified color="#667eea" size={16} fill="#667eea" />
                )}
              </View>
              <Text style={styles.authorTitle}>Career Coach & AI Expert</Text>
            </View>
          </View>

          {/* Content Info */}
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle}>{item.title}</Text>
            <Text style={styles.contentDescription}>{item.description}</Text>
            
            <View style={styles.tags}>
              {item.tags.map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Side Actions */}
          <View style={styles.sideActions}>
            <TouchableOpacity 
              style={styles.sideAction}
              onPress={() => handleLike(item.id)}
            >
              <Animated.View style={heartStyle}>
                <Heart 
                  color={isLiked ? "#ff6b6b" : "white"} 
                  size={28} 
                  fill={isLiked ? "#ff6b6b" : "transparent"}
                  strokeWidth={2}
                />
              </Animated.View>
              <Text style={styles.sideActionText}>
                {item.likes + (isLiked ? 1 : 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideAction}>
              <MessageCircle color="white" size={28} strokeWidth={2} />
              <Text style={styles.sideActionText}>{item.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sideAction}
              onPress={() => handleBookmark(item.id)}
            >
              <Animated.View style={bookmarkStyle}>
                <Bookmark 
                  color={isBookmarked ? "#667eea" : "white"} 
                  size={28} 
                  fill={isBookmarked ? "#667eea" : "transparent"}
                  strokeWidth={2}
                />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideAction}>
              <Share color="white" size={28} strokeWidth={2} />
              <Text style={styles.sideActionText}>{item.shares}</Text>
            </TouchableOpacity>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <BlurView intensity={20} style={styles.playButtonBlur}>
              {isPlaying ? (
                <Pause color="white" size={24} />
              ) : (
                <Play color="white" size={24} />
              )}
            </BlurView>
          </TouchableOpacity>

          {/* Volume Button */}
          <TouchableOpacity 
            style={styles.volumeButton}
            onPress={() => setIsMuted(!isMuted)}
          >
            <BlurView intensity={20} style={styles.volumeButtonBlur}>
              {isMuted ? (
                <VolumeX color="white" size={20} />
              ) : (
                <Volume2 color="white" size={20} />
              )}
            </BlurView>
          </TouchableOpacity>

          {/* Duration */}
          <View style={styles.duration}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
      </GestureDetector>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={feedData}
        renderItem={({ item, index }) => <FeedItem item={item} index={index} />}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / CARD_HEIGHT);
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: CARD_HEIGHT,
          offset: CARD_HEIGHT * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  feedItem: {
    height: CARD_HEIGHT,
    position: 'relative',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topLeft: {
    flex: 1,
  },
  topBarText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    textAlign: 'center',
  },
  moreButton: {
    padding: 8,
  },
  authorInfo: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorNameText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginRight: 6,
  },
  authorTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentInfo: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 80,
    zIndex: 10,
  },
  contentTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'white',
  },
  sideActions: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
    zIndex: 10,
  },
  sideAction: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sideActionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginTop: 4,
  },
  playButton: {
    position: 'absolute',
    right: 20,
    top: 120,
    zIndex: 10,
  },
  playButtonBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  volumeButton: {
    position: 'absolute',
    right: 20,
    top: 180,
    zIndex: 10,
  },
  volumeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  duration: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});