import { Dashboard } from '@/components/Dashboard';

/**
 * Root page — the entire UI is the Dashboard client component.
 * Initial data is fetched client-side for real-time filtering.
 */
export default function HomePage() {
  return <Dashboard />;
}
