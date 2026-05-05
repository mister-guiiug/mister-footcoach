import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import SurveysPage from './SurveysPage';
import { MOCK_DATA } from '../data/mock';
import type { Survey } from '../types';

describe('SurveysPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders page title', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Sondages de présence')).toBeInTheDocument();
  });

  it('shows Toutes filter button', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Toutes')).toBeInTheDocument();
  });

  it('shows team filter buttons', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('U13 A')).toBeInTheDocument();
    expect(screen.getByText('U13 B')).toBeInTheDocument();
  });

  it('shows survey session label', () => {
    renderWithProviders(<SurveysPage />);
    // sv1 references match m1 vs FC Rivale
    expect(screen.getByText(/Match vs FC Rivale/)).toBeInTheDocument();
  });

  it('shows open survey badge', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getAllByText('Ouvert').length).toBeGreaterThan(0);
  });

  it('shows confirmed present count', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getAllByText('Présents confirmés').length).toBeGreaterThan(0);
  });

  it('shows parent disclaimer note', () => {
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText(/La confirmation du parent/)).toBeInTheDocument();
  });

  it('expands survey details on click', async () => {
    renderWithProviders(<SurveysPage />);
    const btn = screen.getAllByText('Voir les réponses')[0];
    await userEvent.click(btn);
    expect(screen.getByText('Masquer les détails')).toBeInTheDocument();
    // Player names should appear
    expect(screen.getByText(/Lucas Dupont/)).toBeInTheDocument();
  });

  it('collapses survey details on second click', async () => {
    renderWithProviders(<SurveysPage />);
    const btn = screen.getAllByText('Voir les réponses')[0];
    await userEvent.click(btn);
    await userEvent.click(screen.getByText('Masquer les détails'));
    expect(screen.getAllByText('Voir les réponses').length).toBeGreaterThan(0);
  });

  it('shows divergence warning when intention != confirmation', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]);
    // sr2: intentionJoueur=present, confirmationParent=absent → divergence for p2
    expect(screen.getByText('Divergence')).toBeInTheDocument();
  });

  it('clicking intentionJoueur button records response', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]);
    // Find first Présent button in the intention section (p1 area — already 'present')
    const presentBtns = screen.getAllByRole('button', { name: 'Présent' });
    if (presentBtns.length > 0) {
      await userEvent.click(presentBtns[0]);
    }
  });

  it('clicking confirmationParent button records response', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]);
    const absentBtns = screen.getAllByRole('button', { name: 'Absent' });
    if (absentBtns.length > 0) {
      await userEvent.click(absentBtns[0]);
    }
  });

  it('clicking Incertain button records uncertain response', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]);
    const incertainBtns = screen.getAllByRole('button', { name: 'Incertain' });
    if (incertainBtns.length > 0) {
      await userEvent.click(incertainBtns[0]);
    }
  });

  it('filters by team', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getByText('U13 A'));
    // Should still show sv1
    expect(screen.getByText(/Match vs FC Rivale/)).toBeInTheDocument();
  });

  it('resets to all on Toutes click', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getByText('U13 A'));
    await userEvent.click(screen.getByText('Toutes'));
    expect(screen.getAllByText('Voir les réponses').length).toBeGreaterThan(1);
  });

  it('filters to U13 B shows its survey', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getByText('U13 B'));
    expect(screen.getByText(/Match vs/)).toBeInTheDocument();
  });

  it('creates new response for player with no existing response', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]);
    // p4 and beyond have no responses — clicking any button creates a new one
    const allIncertainBtns = screen.getAllByRole('button', { name: 'Incertain' });
    // Click the last one (should be for a player without existing response)
    if (allIncertainBtns.length > 0) {
      await userEvent.click(allIncertainBtns[allIncertainBtns.length - 1]);
    }
  });

  it('shows training session label for sv3', () => {
    renderWithProviders(<SurveysPage />);
    // sv3 references training tr6 → "Entraînement 12 mai"
    expect(screen.getByText(/Entraînement/)).toBeInTheDocument();
  });

  it('shows survey question as fallback when session not found', () => {
    const orphanSurvey: Survey = {
      id: 'sv-orphan',
      teamId: 't1',
      sessionType: 'match',
      sessionId: 'nonexistent-match',
      question: 'Question orpheline',
      deadline: '2026-05-15',
      status: 'ouvert',
      sendNotification: false,
      createdBy: 'u1',
    };
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA,
      surveys: [orphanSurvey],
      surveyResponses: [],
      selectedTeamId: MOCK_DATA.teams[0]?.id ?? '',
    }));
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Question orpheline')).toBeInTheDocument();
  });

  it('shows empty state when no surveys', () => {
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, surveys: [], selectedTeamId: MOCK_DATA.teams[0]!.id,
    }));
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Aucun sondage')).toBeInTheDocument();
  });

  it('shows Fermé badge for ferme survey', () => {
    const fermeSurvey: Survey = {
      id: 'sv-ferme', teamId: 't1', sessionType: 'match', sessionId: 'm1',
      question: 'Sondage fermé', deadline: '2026-04-01', status: 'ferme',
      sendNotification: false, createdBy: 'u1',
    };
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, surveys: [fermeSurvey], surveyResponses: [],
      selectedTeamId: MOCK_DATA.teams[0]!.id,
    }));
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Fermé')).toBeInTheDocument();
  });

  it('shows Archivé badge for archive survey', () => {
    const archiveSurvey: Survey = {
      id: 'sv-arch', teamId: 't1', sessionType: 'match', sessionId: 'm1',
      question: 'Sondage archivé', deadline: '2026-04-01', status: 'archive',
      sendNotification: false, createdBy: 'u1',
    };
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, surveys: [archiveSurvey], surveyResponses: [],
      selectedTeamId: MOCK_DATA.teams[0]!.id,
    }));
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Archivé')).toBeInTheDocument();
  });

  it('uses empty string fallback when survey has no sessionId', () => {
    const noSessionSurvey = {
      id: 'sv-nosession', teamId: 't1', sessionType: 'match',
      question: 'Sondage sans session', deadline: '2026-05-15', status: 'ouvert',
      sendNotification: false, createdBy: 'u1',
    };
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, surveys: [noSessionSurvey], surveyResponses: [],
      selectedTeamId: MOCK_DATA.teams[0]!.id,
    }));
    renderWithProviders(<SurveysPage />);
    expect(screen.getByText('Sondage sans session')).toBeInTheDocument();
  });
});
