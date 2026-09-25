import { useState } from 'react';
import { Input } from '../../ui/Input';
import { useAppContext, useClubSettings } from '../../../store/AppContext';
import { useI18n } from '../../../i18n';

/**
 * Le nom du club, imprimé en tête des exports PDF.
 *
 * ENREGISTRÉ À LA SORTIE DU CHAMP, pas à chaque frappe : avec le backend
 * Supabase, chaque `SET_CLUB_SETTINGS` est une écriture réseau, et une
 * réhydratation temps réel arrivée entre deux frappes réécrirait le champ
 * sous les doigts. Entrée valide et quitte le champ, comme on s'y attend.
 */
export function ClubNameField() {
  const clubSettings = useClubSettings();
  const saved = clubSettings.clubName ?? '';
  // Remonté quand la valeur enregistrée change ailleurs (import d'un
  // fichier, réhydratation) : le brouillon ne survit pas à une vérité neuve.
  return <ClubNameInput key={saved} saved={saved} />;
}

function ClubNameInput({ saved }: { saved: string }) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();
  const clubSettings = useClubSettings();
  const [draft, setDraft] = useState(saved);

  function commit() {
    const next = draft.trim();
    if (next === saved) return;
    // Chaîne vide plutôt qu'`undefined` pour effacer : voir `ClubSettings`.
    dispatch({
      type: 'SET_CLUB_SETTINGS',
      settings: { ...clubSettings, clubName: next },
    });
  }

  return (
    <div className="mb-3">
      <Input
        id="club-name"
        label={t('settings.clubName')}
        value={draft}
        placeholder={t('settings.clubNamePlaceholder')}
        autoComplete="organization"
        maxLength={80}
        aria-describedby="club-name-hint"
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="min-h-11"
      />
      <p id="club-name-hint" className="mt-1 text-xs text-fg-muted">
        {t('settings.clubNameHint')}
      </p>
    </div>
  );
}
