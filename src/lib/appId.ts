/**
 * Identifiant de l'app dans le catalogue de la famille. C'est AUSSI le nom du
 * dépôt GitHub : `repoUrl(APP_ID)` et `currentAppId` en dépendent tous deux,
 * d'où la constante unique — une faute de frappe donnerait un lien 404.
 *
 * Elle vivait dans `SettingsPage`, seul endroit qui en avait besoin. Depuis que
 * le pied de page de la coquille porte le lien du dépôt sur TOUS les écrans,
 * deux fichiers la lisent : elle sort donc dans le sien.
 */
export const APP_ID = 'mister-footcoach';
