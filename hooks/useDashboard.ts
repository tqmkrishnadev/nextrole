import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardService, { UserDashboardData } from '@/services/dashboardService';

export interface UseDashboardReturn {
  dashboardData: UserDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  aiInsights: any[];
}

export function useDashboard(): UseDashboardReturn {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);

  const dashboardService = DashboardService.getInstance();

  const fetchDashboardData = async () => {
    if (!user) {
      setDashboardData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await dashboardService.getUserDashboardData(user.id);
      
      if (data) {
        setDashboardData(data);
        
        // Record profile view
        await dashboardService.updateProfileViews(user.id);
        
        // Fetch AI insights
        const insights = await dashboardService.getAIInsights(user.id);
        setAiInsights(insights);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('An error occurred while loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  return {
    dashboardData,
    loading: loading || authLoading,
    error,
    refreshData,
    aiInsights
  };
}