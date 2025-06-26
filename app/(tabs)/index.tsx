import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
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
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TrendingUp, Target, Zap, Award, Eye, Calendar, ArrowRight, Briefcase, Users, Star, Brain, ChartBar as BarChart3, Mic, LogOut } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { AuthGuard } from '@/components/AuthGuard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function DashboardContent() {
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const { signOut } = useAuth();
  const { dashboardData, loading, error, refreshData, aiInsights } = useDashboard();
  
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const cardsOpacity = useSharedValue(0);
  const cardsTranslateY = useSharedValue(30);

  React.useEffect(() => {
    if (!loading && dashboardData) {
      headerOpacity.value = withTiming(1, { duration: 800 });
      headerTranslateY.value = withSpring(0, { damping: 15 });
      
      setTimeout(() => {
        cardsOpacity.value = withTiming(1, { duration: 800 });
        cardsTranslateY.value = withSpring(0, { damping: 15 });
      }, 200);
    }
  }, [loading, dashboardData]);

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      transform: [{ translateY: headerTranslateY.value }],
    };
  });

  const cardsStyle = useAnimatedStyle(() => {
    return {
      opacity: cardsOpacity.value,
      transform: [{ translateY: cardsTranslateY.value }],
    };
  });

  const handleSignOut = async () => {
    await signOut();
  };

  const StatsCard = ({ title, value, change, icon: Icon, color, delay = 0 }) => {
    const scale = useSharedValue(1);
    const cardOpacity = useSharedValue(0);

    React.useEffect(() => {
      if (!loading && dashboardData) {
        setTimeout(() => {
          cardOpacity.value = withTiming(1, { duration: 600 });
        }, delay);
      }
    }, [delay, loading, dashboardData]);

    const cardTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: cardOpacity.value,
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <GestureDetector gesture={cardTap}>
        <Animated.View style={[styles.statsCard, animatedStyle]}>
          <BlurView intensity={20} style={styles.statsCardBlur}>
            <LinearGradient
              colors={[`${color}20`, `${color}10`]}
              style={styles.statsCardGradient}
            >
              <View style={styles.statsCardContent}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}>
                    <Icon color={color} size={20} strokeWidth={2} />
                  </View>
                  <Text style={styles.statsChange}>
                    {change > 0 ? '+' : ''}{change}%
                  </Text>
                </View>
                <Text style={styles.statsValue}>{value}</Text>
                <Text style={styles.statsTitle}>{title}</Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    );
  };

  const ActionCard = ({ title, subtitle, icon: Icon, color, onPress }) => {
    const scale = useSharedValue(1);

    const cardTap = Gesture.Tap()
      .onStart(() => {
        scale.value = withSpring(0.95);
      })
      .onEnd(() => {
        scale.value = withSpring(1);
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    return (
      <GestureDetector gesture={cardTap}>
        <Animated.View style={[styles.actionCard, animatedStyle]}>
          <TouchableOpacity onPress={onPress} style={styles.actionCardInner}>
            <BlurView intensity={20} style={styles.actionCardBlur}>
              <LinearGradient
                colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionCardContent}>
                  <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
                    <Icon color={color} size={24} strokeWidth={2} />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>{title}</Text>
                    <Text style={styles.actionSubtitle}>{subtitle}</Text>
                  </View>
                  <ArrowRight color="rgba(255, 255, 255, 0.6)" size={20} />
                </View>
              </LinearGradient>
            </BlurView>
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
            <Text style={styles.loadingText}>Loading Dashboard...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#16213e']}
          style={styles.gradient}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Failed to load dashboard'}</Text>
            <TouchableOpacity onPress={refreshData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const { user, stats } = dashboardData;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshData}
              tintColor="white"
              colors={['#667eea']}
            />
          }
        >
          {/* Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.userName}>{user.name}</Text>
              </View>
              <View style={styles.headerActions}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.avatar}
                  >
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.avatarImage}
                    />
                  </LinearGradient>
                </View>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                  <LogOut color="rgba(255, 255, 255, 0.7)" size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.atsScore}</Text>
                <Text style={styles.headerStatLabel}>ATS Score</Text>
              </View>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.profileViews}</Text>
                <Text style={styles.headerStatLabel}>Profile Views</Text>
              </View>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatValue}>{stats.interviews}</Text>
                <Text style={styles.headerStatLabel}>Interviews</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View style={[styles.statsSection, cardsStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.periodSelector}>
                {['Week', 'Month'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatsCard
                title="Profile Views"
                value={stats.profileViews.toString()}
                change={stats.profileViewsChange}
                icon={Eye}
                color="#667eea"
                delay={0}
              />
              <StatsCard
                title="Applications"
                value={stats.applications.toString()}
                change={stats.applicationsChange}
                icon={Briefcase}
                color="#f093fb"
                delay={100}
              />
              <StatsCard
                title="Responses"
                value={stats.responses.toString()}
                change={stats.responsesChange}
                icon={Users}
                color="#4ecdc4"
                delay={200}
              />
              <StatsCard
                title="Interviews"
                value={stats.interviews.toString()}
                change={stats.interviewsChange}
                icon={Calendar}
                color="#45b7d1"
                delay={300}
              />
            </View>
          </Animated.View>

          {/* AI Insights */}
          <Animated.View style={[styles.insightsSection, cardsStyle]}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            
            {aiInsights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <BlurView intensity={20} style={styles.insightBlur}>
                  <LinearGradient
                    colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                    style={styles.insightGradient}
                  >
                    <View style={styles.insightContent}>
                      <View style={styles.insightHeader}>
                        <Brain color="#667eea" size={24} strokeWidth={2} />
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                      </View>
                      <Text style={styles.insightText}>
                        {insight.description}
                      </Text>
                      <TouchableOpacity style={styles.insightButton}>
                        <Text style={styles.insightButtonText}>View Suggestions</Text>
                        <ArrowRight color="#667eea" size={16} />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </BlurView>
              </View>
            ))}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.actionsSection, cardsStyle]}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <ActionCard
              title="Practice Interview"
              subtitle="AI-powered mock interviews"
              icon={Mic}
              color="#f093fb"
              onPress={() => {}}
            />
            
            <ActionCard
              title="Optimize Resume"
              subtitle="AI suggestions for improvement"
              icon={Target}
              color="#667eea"
              onPress={() => {}}
            />
            
            <ActionCard
              title="View Analytics"
              subtitle="Detailed performance metrics"
              icon={BarChart3}
              color="#4ecdc4"
              onPress={() => {}}
            />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

export default function DashboardScreen() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    borderRadius: 24,
    padding: 2,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  signOutButton: {
    padding: 8,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
  },
  headerStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  statsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsCardContent: {
    padding: 20,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsChange: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4ecdc4',
  },
  statsValue: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'white',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  insightsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  insightCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 16,
  },
  insightBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  insightGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightContent: {
    padding: 24,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginLeft: 12,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 20,
  },
  insightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  insightButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
    marginRight: 8,
  },
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardInner: {
    borderRadius: 16,
  },
  actionCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});