import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from './AuthContext';
import { useI18n } from '../i18n';

export function LoginPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(t('auth.invalidCredentials'));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <h1 className="text-lg font-bold text-fg-heading">
            Mister Footcoach
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            {t('auth.signIn')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
