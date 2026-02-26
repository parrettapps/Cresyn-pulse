import { redirect } from 'next/navigation';

// Root page always redirects — authenticated users go to /app, others to /auth/login
export default function RootPage() {
  redirect('/app');
}
