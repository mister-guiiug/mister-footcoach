import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Input, Select } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { usePlayers, useAppContext } from '../../../store/AppContext';
import type { Contact, ContactType } from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { useI18n } from '../../../i18n';

const CONTACT_TYPES: ContactType[] = [
  'père',
  'mère',
  'beau-père',
  'belle-mère',
  'tuteur',
  'autre',
];

const CONSENT_VERSION = '1.0';

interface ContactFormDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
  /** Preselected player to attach a new contact to. */
  playerId?: string;
}

export function ContactFormDialog({
  open,
  onClose,
  contact,
  playerId,
}: ContactFormDialogProps) {
  const { t } = useI18n();
  const players = usePlayers();
  const { dispatch } = useAppContext();
  const isEdit = Boolean(contact);

  const [form, setForm] = useState(() => ({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    type: contact?.type ?? ('père' as ContactType),
    playerIds: contact?.playerIds ?? (playerId ? [playerId] : []),
    consent: Boolean(contact?.consentDate),
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function togglePlayer(id: string) {
    setForm(f => ({
      ...f,
      playerIds: f.playerIds.includes(id)
        ? f.playerIds.filter(p => p !== id)
        : [...f.playerIds, id],
    }));
  }

  function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t('contacts.form.namesRequired'));
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError(t('contacts.form.invalidEmail'));
      return;
    }
    if (form.playerIds.length === 0) {
      setError(t('contacts.form.attachAtLeastOne'));
      return;
    }

    const id = contact?.id ?? genId('contact');
    const keepConsent = form.consent;
    const saved: Contact = {
      id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      type: form.type,
      playerIds: form.playerIds,
      userId: contact?.userId,
      consentDate: keepConsent ? (contact?.consentDate ?? today()) : undefined,
      consentVersion: keepConsent
        ? (contact?.consentVersion ?? CONSENT_VERSION)
        : undefined,
    };

    dispatch({
      type: isEdit ? 'UPDATE_CONTACT' : 'ADD_CONTACT',
      contact: saved,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(isEdit ? 'contacts.form.editTitle' : 'contacts.form.newTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t(isEdit ? 'common.save' : 'common.create')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('contacts.form.firstName')}
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
          <Input
            label={t('contacts.form.lastName')}
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>
        <Select
          label={t('contacts.form.relationType')}
          value={form.type}
          onChange={e => set('type', e.target.value as ContactType)}
        >
          {CONTACT_TYPES.map(ct => (
            <option key={ct} value={ct}>
              {t(`contactType.${ct}`)}
            </option>
          ))}
        </Select>
        <Input
          label={t('contacts.form.phone')}
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="06 12 34 56 78"
        />
        <Input
          label={t('contacts.form.email')}
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
        />

        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            {t('contacts.form.attachedPlayers')}
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlayer(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  form.playerIds.includes(p.id)
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {p.firstName} {p.lastName}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 rounded-xl bg-surface-muted p-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={e => set('consent', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-ui text-primary"
          />
          <span>
            {t('contacts.form.consent')}
            <span className="block text-xs text-fg-muted">
              {t('contacts.form.consentHint', { version: CONSENT_VERSION })}
            </span>
          </span>
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
