import { AppProviders } from '@/app/providers/AppProviders';
import { Dashboard } from '@/widgets/dashboard/Dashboard';

export function App() {
  return (
    <AppProviders>
      <Dashboard />
    </AppProviders>
  );
}
