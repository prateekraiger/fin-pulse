import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.EXPO_PUBLIC_BASE_URL || '';

async function fetchDashboard(fy) {
  const res = await fetch(`${API_BASE}/api/dashboard?fy=${fy}`, {
    headers: { 'x-user-id': 'demo-user', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

function StatCard({ label, value, subtitle, dark }) {
  return (
    <View style={[styles.statCard, dark && styles.statCardDark]}>
      <Text style={[styles.statLabel, dark && styles.statLabelDark]}>{label}</Text>
      <Text style={[styles.statValue, dark && styles.statValueDark]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, dark && styles.statSubtitleDark]}>{subtitle}</Text>
      )}
    </View>
  );
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const fy = '2024-2025';

  const { data: dash, isLoading, error, refetch } = useQuery({
    queryKey: ['mobile-dashboard', fy],
    queryFn: () => fetchDashboard(fy),
    enabled: true,
    retry: 2,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading && !dash) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#18181B" />
        <Text style={styles.loadingText}>Loading FinPulse...</Text>
      </SafeAreaView>
    );
  }

  if (error && !dash) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Could not load data</Text>
          <Text style={styles.errorMessage}>
            {error.message || 'Check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalIncome = dash?.total_income || 0;
  const totalExpenses = dash?.total_expenses || 0;
  const netIncome = dash?.net_income || 0;
  const invoiceStats = dash?.invoice_stats || { total: 0, unpaid: 0, paid: 0 };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#18181B" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>FinPulse</Text>
            <Text style={styles.subtitle}>FY {fy.replace('-', '\u2013')}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>D</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Gross Income"
            value={formatCurrency(totalIncome)}
            subtitle={`${dash?.income_count || 0} entries`}
            dark
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(totalExpenses)}
            subtitle={`${dash?.expense_count || 0} logged`}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Net Income"
            value={formatCurrency(netIncome)}
            subtitle="After deductions"
          />
          <StatCard
            label="Invoices"
            value={`${invoiceStats.total}`}
            subtitle={`${invoiceStats.unpaid} unpaid`}
          />
        </View>

        {/* GST Monitor */}
        {dash?.gst_progress !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GST Threshold</Text>
            <View style={styles.card}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(dash.gst_progress, 100)}%`,
                      backgroundColor:
                        dash.gst_progress >= 100
                          ? '#EF4444'
                          : dash.gst_progress >= 85
                            ? '#F97316'
                            : dash.gst_progress >= 70
                              ? '#F59E0B'
                              : '#22C55E',
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  {dash.gst_progress.toFixed(1)}% used
                </Text>
                <Text style={styles.progressText}>
                  of {formatCurrency(dash.gst_threshold)}
                </Text>
              </View>
              {dash.gst_progress >= 70 && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>
                    {dash.gst_progress >= 100
                      ? 'You\'ve crossed the GST threshold. Register immediately.'
                      : 'Approaching GST threshold. Consider registering soon.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Add Income', emoji: '\u2191' },
              { label: 'Add Expense', emoji: '\u2193' },
              { label: 'New Invoice', emoji: '\uD83D\uDCC4' },
              { label: 'Tax Planner', emoji: '\uD83D\uDCCA' },
            ].map((action) => (
              <TouchableOpacity key={action.label} style={styles.actionButton} activeOpacity={0.7}>
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Advance Tax Date */}
        {dash?.next_advance_tax_date && (
          <View style={styles.section}>
            <View style={styles.taxReminder}>
              <View style={styles.taxReminderDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taxReminderTitle}>Next Advance Tax Due</Text>
                <Text style={styles.taxReminderDate}>
                  {new Date(dash.next_advance_tax_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  errorIcon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#18181B',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#18181B',
  },
  subtitle: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3F3F46',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  statCardDark: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelDark: {
    color: '#A1A1AA',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18181B',
  },
  statValueDark: {
    color: '#FFFFFF',
  },
  statSubtitle: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 4,
  },
  statSubtitleDark: {
    color: '#52525B',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18181B',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F4F4F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 11,
    color: '#71717A',
  },
  warningBanner: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181B',
  },
  taxReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  taxReminderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  taxReminderTitle: {
    fontSize: 11,
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taxReminderDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
});
