/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export type ScoringType = 'fixed_points' | 'target_score';

export interface TournamentConfig {
  scoringType: ScoringType;
  fixedPointsLimit: number; // e.g., 24, 32 points total
  targetScoreLimit: number; // e.g., first to 15, first to 21 points
  numberOfRounds: number;    // how many full rounds of the schedule to play
}

export interface MatchPairing {
  id: string;
  matchIndex: number; // 0-based index of the match in the tournament schedule
  teamA: [string, string]; // Player IDs
  teamB: [string, string]; // Player IDs
  byes: string[]; // Player IDs sitting out
}

export interface MatchResult {
  matchId: string;
  scoreA: number;
  scoreB: number;
  playedAt: number;
  isCompleted: boolean;
}

export interface ActiveMatchState {
  matchId: string;
  scoreA: number;
  scoreB: number;
  history: Array<{ scoreA: number; scoreB: number; serverId: string | null }>;
  currentServerId: string | null; // ID of the player currently serving
  firstServerId: string | null;   // ID of the first server of the match
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;      // Total individual points won
  pointsAgainst: number;  // Total individual points lost
  pointDifference: number; // For - Against
  pointsRatio: number;    // For / Played (average score per match)
}

export interface TournamentState {
  id: string;
  name: string;
  status: 'setup' | 'active' | 'completed';
  players: Player[];
  config: TournamentConfig;
  schedule: MatchPairing[];
  results: Record<string, MatchResult>; // matchId -> result
  currentMatchIndex: number;
  activeMatchState: ActiveMatchState | null;
  createdAt: number;
}
