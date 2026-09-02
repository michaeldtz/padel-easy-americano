/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, MatchPairing } from '../types';

/**
 * Generates all possible unique match pairings for a given set of players.
 * For any 4 players selected, there are 3 possible match divisions into 2 teams of 2.
 */
function getAllPossibleMatches(players: Player[]): Omit<MatchPairing, 'id' | 'matchIndex'>[] {
  const n = players.length;
  const list: Omit<MatchPairing, 'id' | 'matchIndex'>[] = [];

  if (n < 4) return [];

  // Generate all combinations of 4 players
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const p = [players[i].id, players[j].id, players[k].id, players[l].id];

          // For these 4 players, there are 3 possible match divisions:
          // Division 1: (p0, p1) vs (p2, p3)
          // Division 2: (p0, p2) vs (p1, p3)
          // Division 3: (p0, p3) vs (p1, p2)
          
          const divisions: [ [string, string], [string, string] ][] = [
            [[p[0], p[1]], [p[2], p[3]]],
            [[p[0], p[2]], [p[1], p[3]]],
            [[p[0], p[3]], [p[1], p[2]]]
          ];

          for (const [teamA, teamB] of divisions) {
            // Byes are the players not in this match
            const activeSet = new Set([...teamA, ...teamB]);
            const byes = players
              .filter(player => !activeSet.has(player.id))
              .map(player => player.id);

            list.push({
              teamA,
              teamB,
              byes
            });
          }
        }
      }
    }
  }

  return list;
}

/**
 * Generates a balanced schedule of M matches for N players.
 * Uses a scoring system to minimize differences in play count, partnership count,
 * opponent count, and consecutive rests.
 */
export function generateSchedule(players: Player[], matchCount: number): MatchPairing[] {
  if (players.length < 4) {
    return [];
  }

  // Get all possible matches
  const allMatches = getAllPossibleMatches(players);
  if (allMatches.length === 0) return [];

  const schedule: MatchPairing[] = [];

  // Trackers
  const playCounts: Record<string, number> = {};
  const partnerCounts: Record<string, number> = {};
  const opponentCounts: Record<string, number> = {};

  // Initialize trackers
  players.forEach(p => {
    playCounts[p.id] = 0;
    players.forEach(o => {
      if (p.id !== o.id) {
        const pairKey = [p.id, o.id].sort().join(',');
        partnerCounts[pairKey] = 0;
        opponentCounts[pairKey] = 0;
      }
    });
  });

  // Track last matches played to prevent consecutive rests
  let lastByes: string[] = [];

  for (let step = 0; step < matchCount; step++) {
    let bestMatch: Omit<MatchPairing, 'id' | 'matchIndex'> | null = null;
    let lowestPenalty = Infinity;
    let candidates: Omit<MatchPairing, 'id' | 'matchIndex'>[] = [];

    for (const match of allMatches) {
      let penalty = 0;

      // 1. Play count penalty (high weight) - keep matches played equal
      const activePlayers = [...match.teamA, ...match.teamB];
      let maxPlayCount = 0;
      let minPlayCount = Infinity;
      
      activePlayers.forEach(pId => {
        const count = playCounts[pId];
        penalty += count * 500; // Prefer players who have played less
        if (count > maxPlayCount) maxPlayCount = count;
        if (count < minPlayCount) minPlayCount = count;
      });

      // 2. Partner count penalty (medium weight) - ensure partners are unique/fair
      const partner1Key = [...match.teamA].sort().join(',');
      const partner2Key = [...match.teamB].sort().join(',');
      penalty += (partnerCounts[partner1Key] || 0) * 150;
      penalty += (partnerCounts[partner2Key] || 0) * 150;

      // 3. Opponent count penalty (low-medium weight) - ensure opponent pairings are balanced
      for (const pA of match.teamA) {
        for (const pB of match.teamB) {
          const oppKey = [pA, pB].sort().join(',');
          penalty += (opponentCounts[oppKey] || 0) * 35;
        }
      }

      // 4. Consecutive resting penalty (high weight) - avoid resting twice in a row if possible
      match.byes.forEach(bId => {
        if (lastByes.includes(bId)) {
          penalty += 800; // Strong penalty for resting twice consecutively
        }
      });

      // 5. Recency / Duplicate match penalty (extremely high weight) - don't repeat the exact same match
      const isDuplicateOfLastFew = schedule.slice(-3).some(sMatch => {
        const sameTeamA = (sMatch.teamA[0] === match.teamA[0] && sMatch.teamA[1] === match.teamA[1]) ||
                          (sMatch.teamA[0] === match.teamA[1] && sMatch.teamA[1] === match.teamA[0]);
        const sameTeamB = (sMatch.teamB[0] === match.teamB[0] && sMatch.teamB[1] === match.teamB[1]) ||
                          (sMatch.teamB[0] === match.teamB[1] && sMatch.teamB[1] === match.teamB[0]);
        
        const crossTeamA = (sMatch.teamA[0] === match.teamB[0] && sMatch.teamA[1] === match.teamB[1]) ||
                           (sMatch.teamA[0] === match.teamB[1] && sMatch.teamA[1] === match.teamB[0]);
        const crossTeamB = (sMatch.teamB[0] === match.teamA[0] && sMatch.teamB[1] === match.teamA[1]) ||
                           (sMatch.teamB[0] === match.teamA[1] && sMatch.teamB[1] === match.teamA[0]);
        
        return (sameTeamA && sameTeamB) || (crossTeamA && crossTeamB);
      });

      if (isDuplicateOfLastFew) {
        penalty += 5000;
      }

      if (penalty < lowestPenalty) {
        lowestPenalty = penalty;
        candidates = [match];
      } else if (penalty === lowestPenalty) {
        candidates.push(match);
      }
    }

    // Pick a candidate (with slight randomness to break exact ties and make multiple generations interesting)
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selected) break;

    // Apply choices to trackers
    selected.teamA.forEach(pId => playCounts[pId]++);
    selected.teamB.forEach(pId => playCounts[pId]++);
    
    const p1Key = [...selected.teamA].sort().join(',');
    const p2Key = [...selected.teamB].sort().join(',');
    partnerCounts[p1Key] = (partnerCounts[p1Key] || 0) + 1;
    partnerCounts[p2Key] = (partnerCounts[p2Key] || 0) + 1;

    for (const pA of selected.teamA) {
      for (const pB of selected.teamB) {
        const oppKey = [pA, pB].sort().join(',');
        opponentCounts[oppKey] = (opponentCounts[oppKey] || 0) + 1;
      }
    }

    lastByes = selected.byes;

    schedule.push({
      id: `match-${step}`,
      matchIndex: step,
      teamA: selected.teamA,
      teamB: selected.teamB,
      byes: selected.byes
    });
  }

  return schedule;
}

/**
 * Recommends the default number of matches to play for perfect/balanced round robin.
 */
export function getDefaultMatchCount(playerCount: number): number {
  if (playerCount === 4) return 3;  // Everyone partners once (3 matches)
  if (playerCount === 5) return 5;  // Perfect 5-match round robin
  if (playerCount === 6) return 15; // Perfect 15-match round robin (everyone partners twice, plays 10 matches)
  if (playerCount === 7) return 7;  // Simple round
  if (playerCount === 8) return 14; // Simple round
  return playerCount * 2;
}
