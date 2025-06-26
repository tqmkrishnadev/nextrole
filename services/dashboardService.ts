import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  atsScore: number;
  profileViews: number;
  interviews: number;
  applications: number;
  responses: number;
  profileViewsChange: number;
  applicationsChange: number;
  responsesChange: number;
  interviewsChange: number;
}

export interface UserDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  stats: DashboardStats;
}

class DashboardService {
  private static instance: DashboardService;

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getUserDashboardData(userId: string): Promise<UserDashboardData | null> {
    try {
      console.log('Fetching dashboard data for user:', userId);
      
      // Fetch user profile with better error handling
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        
        // Try to fetch by email if ID lookup fails
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profileByEmail, error: emailError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('email', user.email)
            .single();
          
          if (emailError) {
            console.error('Error fetching profile by email:', emailError);
            return null;
          }
          
          // Use the profile found by email
          if (profileByEmail) {
            console.log('Found profile by email:', profileByEmail);
            return this.buildDashboardData(profileByEmail, []);
          }
        }
        return null;
      }

      console.log('Profile found:', profile);

      // Fetch user resumes to calculate stats
      const { data: resumes, error: resumesError } = await supabase
        .from('resumes')
        .select('*')
        .eq('userId', userId);

      if (resumesError) {
        console.error('Error fetching resumes:', resumesError);
      }

      console.log('Resumes found:', resumes?.length || 0);

      return this.buildDashboardData(profile, resumes || []);
    } catch (error) {
      console.error('Error in getUserDashboardData:', error);
      return null;
    }
  }

  private buildDashboardData(profile: any, resumes: any[]): UserDashboardData {
    // Calculate dashboard stats
    const stats = this.calculateDashboardStats(resumes);

    return {
      user: {
        id: profile.id,
        name: profile.name || this.extractNameFromEmail(profile.email),
        email: profile.email,
        avatar: this.generateAvatarUrl(profile.name || profile.email)
      },
      stats
    };
  }

  private extractNameFromEmail(email: string): string {
    // Extract name from email (e.g., john.doe@example.com -> John Doe)
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._-]/);
    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private calculateDashboardStats(resumes: any[]): DashboardStats {
    // Base stats - in a real app, these would come from various tables
    const baseStats = {
      atsScore: 85,
      profileViews: 247,
      interviews: 5,
      applications: 12,
      responses: 4
    };

    // Calculate changes (mock data for demo)
    const changes = {
      profileViewsChange: 12,
      applicationsChange: 8,
      responsesChange: -3,
      interviewsChange: 25
    };

    // If user has resumes, adjust stats based on resume data
    if (resumes.length > 0) {
      const resumeCount = resumes.length;
      const processedResumes = resumes.filter(r => 
        r.status === 'processed' || r.formattedJSON
      ).length;
      
      // Adjust stats based on resume activity
      baseStats.atsScore = Math.min(100, 85 + (processedResumes * 5));
      baseStats.profileViews = Math.max(50, 200 + (resumeCount * 75));
      baseStats.applications = Math.max(5, resumeCount * 8);
      baseStats.responses = Math.max(2, Math.floor(baseStats.applications * 0.4));
      baseStats.interviews = Math.max(1, Math.floor(baseStats.responses * 0.6));
      
      // Adjust changes based on activity
      changes.profileViewsChange = Math.max(5, 10 + (processedResumes * 2));
      changes.applicationsChange = Math.max(3, 5 + resumeCount);
      changes.interviewsChange = Math.max(10, 20 + (processedResumes * 5));
    }

    return {
      ...baseStats,
      ...changes
    };
  }

  private generateAvatarUrl(nameOrEmail: string): string {
    // Generate a consistent avatar based on name/email
    const avatars = [
      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
    ];
    
    const hash = nameOrEmail.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return avatars[Math.abs(hash) % avatars.length];
  }

  async updateProfileViews(userId: string): Promise<void> {
    try {
      // In a real app, you'd track profile views in a separate table
      // For now, we'll just log the view
      console.log(`Profile view recorded for user: ${userId}`);
    } catch (error) {
      console.error('Error updating profile views:', error);
    }
  }

  async getAIInsights(userId: string): Promise<any[]> {
    try {
      // Fetch user's resumes to generate insights
      const { data: resumes, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('userId', userId)
        .limit(1);

      if (error) {
        console.error('Error fetching resumes for insights:', error);
        return this.getDefaultInsights();
      }

      if (!resumes || resumes.length === 0) {
        return this.getNoResumeInsights();
      }

      // Generate insights based on resume data
      return this.generateInsightsFromResume(resumes[0]);
    } catch (error) {
      console.error('Error in getAIInsights:', error);
      return this.getDefaultInsights();
    }
  }

  private getDefaultInsights(): any[] {
    return [
      {
        title: "Resume Optimization",
        description: "Your profile is looking good! Consider uploading a resume to get personalized AI insights and improve your ATS score.",
        type: "suggestion",
        priority: "medium"
      }
    ];
  }

  private getNoResumeInsights(): any[] {
    return [
      {
        title: "Upload Your Resume",
        description: "Get started by uploading your resume. Our AI will analyze it and provide personalized suggestions to improve your job search success.",
        type: "suggestion",
        priority: "high"
      }
    ];
  }

  private generateInsightsFromResume(resume: any): any[] {
    const insights = [];

    if (resume.formattedJSON) {
      const resumeData = resume.formattedJSON;
      
      // Check for skills
      if (!resumeData.skills || resumeData.skills.length < 5) {
        insights.push({
          title: "Add More Skills",
          description: "Adding 3-5 more relevant skills could improve your ATS score by 15 points and increase your visibility to recruiters.",
          type: "improvement",
          priority: "high"
        });
      }

      // Check for experience
      if (!resumeData.experience || resumeData.experience.length < 2) {
        insights.push({
          title: "Expand Work Experience",
          description: "Consider adding more detailed work experience with quantifiable achievements to strengthen your profile.",
          type: "suggestion",
          priority: "medium"
        });
      }

      // Check for education
      if (!resumeData.education || resumeData.education.length === 0) {
        insights.push({
          title: "Add Education Details",
          description: "Including your educational background can help recruiters better understand your qualifications.",
          type: "suggestion",
          priority: "low"
        });
      }
    } else {
      insights.push({
        title: "Resume Processing Complete",
        description: "Your resume has been uploaded successfully! Our AI is analyzing it to provide personalized recommendations.",
        type: "achievement",
        priority: "medium"
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "Excellent Profile!",
        description: "Your resume looks comprehensive. Keep updating it regularly to maintain your competitive edge in the job market.",
        type: "achievement",
        priority: "low"
      });
    }

    return insights;
  }
}

export default DashboardService;