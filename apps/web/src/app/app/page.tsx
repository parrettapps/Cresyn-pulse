import { redirect } from 'next/navigation';

// /app → /app/crm (CRM is the default landing module)
export default function AppPage() {
  redirect('/app/crm');
}
