import { redirect } from 'next/navigation';

// /app → /app/accounts (Accounts is the default landing module)
export default function AppPage() {
  redirect('/app/accounts');
}
