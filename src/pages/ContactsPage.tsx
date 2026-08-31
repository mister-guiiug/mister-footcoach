import { useState } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-wpa-config/react/empty-state';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';
import { ContactFormDialog } from '../components/features/contacts/ContactFormDialog';
import { useContacts, useAppContext } from '../store/AppContext';
import type { Contact } from '../types';
import { useI18n } from '../i18n';
import { useRemoteWriteGuard } from '../hooks/useRemoteWriteGuard';

export default function ContactsPage() {
  const { t } = useI18n();
  const contacts = useContacts();
  const { state, dispatch } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | undefined>();
  // Le contact dont la suppression attend une réponse. `window.confirm` était
  // synchrone ; la boîte du socle est déclarative — c'est cet état qui porte
  // « quoi supprimer », et sa présence ouvre la boîte.
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);
  // Le refus de suppression (RG-CONTACT-03), même schéma : `window.alert` était
  // synchrone, l'alerte du socle est déclarative — c'est cet état qui porte le
  // message, et sa présence ouvre la boîte.
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  // Un TROISIÈME motif de refus, après RG-CONTACT-03 et le formulaire : le
  // réseau. Il vient AVANT les deux autres — être seul contact d'un joueur
  // n'a plus d'importance si l'écriture ne peut pas partir.
  const deleteGuard = useRemoteWriteGuard();

  const playerName = (id: string) => {
    const p = state.players.find(x => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : '?';
  };

  // RG-CONTACT-03 — a contact may be removed only if it is not the sole
  // contact of one of its active players.
  function canDelete(contact: Contact): boolean {
    return contact.playerIds.every(pid => {
      const player = state.players.find(p => p.id === pid);
      if (!player || !player.active) return true;
      const others = contacts.filter(
        c => c.id !== contact.id && c.playerIds.includes(pid)
      );
      return others.length > 0;
    });
  }

  function remove(contact: Contact) {
    if (!canDelete(contact)) {
      setBlockedReason(t('contacts.deleteImpossible'));
      return;
    }
    setPendingDelete(contact);
  }

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('contacts.title')}
        </h1>
        <Button size="sm" onClick={openNew}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <ContactFormDialog
          open
          onClose={() => setFormOpen(false)}
          contact={editing}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          destructive
          title={t('contacts.deleteConfirm', {
            name: `${pendingDelete.firstName} ${pendingDelete.lastName}`,
          })}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            dispatch({ type: 'DELETE_CONTACT', contactId: pendingDelete.id });
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {blockedReason && (
        // Mono-action (`cancelLabel={null}`) : rien à confirmer ni à annuler,
        // il n'y a qu'à prendre acte — Échap et le voile valent « OK ».
        // `confirmLabel` est explicite : l'app est bilingue et ne monte pas de
        // `LabelsProvider`, le défaut du socle resterait figé en français.
        <ConfirmDialog
          open
          cancelLabel={null}
          title={blockedReason}
          confirmLabel={t('common.ok')}
          onConfirm={() => setBlockedReason(null)}
        />
      )}

      {contacts.length === 0 ? (
        <EmptyState
          title={t('contacts.none')}
          description={t('contacts.noneDesc')}
          icon={<span className="text-4xl">👪</span>}
        />
      ) : (
        <div className="space-y-3">
          {contacts.map(contact => (
            <Card key={contact.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-fg-heading">
                      {contact.firstName} {contact.lastName}
                    </h2>
                    <Badge tone="muted">
                      {t(`contactType.${contact.type}`)}
                    </Badge>
                    {contact.consentDate ? (
                      <Badge tone="success">
                        <ShieldCheck size={11} className="mr-1" />{' '}
                        {t('contacts.consented')}
                      </Badge>
                    ) : (
                      <Badge tone="warning">
                        {t('contacts.consentPending')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-sm">
                    {contact.phone && (
                      <p className="flex items-center gap-2 text-fg-muted">
                        <Phone size={13} /> {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="flex items-center gap-2 text-fg-muted">
                        <Mail size={13} /> {contact.email}
                      </p>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-fg-muted">
                    {t('contacts.players', {
                      names: contact.playerIds.map(playerName).join(', '),
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEditing(contact);
                      setFormOpen(true);
                    }}
                    aria-label={t('common.edit')}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  {/* Une icône seule ne peut pas porter de phrase : c'est son
                      `aria-label` qui devient le motif, doublé en infobulle. */}
                  <button
                    onClick={deleteGuard.wrap(() => remove(contact))}
                    {...deleteGuard.iconProps(t('common.delete'))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
