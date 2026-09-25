import { useState } from 'react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Input } from '../components/ui/Input';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAuth } from './AuthContext';
import { useI18n } from '../i18n';

type Mode = 'link' | 'password' | 'signup';

/** Le minimum que l'écran demande ; le projet Supabase peut exiger plus. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * LE LIEN D'ABORD, LE MOT DE PASSE EN OPTION. Un lien à usage unique arrive
 * dans la boîte : rien à retenir, rien à voler, rien à réinitialiser. Le
 * formulaire par mot de passe reste à un clic, pour qui y tient — c'est la
 * règle de la famille depuis l'étape 5 d'AMELIORATIONS.md, et ce que deux
 * applications faisaient déjà.
 *
 * ET UNE INSCRIPTION, UNE SEULE : celle du JOUEUR. Les adultes sont créés par
 * l'administrateur ; l'enfant, lui, crée son compte ici, puis le rattache à sa
 * fiche avec le code de son parent (`LinkAccountPage`). Elle demande un mot de
 * passe, parce qu'un enfant se reconnecte plus souvent qu'il ne relève ses
 * e-mails. Tutoiement : c'est à lui qu'elle parle.
 */
export function LoginPage() {
  const { t } = useI18n();
  const { signIn, signInWithLink, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [confirmTo, setConfirmTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (mode === 'link') {
      const { error: err } = await signInWithLink(email.trim());
      setLoading(false);
      if (err) setError(t('auth.linkFailed'));
      else setSentTo(email.trim());
      return;
    }
    if (mode === 'signup') {
      const { error: err, confirmationSent } = await signUp(
        email.trim(),
        password
      );
      setLoading(false);
      if (err) setError(t('signup.failed'));
      // Sans confirmation exigée, la session est déjà ouverte : `AuthGate`
      // passe la main, et cet écran disparaît de lui-même.
      else if (confirmationSent) setConfirmTo(email.trim());
      return;
    }
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(t('auth.invalidCredentials'));
  }

  function switchMode() {
    setMode(m => (m === 'link' ? 'password' : 'link'));
    setError('');
  }

  function toMode(next: Mode) {
    setMode(next);
    setError('');
    setPassword('');
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
        {sentTo ? (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-fg-heading">
              {t('auth.linkSentTitle')}
            </h2>
            <p role="status" className="text-sm text-fg-muted">
              {t('auth.linkSent', { email: sentTo })}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setSentTo(null)}
            >
              {t('auth.linkAgain')}
            </Button>
          </div>
        ) : confirmTo ? (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-fg-heading">
              {t('signup.confirmTitle')}
            </h2>
            <p role="status" className="text-sm text-fg-muted">
              {t('signup.confirm', { email: confirmTo })}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setConfirmTo(null);
                toMode('password');
              }}
            >
              {t('signup.backToSignIn')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <h2 className="text-base font-semibold text-fg-heading">
                  {t('signup.title')}
                </h2>
                <p className="text-xs text-fg-muted">{t('signup.intro')}</p>
              </>
            )}
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {mode === 'password' && (
              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
            {mode === 'signup' && (
              <Input
                id="signup-password"
                label={t('signup.password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            )}
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              {mode === 'link'
                ? t('auth.sendLink')
                : mode === 'signup'
                  ? t('signup.submit')
                  : t('auth.signIn')}
            </Button>
            {mode === 'link' && (
              <p className="text-xs text-fg-muted">{t('auth.linkIntro')}</p>
            )}
            {mode === 'signup' ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => toMode('link')}
              >
                {t('signup.backToSignIn')}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={switchMode}
                >
                  {mode === 'link' ? t('auth.usePassword') : t('auth.useLink')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => toMode('signup')}
                >
                  {t('signup.entry')}
                </Button>
              </>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}
