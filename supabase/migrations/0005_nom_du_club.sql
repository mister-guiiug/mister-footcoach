-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Le nom du club, dans le paramétrage que l'application lit et écrit.      ║
-- ║                                                                          ║
-- ║ POURQUOI. L'export PDF (feuille de match, rapport d'assiduité) imprime   ║
-- ║ le nom du club en tête. Le client n'en connaissait aucun : `clubs.name`  ║
-- ║ existe au schéma, mais aucun écran ne lit la table `clubs`. Le réglage   ║
-- ║ vit donc là où vivent les autres réglages du club — la ligne unique de   ║
-- ║ `club_settings`, déjà lue à l'hydratation et écrite par                  ║
-- ║ `SET_CLUB_SETTINGS` — et reflète 1:1 `ClubSettings.clubName` de          ║
-- ║ `src/types/index.ts`, comme le reste du schéma.                          ║
-- ║                                                                          ║
-- ║ DROITS : ceux de la table, inchangés — lecture pour tout compte          ║
-- ║ authentifié, écriture pour l'admin (`club_settings_admin`, 0002).        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table club_settings add column if not exists "clubName" text;

-- Reprise : une base déjà semée porte le nom du club dans `clubs`. Le
-- recopier évite une feuille de match sans club au premier export ; l'admin
-- le change ensuite depuis les réglages. Rien n'est écrasé : seule une ligne
-- sans nom est complétée.
update club_settings
   set "clubName" = (select name from clubs order by id limit 1)
 where "clubName" is null;
