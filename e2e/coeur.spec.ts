import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

/*
 * LE CŒUR DE L'APPLICATION, AU-DELÀ DE L'ACCUEIL.
 *
 * Jusqu'ici la CI ne jouait que l'accueil (`a11y.spec.ts`) et l'écran
 * d'entrée (`entree.spec.ts`). Or un coach vient pour deux gestes : composer
 * son équipe et tenir la feuille du match en direct, au bord du terrain. Ce
 * sont eux qu'on éprouve ici, sur le BUILD de production (`preview: true`),
 * avec les données de démonstration — `m1` est le match de « U13 A » contre
 * FC Rivale, Lucas l'un de ses joueurs.
 *
 * CHAQUE TEST ATTEND UN ÉLÉMENT QUE SEUL REACT REND avant d'agir ou de lancer
 * axe : au `load`, l'écran peut encore être la pastille de chargement d'une
 * page paresseuse, et axe l'auditerait à sa place.
 */

// L'application suit la langue du navigateur, et le Chromium de Playwright
// parle anglais : les libellés éprouvés ici sont ceux du français, qui fait foi.
test.use({ locale: 'fr-FR' });

/** Ouvre une route et attend le titre de l'écran — rendu par React seul. */
async function ouvrir(page: Page, chemin: string, titre: string) {
  await page.goto(chemin);
  await expect(
    page.getByRole('heading', { level: 1, name: titre })
  ).toBeVisible();
}

/**
 * Ouvre une route dans l'un des deux thèmes : aucune suite du parc n'auditait
 * le sombre. La classe `dark` est vérifiée, sans quoi le test « sombre »
 * rejouerait le clair sans que rien ne le dise.
 */
async function ouvrirDansLeTheme(
  page: Page,
  sombre: boolean,
  chemin: string,
  titre: string
) {
  if (sombre) {
    await page.addInitScript(() => {
      localStorage.setItem('mister_footcoach_theme', 'dark');
    });
  }
  await ouvrir(page, chemin, titre);
  if (sombre) await expect(page.locator('html')).toHaveClass(/dark/);
}

test.describe('@critical cœur de l’app', () => {
  test('le bandeau dit la démonstration sur chaque écran, se replie et reste trouvable', async ({
    page,
  }) => {
    await ouvrir(page, '/', 'Bonjour 👋');
    const bandeau = page.getByRole('note');
    await expect(bandeau).toContainText(
      'Données fictives, enregistrées sur cet appareil seulement.'
    );

    const bascule = bandeau.getByRole('button', { name: 'Démonstration' });
    await expect(bascule).toHaveAttribute('aria-expanded', 'true');
    await bascule.click();
    await expect(bascule).toHaveAttribute('aria-expanded', 'false');
    await expect(bandeau).not.toContainText('Données fictives');

    // Replié, il le reste d'un écran à l'autre et d'un rechargement à
    // l'autre — mais son étiquette, elle, ne quitte pas l'écran.
    await ouvrir(page, '/compositions', 'Compositions');
    await expect(
      page.getByRole('note').getByRole('button', { name: 'Démonstration' })
    ).toHaveAttribute('aria-expanded', 'false');
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Compositions' })
    ).toBeVisible();
    await page
      .getByRole('note')
      .getByRole('button', { name: 'Démonstration' })
      .click();
    await expect(page.getByRole('note')).toContainText('Données fictives');
  });

  test('composition : poser un joueur à un poste et sauvegarder', async ({
    page,
  }) => {
    await ouvrir(page, '/compositions', 'Compositions');
    await page.getByRole('button', { name: 'GK', exact: true }).click();
    await expect(page.getByText('Affecter au poste :')).toBeVisible();
    const joueur = page
      .getByRole('button', { name: /^(⭐ )?[A-ZÉ][a-zé]+ [A-ZÉ][a-zé]+$/ })
      .first();
    const nom = (await joueur.innerText()).replace('⭐ ', '').trim();
    await joueur.click();
    // Le poste porte désormais le joueur, et le panneau s'est refermé.
    await expect(page.getByText('Affecter au poste :')).toBeHidden();
    await expect(
      page.getByRole('button', { name: new RegExp(nom.split(' ')[0]!) })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sauvegarder' }).click();
    await expect(page.getByText('Compositions sauvegardées')).toBeVisible();
  });

  test('match en direct : un but de Lucas monte le score et s’inscrit à la feuille', async ({
    page,
  }) => {
    await ouvrir(page, '/matchs/m1/live', 'Mode Live');
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible();

    await page.getByRole('button', { name: /But$/ }).first().click();
    await page.getByRole('button', { name: 'Lucas', exact: true }).click();
    await page.getByRole('button', { name: 'Valider But' }).click();

    // `m1` se joue à domicile : le but compte pour nous, à gauche. Le score
    // est le seul texte du groupe « − score + » (les boutons sont des icônes).
    const score = (equipe: string) =>
      page
        .getByRole('button', { name: `Ajouter un point à ${equipe}` })
        .locator('..');
    await expect(score('U13 A')).toHaveText('1');
    await expect(score('FC Rivale')).toHaveText('0');
    await expect(page.getByText('Événements')).toBeVisible();
  });

  test('repartir de zéro vide la saison ; restaurer la démo la rend', async ({
    page,
  }) => {
    await ouvrir(page, '/parametres', 'Paramètres');
    await page.getByRole('button', { name: 'Repartir de zéro' }).click();
    const boite = page.getByRole('alertdialog');
    await expect(boite).toContainText('Tout effacer et repartir de zéro ?');
    await boite.getByRole('button', { name: 'Repartir de zéro' }).click();

    // Les données ne sont plus fictives : le bandeau change de phrase, sans
    // disparaître — elles restent sur l'appareil, sans compte.
    await expect(page.getByRole('note')).toContainText(
      'Vos données restent sur cet appareil seulement'
    );
    await ouvrir(page, '/', 'Bonjour 👋');
    await expect(page.getByText('U13 A')).toHaveCount(0);
    // La composition, qui supposait une équipe, se monte toujours.
    await ouvrir(page, '/compositions', 'Compositions');

    await ouvrir(page, '/parametres', 'Paramètres');
    await page.getByRole('button', { name: 'Restaurer la démo' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Restaurer la démo' })
      .click();
    await expect(page.getByRole('note')).toContainText('Données fictives');
    await ouvrir(page, '/', 'Bonjour 👋');
    await expect(page.getByText('U13 A').first()).toBeVisible();
  });
});

test.describe('@a11y cœur de l’app', () => {
  for (const sombre of [false, true]) {
    const theme = sombre ? 'thème sombre' : 'thème clair';

    // L'accueil aussi, mais ATTENDU : `a11y.spec.ts` (gabarit du socle) lance
    // axe au `load`, quand la page paresseuse n'est encore que la pastille
    // de chargement — il n'a jamais vu la barre du haut, dont le bouton des
    // notifications portait un nom sans son chiffre.
    test(`accueil sans violation WCAG A/AA (${theme})`, async ({ page }) => {
      await ouvrirDansLeTheme(page, sombre, '/', 'Bonjour 👋');
      await expectNoA11yViolations(page, AxeBuilder, expect);
    });

    test(`composition sans violation WCAG A/AA (${theme})`, async ({
      page,
    }) => {
      await ouvrirDansLeTheme(page, sombre, '/compositions', 'Compositions');
      // Un poste ouvert : le panneau des joueurs fait partie de l'écran.
      await page.getByRole('button', { name: 'GK', exact: true }).click();
      await expect(page.getByText('Affecter au poste :')).toBeVisible();
      await expectNoA11yViolations(page, AxeBuilder, expect);
    });

    test(`match en direct sans violation WCAG A/AA (${theme})`, async ({
      page,
    }) => {
      await ouvrirDansLeTheme(page, sombre, '/matchs/m1/live', 'Mode Live');
      // Un événement choisi : la liste des joueurs et la validation aussi.
      await page.getByRole('button', { name: /But$/ }).first().click();
      await expect(
        page.getByRole('button', { name: 'Valider But' })
      ).toBeVisible();
      await expectNoA11yViolations(page, AxeBuilder, expect);
    });

    test(`réglages sans violation WCAG A/AA (${theme})`, async ({ page }) => {
      await ouvrirDansLeTheme(page, sombre, '/parametres', 'Paramètres');
      await expectNoA11yViolations(page, AxeBuilder, expect);
    });
  }
});
