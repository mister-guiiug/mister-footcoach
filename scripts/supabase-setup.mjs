#!/usr/bin/env node
/**
 * One-command Supabase setup (specs §17 — CLI automated path).
 *
 * Secrets never touch the repo: the access token is read from the
 * SUPABASE_ACCESS_TOKEN environment variable (the Supabase CLI reads it
 * automatically); database passwords are prompted by the CLI.
 *
 * Modes (driven by env vars):
 *   - Link + migrate an existing project:
 *       SUPABASE_ACCESS_TOKEN=...  SUPABASE_PROJECT_REF=abcd1234  npm run supabase:setup
 *   - Create a new project in Frankfurt (then re-run with the printed ref):
 *       SUPABASE_ACCESS_TOKEN=...  SUPABASE_ORG_ID=...  npm run supabase:setup
 *
 * Requires the Supabase CLI on PATH (Windows: `scoop install supabase`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const REGION = process.env.SUPABASE_REGION || 'eu-central-1';
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || 'mister-footcoach';

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function run(args) {
  console.log(`\n$ supabase ${args.join(' ')}`);
  const res = spawnSync('supabase', args, { stdio: 'inherit', shell: true });
  if (res.error || res.status !== 0) {
    fail(`Échec de: supabase ${args.join(' ')}`);
  }
}

// 1. CLI present?
const probe = spawnSync('supabase', ['--version'], { shell: true });
if (probe.error || probe.status !== 0) {
  fail(
    'Supabase CLI introuvable. Installe-la puis relance :\n' +
      '  Windows : scoop install supabase\n' +
      '  macOS   : brew install supabase/tap/supabase\n' +
      '  Docs    : https://supabase.com/docs/guides/cli'
  );
}

// 2. Token present? (the CLI reads SUPABASE_ACCESS_TOKEN itself)
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  fail(
    'SUPABASE_ACCESS_TOKEN manquant. Crée un token (Dashboard → Account →\n' +
      'Access Tokens) et exporte-le dans CE terminal uniquement :\n' +
      '  PowerShell : $env:SUPABASE_ACCESS_TOKEN="sbp_..."\n' +
      '  bash       : export SUPABASE_ACCESS_TOKEN=sbp_...'
  );
}

const ref = process.env.SUPABASE_PROJECT_REF;
const orgId = process.env.SUPABASE_ORG_ID;

// 3a. No ref → create a project in Frankfurt, then stop.
if (!ref) {
  if (!orgId) {
    fail(
      'Indique soit SUPABASE_PROJECT_REF (projet existant à lier), soit\n' +
        'SUPABASE_ORG_ID (pour créer un nouveau projet en région ' +
        `${REGION}).\n` +
        'Liste tes orgs : supabase orgs list'
    );
  }
  console.log(`\n→ Création du projet "${PROJECT_NAME}" en région ${REGION}…`);
  console.log('  (la CLI demandera un mot de passe de base de données)');
  run([
    'projects',
    'create',
    PROJECT_NAME,
    '--org-id',
    orgId,
    '--region',
    REGION,
  ]);
  console.log(
    '\n✓ Projet créé. Récupère le PROJECT REF ci-dessus, puis relance :\n' +
      '  SUPABASE_PROJECT_REF=<ref> npm run supabase:setup\n'
  );
  process.exit(0);
}

// 3b. Ref provided → init (if needed), link, push migrations.
if (!existsSync('supabase/config.toml')) {
  run(['init']);
}
console.log('\n→ Liaison du projet (mot de passe DB demandé par la CLI)…');
run(['link', '--project-ref', ref]);

console.log('\n→ Application des migrations (schéma + RLS + seed)…');
run(['db', 'push']);

console.log(
  '\n✓ Migrations appliquées.\n' +
    'Dernière étape : crée ton compte (Authentication → Users) et lie-le :\n' +
    "  update users set \"authId\" = '<ton-uuid>' where id = 'u3';\n" +
    'Puis renseigne .env.local (VITE_BACKEND=supabase + URL + clé anon).'
);
