import { currentUser } from '@/platform/auth/current-user';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabaseReady = supabasePublicoConfigurado();
  return <LoginForm activeSession={await currentUser()} allowDemoCredentials={!supabaseReady && process.env.NODE_ENV !== 'production'} />;
}
