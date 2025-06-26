import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { User, Mail, Phone, MapPin, Calendar, Award, Code, Briefcase, GraduationCap, Star, Download, Share, CreditCard as Edit, Eye, TrendingUp, Zap, Brain, ChevronRight, Globe, Linkedin, Github, ExternalLink } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

// Mock profile data - in a real app, this would come from the database
const mockProfileData = {
  title: 'Senior Product Manager',
  company: 'TechCorp Inc.',
  location: 'San Francisco, CA',
  phone: '+1 (555) 123-4567',
  bio: 'Passionate product manager with 8+ years of experience building user-centric digital products. Led cross-functional teams to launch 15+ successful products with $50M+ revenue impact.',
  skills: [
    { name: 'Product Strategy', level: 95, color: '#667eea' },
    { name: 'User Research', level: 88, color: '#f093fb' },
    { name: 'Data Analysis', level: 92, color: '#4ecdc4' },
    { name: 'Agile/Scrum', level: 90, color: '#45b7d1' },
    { name: 'Roadmapping', level: 85, color: '#96ceb4' },
    { name: 'A/B Testing', level: 87, color: '#feca57' },
  ],
  experience: [
    {
      title: 'Senior Product Manager',
      company: 'TechCorp Inc.',
      period: '2021 - Present',
      description: 'Leading product strategy for B2B SaaS platform serving 100K+ users',
      achievements: ['Increased user engagement by 45%', 'Launched 3 major product features', 'Managed $2M product budget']
    },
    {
      title: 'Product Manager',
      company: 'StartupXYZ',
      period: '2019 - 2021',
      description: 'Built and scaled mobile-first product from 0 to 50K users',
      achievements: ['Led product-market fit validation', 'Designed user onboarding flow', 'Grew monthly revenue to $500K']
    },
    {
      title: 'Associate Product Manager',
      company: 'BigTech Corp',
      period: '2017 - 2019',
      description: 'Managed feature development for consumer-facing web application',
      achievements: ['Shipped 12 product features', 'Reduced customer churn by 20%', 'Collaborated with 5 engineering teams']
    }
  ],
  education: [
    {
      degree: 'MBA',
      school: 'Stanford Graduate School of Business',
      year: '2017',
      gpa: '3.8'
    },
    {
      degree: 'BS Computer Science',
      school: 'UC Berkeley',
      year: '2015',
      gpa: '3.7'
    }
  ],
  certifications: [
    'Certified Scrum Product Owner (CSPO)',
    'Google Analytics Certified',
    'AWS Cloud Practitioner'
  ],
  social: {
    linkedin: 'sarah-johnson-pm',
    github: 'sarahjohnson',
    website: 'sarahjohnson.dev'
  }
};

export default function ProfileScreen() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { user, profile, loading: authLoading } = useAuth();
  const { dashboardData, loading: dashboardLoading, refreshData } = useDashboard();
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const skillsAnimation = useSharedValue(0);

  const loading = authLoading || dashboardLoading;

  React.useEffect(() => {
    // Animate skills on mount
    skillsAnimation.value = withTiming(1, { duration: 1500 });
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Parallax effect for header
      const opacity = interpolate(
        scrollY.value,
        [0, HEADER_HEIGHT * 0.7],
        [1, 0],
        Extrapolate.CLAMP
      );
      headerOpacity.value = opacity;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [0, -HEADER_HEIGHT * 0.3],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }],
      opacity: headerOpacity.value,
    };
  });

  const SkillBar = ({ skill, index }) => {
    const progress = useSharedValue(0);
    const scale = useSharedValue(1);

    React.useEffect(() => {
      setTimeout(() => {
        progress.value = withTiming(skill.level / 100, { duration: 1000 });
      }, index * 100);
    }, []);

    const progressStyle = useAnimatedStyle(() => {
      return {
        width: `${progress.value * 100}%`,
      };
    });

    const skillTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
      });

    const skillStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <GestureDetector gesture={skillTap}>
        <Animated.View style={[styles.skillItem, skillStyle]}>
          <View style={styles.skillHeader}>
            <Text style={styles.skillName}>{skill.name}</Text>
            <Text style={styles.skillLevel}>{skill.level}%</Text>
          </View>
          <View style={styles.skillBarContainer}>
            <Animated.View 
              style={[
                styles.skillBar, 
                { backgroundColor: skill.color },
                progressStyle
              ]} 
            />
          </View>
        </Animated.View>
      </GestureDetector>
    );
  };

  const ExperienceCard = ({ experience, index }) => {
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(30);

    React.useEffect(() => {
      setTimeout(() => {
        cardOpacity.value = withTiming(1, { duration: 600 });
        cardTranslateY.value = withSpring(0, { damping: 15 });
      }, index * 200);
    }, []);

    const cardStyle = useAnimatedStyle(() => {
      return {
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }],
      };
    });

    return (
      <Animated.View style={[styles.experienceCard, cardStyle]}>
        <BlurView intensity={20} style={styles.experienceCardBlur}>
          <LinearGradient
            colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
            style={styles.experienceCardGradient}
          >
            <View style={styles.experienceCardContent}>
              <View style={styles.experienceHeader}>
                <View style={styles.experienceIcon}>
                  <Briefcase color="#667eea" size={20} strokeWidth={2} />
                </View>
                <View style={styles.experienceInfo}>
                  <Text style={styles.experienceTitle}>{experience.title}</Text>
                  <Text style={styles.experienceCompany}>{experience.company}</Text>
                  <Text style={styles.experiencePeriod}>{experience.period}</Text>
                </View>
              </View>
              
              <Text style={styles.experienceDescription}>
                {experience.description}
              </Text>
              
              <View style={styles.achievements}>
                {experience.achievements.map((achievement, idx) => (
                  <View key={idx} style={styles.achievementItem}>
                    <Star color="#f093fb" size={12} strokeWidth={2} />
                    <Text style={styles.achievementText}>{achievement}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  const TabButton = ({ title, isActive, onPress }) => {
    const scale = useSharedValue(1);

    const tabTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
        runOnJS(onPress)();
      });

    const tabStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <GestureDetector gesture={tabTap}>
        <Animated.View style={[styles.tabButton, isActive && styles.tabButtonActive, tabStyle]}>
          <TouchableOpacity onPress={onPress}>
            <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
              {title}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                style={styles.logoGradient}
              >
                <Brain color="white" size={32} strokeWidth={2} />
              </LinearGradient>
            </View>
            <Text style={styles.loadingText}>Loading Profile...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Get user data from dashboard or fallback to auth
  const userData = dashboardData?.user || {
    name: profile?.name || user?.email?.split('@')[0] || 'User',
    email: profile?.email || user?.email || '',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
  };

  const stats = dashboardData?.stats || {
    atsScore: 85,
    profileViews: 247,
    connections: 1234
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Eye color="#667eea" size={24} strokeWidth={2} />
                <Text style={styles.statValue}>{stats.profileViews}</Text>
                <Text style={styles.statLabel}>Profile Views</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp color="#f093fb" size={24} strokeWidth={2} />
                <Text style={styles.statValue}>{stats.atsScore}</Text>
                <Text style={styles.statLabel}>ATS Score</Text>
              </View>
              <View style={styles.statCard}>
                <User color="#4ecdc4" size={24} strokeWidth={2} />
                <Text style={styles.statValue}>{stats.connections || 1234}</Text>
                <Text style={styles.statLabel}>Connections</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{mockProfileData.bio}</Text>
            </View>

            {/* Skills */}
            <View style={styles.skillsSection}>
              <Text style={styles.sectionTitle}>Skills</Text>
              {mockProfileData.skills.map((skill, index) => (
                <SkillBar key={skill.name} skill={skill} index={index} />
              ))}
            </View>
          </View>
        );
      
      case 'experience':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {mockProfileData.experience.map((exp, index) => (
              <ExperienceCard key={index} experience={exp} index={index} />
            ))}
          </View>
        );
      
      case 'education':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Education</Text>
            {mockProfileData.education.map((edu, index) => (
              <View key={index} style={styles.educationCard}>
                <BlurView intensity={20} style={styles.educationCardBlur}>
                  <View style={styles.educationCardContent}>
                    <GraduationCap color="#667eea" size={24} strokeWidth={2} />
                    <View style={styles.educationInfo}>
                      <Text style={styles.educationDegree}>{edu.degree}</Text>
                      <Text style={styles.educationSchool}>{edu.school}</Text>
                      <Text style={styles.educationYear}>{edu.year} • GPA: {edu.gpa}</Text>
                    </View>
                  </View>
                </BlurView>
              </View>
            ))}
            
            <Text style={styles.sectionTitle}>Certifications</Text>
            {mockProfileData.certifications.map((cert, index) => (
              <View key={index} style={styles.certificationCard}>
                <Award color="#f093fb" size={20} strokeWidth={2} />
                <Text style={styles.certificationText}>{cert}</Text>
              </View>
            ))}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop' }} 
            style={styles.coverImage} 
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.headerGradient}
          />
          
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              <View style={styles.avatarBorder} />
            </View>
            
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{userData.name}</Text>
              <Text style={styles.title}>{mockProfileData.title}</Text>
              <Text style={styles.company}>{mockProfileData.company}</Text>
              
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MapPin color="rgba(255, 255, 255, 0.8)" size={16} />
                  <Text style={styles.contactText}>{mockProfileData.location}</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.primaryButtonGradient}
              >
                <Edit color="white" size={18} strokeWidth={2} />
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Share color="rgba(255, 255, 255, 0.8)" size={18} strokeWidth={2} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Download color="rgba(255, 255, 255, 0.8)" size={18} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <BlurView intensity={20} style={styles.tabsBlur}>
            <View style={styles.tabs}>
              <TabButton 
                title="Overview" 
                isActive={selectedTab === 'overview'} 
                onPress={() => setSelectedTab('overview')} 
              />
              <TabButton 
                title="Experience" 
                isActive={selectedTab === 'experience'} 
                onPress={() => setSelectedTab('experience')} 
              />
              <TabButton 
                title="Education" 
                isActive={selectedTab === 'education'} 
                onPress={() => setSelectedTab('education')} 
              />
            </View>
          </BlurView>
        </View>

        {/* Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshData}
              tintColor="white"
              colors={['#667eea']}
            />
          }
        >
          <View style={styles.spacer} />
          {renderContent()}
          
          {/* Social Links */}
          <View style={styles.socialSection}>
            <Text style={styles.sectionTitle}>Connect</Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity style={styles.socialLink}>
                <Linkedin color="#0077b5" size={24} strokeWidth={2} />
                <Text style={styles.socialText}>LinkedIn</Text>
                <ExternalLink color="rgba(255, 255, 255, 0.6)" size={16} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialLink}>
                <Github color="#333" size={24} strokeWidth={2} />
                <Text style={styles.socialText}>GitHub</Text>
                <ExternalLink color="rgba(255, 255, 255, 0.6)" size={16} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialLink}>
                <Globe color="#667eea" size={24} strokeWidth={2} />
                <Text style={styles.socialText}>Website</Text>
                <ExternalLink color="rgba(255, 255, 255, 0.6)" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: 'white',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  company: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginTop: -16,
    zIndex: 10,
  },
  tabsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabs: {
    flexDirection: 'row',
    padding: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  spacer: {
    height: 20,
  },
  tabContent: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 20,
    marginTop: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  bioSection: {
    marginTop: 16,
  },
  bioText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  skillsSection: {
    marginTop: 16,
  },
  skillItem: {
    marginBottom: 20,
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
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillBar: {
    height: '100%',
    borderRadius: 3,
  },
  experienceCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  experienceCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  experienceCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  experienceCardContent: {
    padding: 20,
  },
  experienceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  experienceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  experienceInfo: {
    flex: 1,
  },
  experienceTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  experienceCompany: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  experiencePeriod: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  experienceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  achievements: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    flex: 1,
  },
  educationCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  educationCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  educationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  educationInfo: {
    flex: 1,
    marginLeft: 16,
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
  certificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  certificationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },
  socialSection: {
    paddingHorizontal: 24,
  },
  socialLinks: {
    marginTop: 16,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },
});