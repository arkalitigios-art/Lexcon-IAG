import { supabasePublicoConfigurado } from '@/platform/supabase/public';
import { LoginForm } from './login-form';

export default function LoginPage() {
  const supabaseReady = supabasePublicoConfigurado();
  return <LoginForm allowDemoCredentials={!supabaseReady && process.env.NODE_ENV !== 'production'} />;
}
