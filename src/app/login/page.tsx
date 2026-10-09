import { currentUser } from '@/platform/auth/current-user';
import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  return <LoginForm activeSession={await currentUser()} allowDemoCredentials={!supabasePublicoConfigurado()} />;
}
