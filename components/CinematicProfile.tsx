import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { 
  Star, 
  TrendingUp, 
  Award, 
  Eye,
  Briefcase,
  GraduationCap,
  MapPin,
  Calendar
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface CinematicProfileProps {
  profileData: {
    name: string;
    title: string;
    company: string;
    location: string;
    avatar: string;
    atsScore: number;
    profileViews: number;
    experience: Array<{
      title: string;
      company: string;
      period: string;
      description: string;
    }>;
    skills: Array<{
      name: string;
      level: number;
      color: string;
    }>;
    education: Array<{
      degree: string;
      school: string;
      year: string;
    }>;
  };
}

export default function CinematicProfile({ profileData }: CinematicProfileProps) {
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(50);
  const skillsProgress = useSharedValue(0);

  React.useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 1000 });
    slideUp.value = withSpring(0, { damping: 15 });
    
    setTimeout(() => {
      skillsProgress.value = withTiming(1, { duration: 1500 });
    }, 500);
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeIn.value,
      transform: [{ translateY: slideUp.value }],
    };
  });

  const SkillVisualization = ({ skill, index }) => {
    const progress = useSharedValue(0);
    
    React.useEffect(() => {
      setTimeout(() => {
        progress.value = withTiming(skill.level / 100, { duration: 1000 });
      }, index * 150);
    }, []);

    const progressStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        progress.value,
        [0, 1],
        [0.8, 1],
        Extrapolate.CLAMP
      );
      
      return {
        transform: [{ scale }],
        opacity: progress.value,
      };
    });

    const barStyle = useAnimatedStyle(() => {
      return {
        width: `${progress.value * 100}%`,
      };
    });

    return (
      <Animated.View style={[styles.skillItem, progressStyle]}>
        <View style={styles.skillHeader}>
          <Text style={styles.skillName}>{skill.name}</Text>
          <Text style={styles.skillLevel}>{skill.level}%</Text>
        </View>
        <View style={styles.skillBarContainer}>
          <Animated.View 
            style={[
              styles.skillBar, 
              { backgroundColor: skill.color },
              barStyle
            ]} 
          />
        </View>
      </Animated.View>
    );
  };

  const TimelineItem = ({ item, index, isLast = false }) => {
    const itemOpacity = useSharedValue(0);
    const itemTranslateX = useSharedValue(30);

    React.useEffect(() => {
      setTimeout(() => {
        itemOpacity.value = withTiming(1, { duration: 600 });
        itemTranslateX.value = withSpring(0, { damping: 15 });
      }, index * 200);
    }, []);

    const itemStyle = useAnimatedStyle(() => {
      return {
        opacity: itemOpacity.value,
        transform: [{ translateX: itemTranslateX.value }],
      };
    });

    return (
      <Animated.View style={[styles.timelineItem, itemStyle]}>
        <View style={styles.timelineIndicator}>
          <View style={styles.timelineDot} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.timelineContent}>
          <BlurView intensity={20} style={styles.timelineCard}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
              style={styles.timelineCardGradient}
            >
              <View style={styles.timelineCardContent}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineCompany}>{item.company}</Text>
                <Text style={styles.timelinePeriod}>{item.period}</Text>
                <Text style={styles.timelineDescription}>{item.description}</Text>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <BlurView intensity={30} style={styles.heroBlur}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.avatarBorder}
                />
              </View>
              
              <Text style={styles.heroName}>{profileData.name}</Text>
              <Text style={styles.heroTitle}>{profileData.title}</Text>
              <Text style={styles.heroCompany}>{profileData.company}</Text>
              
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <TrendingUp color="#4ecdc4" size={20} strokeWidth={2} />
                  <Text style={styles.heroStatValue}>{profileData.atsScore}</Text>
                  <Text style={styles.heroStatLabel}>ATS Score</Text>
                </View>
                <View style={styles.heroStat}>
                  <Eye color="#f093fb" size={20} strokeWidth={2} />
                  <Text style={styles.heroStatValue}>{profileData.profileViews}</Text>
                  <Text style={styles.heroStatLabel}>Profile Views</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </View>

      {/* Skills Cloud */}
      <View style={styles.skillsSection}>
        <Text style={styles.sectionTitle}>Skills Mastery</Text>
        <View style={styles.skillsGrid}>
          {profileData.skills.map((skill, index) => (
            <SkillVisualization key={skill.name} skill={skill} index={index} />
          ))}
        </View>
      </View>

      {/* Experience Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Career Journey</Text>
        <View style={styles.timeline}>
          {profileData.experience.map((exp, index) => (
            <TimelineItem 
              key={index} 
              item={exp} 
              index={index}
              isLast={index === profileData.experience.length - 1}
            />
          ))}
        </View>
      </View>

      {/* Education Cards */}
      <View style={styles.educationSection}>
        <Text style={styles.sectionTitle}>Education</Text>
        {profileData.education.map((edu, index) => (
          <View key={index} style={styles.educationCard}>
            <BlurView intensity={20} style={styles.educationBlur}>
              <View style={styles.educationContent}>
                <GraduationCap color="#667eea" size={24} strokeWidth={2} />
                <View style={styles.educationInfo}>
                  <Text style={styles.educationDegree}>{edu.degree}</Text>
                  <Text style={styles.educationSchool}>{edu.school}</Text>
                  <Text style={styles.educationYear}>{edu.year}</Text>
                </View>
              </View>
            </BlurView>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroSection: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    padding: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
    padding: 4,
  },
  heroName: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroCompany: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 20,
  },
  skillsSection: {
    marginBottom: 32,
  },
  skillsGrid: {
    gap: 16,
  },
  skillItem: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  skillLevel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  skillBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBar: {
    height: '100%',
    borderRadius: 4,
  },
  timelineSection: {
    marginBottom: 32,
  },
  timeline: {
    paddingLeft: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#667eea',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  timelineCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineCardContent: {
    padding: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  timelineCompany: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  timelinePeriod: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },
  timelineDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  educationSection: {
    marginBottom: 32,
  },
  educationCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  educationBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  educationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  educationInfo: {
    marginLeft: 16,
    flex: 1,
  },
  educationDegree: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  educationSchool: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  educationYear: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});