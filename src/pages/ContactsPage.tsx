import { useState } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ContactFormDialog } from '../components/features/contacts/ContactFormDialog';
import { useContacts, useAppContext } from '../store/AppContext';
import type { Contact } from '../types';

export default function ContactsPage() {
  const contacts = useContacts();
  const { state, dispatch } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | undefined>();

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
      window.alert(
        'Suppression impossible : ce contact est le seul rattaché à un joueur actif. Rattachez un autre contact d’abord.'
      );
      return;
    }
    if (
      window.confirm(`Supprimer ${contact.firstName} ${contact.lastName} ?`)
    ) {
      dispatch({ type: 'DELETE_CONTACT', contactId: contact.id });
    }
  }

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">Contacts</h1>
        <Button size="sm" onClick={openNew}>
          <Plus size={16} /> Nouveau
        </Button>
      </div>

      {formOpen && (
        <ContactFormDialog
          open
          onClose={() => setFormOpen(false)}
          contact={editing}
        />
      )}

      {contacts.length === 0 ? (
        <EmptyState
          title="Aucun contact"
          description="Ajoutez les représentants légaux des joueurs."
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
                    <Badge variant="muted">{contact.type}</Badge>
                    {contact.consentDate ? (
                      <Badge variant="success">
                        <ShieldCheck size={11} className="mr-1" /> Consenti
                      </Badge>
                    ) : (
                      <Badge variant="warning">Consentement en attente</Badge>
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
                    Joueurs : {contact.playerIds.map(playerName).join(', ')}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEditing(contact);
                      setFormOpen(true);
                    }}
                    aria-label="Modifier"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(contact)}
                    aria-label="Supprimer"
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
