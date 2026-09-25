/**
 * Les libellés du MODE CONNECTÉ (`VITE_BACKEND=supabase`) : inscription du
 * joueur, page du joueur, rattachement d'un compte, invitations et
 * notifications push.
 *
 * POURQUOI UN SECOND FICHIER. Le catalogue principal (`messages.ts`) est dans
 * le morceau d'ENTRÉE : chaque libellé y est téléchargé par chaque visiteur,
 * avant le premier rendu. Or le mode de production est `local`, où ces écrans
 * n'existent pas. `i18n/index.ts` ne fusionne ce fichier que si
 * `BACKEND === 'supabase'` — une constante que le bundler replie, si bien
 * qu'en mode local ce fichier sort du bundle, comme `SupabaseAppProvider`.
 *
 * Mêmes règles que le catalogue principal : `fr` fait foi, `en` en reflète
 * exactement les clés (un test le vérifie), et ces groupes n'existent PAS
 * dans `messages.ts` — la fusion est superficielle, groupe par groupe.
 *
 * Tutoiement pour ce que lit l'enfant (`signup`, `player`, `linkAccount`),
 * vouvoiement pour ce que lit le parent.
 */
export const connectedMessages = {
  fr: {
    signup: {
      entry: "J'ai un code d'invitation joueur",
      title: 'Créer mon compte joueur',
      intro:
        "Ton parent t'a donné un code d'invitation ? Crée d'abord ton compte avec ton adresse e-mail et un mot de passe. Tu saisiras le code juste après.",
      password: 'Mot de passe (8 caractères au moins)',
      submit: 'Créer mon compte',
      failed:
        'Création impossible : cette adresse a peut-être déjà un compte, ou le mot de passe est trop court. Réessaie, ou connecte-toi.',
      confirmTitle: 'Vérifie ta boîte',
      confirm:
        'Un e-mail de confirmation vient de partir vers {email}. Ouvre le lien depuis cet appareil : il te ramènera ici, connecté, pour saisir ton code.',
      backToSignIn: 'Retour à la connexion',
    },
    player: {
      greeting: 'Salut {name} 👋',
      intro:
        "Dis ici si tu seras là. Ton parent confirme ensuite : c'est sa réponse que retient le coach.",
      mySurveys: 'Mes sondages',
      noSurveys: "Aucun sondage ouvert pour l'instant.",
      deadline: 'Réponse avant le {date}',
      myAnswer: 'Ma réponse',
      parentConfirmed: 'Confirmé par ton parent : {value}',
      parentPending: "Ton parent n'a pas encore confirmé.",
      divergence:
        "Ton parent a répondu autrement : c'est sa réponse qui compte.",
      myEvents: 'Mes prochains événements',
      noEvents: 'Rien de prévu pour le moment.',
      matchAgainst: 'Match contre {opponent}',
      training: 'Entraînement',
      home: 'À domicile',
      away: "À l'extérieur",
      meeting: 'Rendez-vous à {time}',
      cancelled: 'Annulé',
      archived:
        "Ta fiche n'est plus active au club : il n'y a plus rien à afficher ici.",
      signOut: 'Se déconnecter',
    },
    linkAccount: {
      title: 'Rattacher mon compte',
      intro:
        "Ton compte est créé. Saisis le code que ton parent t'a donné : il relie ce compte à ta fiche de joueur.",
      codeLabel: "Code d'invitation",
      codeHint:
        '12 caractères, par exemple ABCD-EFGH-JKLM. Les tirets sont facultatifs.',
      incomplete: 'Le code compte 12 caractères : vérifie ta saisie.',
      submit: 'Rattacher mon compte',
      adultHint:
        "Parent, entraîneur ou dirigeant ? Ce code n'est pas pour vous : demandez à l'administrateur du club de rattacher votre compte à votre fiche.",
      noRole:
        "Ce compte est connu du club, mais aucun rôle ne lui est attribué. L'administrateur du club peut vous en donner un.",
      signedInAs: 'Connecté avec {email}',
      signOut: 'Se déconnecter',
    },
    playerAccount: {
      title: 'Compte joueur',
      intro:
        "Votre enfant peut indiquer lui-même s'il sera présent. Il ne verra que sa fiche, les matchs, entraînements et sondages de ses équipes. Votre réponse reste la seule officielle.",
      statusNone: 'Pas de compte',
      statusPending: "Code en attente, valable jusqu'au {date}",
      statusExpired: 'Code expiré le {date}',
      statusActive: 'Compte actif depuis le {date}',
      invite: "Créer un code d'invitation",
      newCode: 'Nouveau code',
      revoke: "Couper l'accès",
      consentTitle: 'Autoriser un compte pour {name} ?',
      consentBody:
        "En tant que parent, vous consentez à ce que {name} ait son propre compte. Il y verra sa fiche, les matchs, entraînements et sondages de ses équipes, et pourra dire s'il sera présent — votre réponse restera la seule officielle. Votre consentement est enregistré, avec sa date ; vous pourrez le retirer ici à tout moment.",
      consentConfirm: "J'autorise",
      codeTitle: 'Code pour {name}',
      codeOnce:
        "Valable jusqu'au {date}, pour un seul compte. Il ne sera plus affiché : transmettez-le maintenant.",
      copy: 'Copier le code',
      copied: 'Code copié.',
      copyFailed: 'Copie impossible : recopiez le code à la main.',
      share: 'Partager',
      shareTitle: "Code d'invitation Mister Footcoach",
      shareText:
        "Ton code d'invitation Mister Footcoach : {code} (valable jusqu'au {date}). Ouvre l'application, choisis « J'ai un code d'invitation joueur », crée ton compte, puis saisis ce code.",
      done: "C'est transmis",
      revokeTitle: "Couper l'accès de {name} ?",
      revokeBody:
        'Le code en attente ne servira plus, et le compte de {name} sera fermé : il ne pourra plus rien voir. Ses réponses déjà données restent au club. Vous pourrez créer un nouveau code plus tard.',
      revokeConfirm: "Couper l'accès",
      revoked: 'Accès coupé.',
      adminTitle: 'Comptes joueurs du club',
      adminNone: 'Aucun compte joueur.',
      adminConsent: 'Consentement de {parent} le {date}',
      adminConsentUnknown: 'Trace du consentement introuvable',
      // Affiché par la zone dangereuse des réglages : effacer son compte
      // retire le consentement donné (0006, `delete_my_account`).
      deletionNote:
        'Les comptes joueurs que vous avez autorisés pour vos enfants seront fermés.',
      loadFailed: 'Impossible de lire les invitations. Vérifiez la connexion.',
      errors: {
        session_requise: 'La session a expiré : reconnectez-vous.',
        parent_non_lie: 'Seul un parent rattaché à ce joueur peut le faire.',
        joueur_inactif: "Cette fiche de joueur n'est plus active.",
        compte_deja_actif:
          "Ce joueur a déjà un compte : coupez-en l'accès avant d'en ouvrir un autre.",
        invitation_invalide:
          'Code inconnu, expiré, déjà utilisé ou retiré. Demande un nouveau code à ton parent.',
        compte_deja_rattache:
          'Ce compte est déjà rattaché au club. Le joueur doit créer son propre compte.',
        compte_joueur_requis: 'Réservé au compte du joueur.',
        sondage_ferme: 'Ce sondage est fermé.',
        sondage_inaccessible: "Ce sondage n'est pas celui de ton équipe.",
        intention_invalide: 'Réponse invalide.',
        inconnue: 'La demande a échoué. Vérifiez la connexion et réessayez.',
      },
    },
    push: {
      title: 'Notifications push',
      onThisDevice: 'Recevoir sur cet appareil',
      desc: 'Les notifications arrivent sur cet appareil, même application fermée — seulement les catégories cochées ci-dessus.',
      consent:
        "L'activation vaut consentement à les recevoir ici ; vous le retirez à tout moment en désactivant.",
      enabled: 'Notifications push activées sur cet appareil.',
      disabled: 'Notifications push désactivées sur cet appareil.',
      denied:
        'Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur, puis revenez ici.',
      enableFailed:
        'Activation impossible. Vérifiez la connexion et réessayez.',
      disableFailed:
        'Désactivation impossible. Vérifiez la connexion et réessayez.',
      installFirst:
        "Sur iPhone et iPad, ajoutez d'abord l'application à l'écran d'accueil (Partager › Sur l'écran d'accueil), puis ouvrez-la depuis son icône : Safari n'envoie pas de notifications à un onglet.",
      unsupported: 'Ce navigateur ne sait pas recevoir de notifications push.',
      notDeployed:
        'Les notifications push ne sont pas encore activées sur cette installation.',
    },
  },

  en: {
    signup: {
      entry: 'I have a player invitation code',
      title: 'Create my player account',
      intro:
        'Did your parent give you an invitation code? First create your account with your email address and a password. You will enter the code right after.',
      password: 'Password (at least 8 characters)',
      submit: 'Create my account',
      failed:
        'Could not create the account: this address may already have one, or the password is too short. Try again, or sign in.',
      confirmTitle: 'Check your inbox',
      confirm:
        'A confirmation email was just sent to {email}. Open the link on this device: it will bring you back here, signed in, to enter your code.',
      backToSignIn: 'Back to sign in',
    },
    player: {
      greeting: 'Hi {name} 👋',
      intro:
        'Say here whether you will be there. Your parent then confirms: their answer is the one the coach goes by.',
      mySurveys: 'My polls',
      noSurveys: 'No open poll for now.',
      deadline: 'Answer before {date}',
      myAnswer: 'My answer',
      parentConfirmed: 'Confirmed by your parent: {value}',
      parentPending: 'Your parent has not confirmed yet.',
      divergence:
        'Your parent answered differently: their answer is the one that counts.',
      myEvents: 'My upcoming events',
      noEvents: 'Nothing planned for now.',
      matchAgainst: 'Match against {opponent}',
      training: 'Training session',
      home: 'Home',
      away: 'Away',
      meeting: 'Meeting at {time}',
      cancelled: 'Cancelled',
      archived:
        'Your player record is no longer active at the club: there is nothing left to show here.',
      signOut: 'Sign out',
    },
    linkAccount: {
      title: 'Link my account',
      intro:
        'Your account is created. Enter the code your parent gave you: it links this account to your player record.',
      codeLabel: 'Invitation code',
      codeHint:
        '12 characters, for example ABCD-EFGH-JKLM. Dashes are optional.',
      incomplete: 'The code has 12 characters: check what you typed.',
      submit: 'Link my account',
      adultHint:
        'Parent, coach or club official? This code is not for you: ask the club administrator to link your account to your record.',
      noRole:
        'The club knows this account, but no role is assigned to it. The club administrator can give you one.',
      signedInAs: 'Signed in as {email}',
      signOut: 'Sign out',
    },
    playerAccount: {
      title: 'Player account',
      intro:
        'Your child can say for themselves whether they will attend. They will only see their own record, and the matches, training sessions and polls of their teams. Your answer remains the only official one.',
      statusNone: 'No account',
      statusPending: 'Code pending, valid until {date}',
      statusExpired: 'Code expired on {date}',
      statusActive: 'Account active since {date}',
      invite: 'Create an invitation code',
      newCode: 'New code',
      revoke: 'Revoke access',
      consentTitle: 'Allow an account for {name}?',
      consentBody:
        'As a parent, you consent to {name} having their own account. They will see their record, the matches, training sessions and polls of their teams, and will be able to say whether they will attend — your answer will remain the only official one. Your consent is recorded, with its date; you can withdraw it here at any time.',
      consentConfirm: 'I allow it',
      codeTitle: 'Code for {name}',
      codeOnce:
        'Valid until {date}, for a single account. It will not be shown again: pass it on now.',
      copy: 'Copy the code',
      copied: 'Code copied.',
      copyFailed: 'Could not copy: write the code down by hand.',
      share: 'Share',
      shareTitle: 'Mister Footcoach invitation code',
      shareText:
        'Your Mister Footcoach invitation code: {code} (valid until {date}). Open the app, choose "I have a player invitation code", create your account, then enter this code.',
      done: 'Done, it is passed on',
      revokeTitle: 'Revoke access for {name}?',
      revokeBody:
        'The pending code will no longer work, and the account of {name} will be closed: they will not see anything anymore. Answers already given stay with the club. You can create a new code later.',
      revokeConfirm: 'Revoke access',
      revoked: 'Access revoked.',
      adminTitle: 'Player accounts of the club',
      adminNone: 'No player account.',
      adminConsent: 'Consent from {parent} on {date}',
      adminConsentUnknown: 'Consent record not found',
      deletionNote:
        'Player accounts you allowed for your children will be closed.',
      loadFailed: 'Could not read the invitations. Check the connection.',
      errors: {
        session_requise: 'The session has expired: sign in again.',
        parent_non_lie: 'Only a parent linked to this player can do that.',
        joueur_inactif: 'This player record is no longer active.',
        compte_deja_actif:
          'This player already has an account: revoke its access before opening another one.',
        invitation_invalide:
          'Unknown, expired, already used or withdrawn code. Ask your parent for a new one.',
        compte_deja_rattache:
          'This account is already linked to the club. The player must create their own account.',
        compte_joueur_requis: "Reserved for the player's account.",
        sondage_ferme: 'This poll is closed.',
        sondage_inaccessible: "This poll is not your team's.",
        intention_invalide: 'Invalid answer.',
        inconnue: 'The request failed. Check the connection and try again.',
      },
    },
    push: {
      title: 'Push notifications',
      onThisDevice: 'Receive on this device',
      desc: 'Notifications reach this device even when the app is closed — only the categories ticked above.',
      consent:
        'Turning this on means you consent to receiving them here; you withdraw it at any time by turning it off.',
      enabled: 'Push notifications turned on for this device.',
      disabled: 'Push notifications turned off for this device.',
      denied:
        'Notifications are blocked for this site: allow them in the browser settings, then come back here.',
      enableFailed:
        'Could not turn them on. Check the connection and try again.',
      disableFailed:
        'Could not turn them off. Check the connection and try again.',
      installFirst:
        'On iPhone and iPad, first add the app to the Home Screen (Share › Add to Home Screen), then open it from its icon: Safari does not send notifications to a tab.',
      unsupported: 'This browser cannot receive push notifications.',
      notDeployed:
        'Push notifications are not turned on for this installation yet.',
    },
  },
} as const;
