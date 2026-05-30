import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { usePlayers, useAppContext } from '../../../store/AppContext';
import type { Contact, ContactType } from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';

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
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError('Email invalide.');
      return;
    }
    if (form.playerIds.length === 0) {
      setError('Rattachez au moins un joueur.');
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
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le contact' : 'Nouveau contact'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
          <Input
            label="Nom"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>
        <Select
          label="Type de relation"
          value={form.type}
          onChange={e => set('type', e.target.value as ContactType)}
        >
          {CONTACT_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Input
          label="Téléphone"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="06 12 34 56 78"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
        />

        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            Joueurs rattachés
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
            Consentement RGPD recueilli
            <span className="block text-xs text-fg-muted">
              Requis pour activer le compte (traçabilité : date + version{' '}
              {CONSENT_VERSION}).
            </span>
          </span>
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
