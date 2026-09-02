/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, TournamentConfig, MatchPairing, MatchResult, PlayerStats } from '../types';
import { Trophy, Clock, PlayCircle, History, Award, Edit2, RotateCcw, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

interface LeaderboardViewProps {
  players: Player[];
  schedule: MatchPairing[];
  results: Record<string, MatchResult>;
  config: TournamentConfig;
  onEditPastScore: (matchId: string, scoreA: number, scoreB: number) => void;
  onStartNextMatch: () => void;
  onResetTournament: () => void;
  onFinishTournament: () => void;
  isTournamentFinished: boolean;
}

export function calculateLeaderboard(
  players: Player[],
  schedule: MatchPairing[],
  results: Record<string, MatchResult>
): PlayerStats[] {
  const statsMap: Record<string, PlayerStats> = {};

  // Initialize
  players.forEach(p => {
    statsMap[p.id] = {
      playerId: p.id,
      playerName: p.name,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifference: 0,
      pointsRatio: 0,
    };
  });

  // Accumulate scores from matches
  Object.values(results).forEach(res => {
    if (!res.isCompleted) return;

    const match = schedule.find(m => m.id === res.matchId);
    if (!match) return;

    const scoreA = res.scoreA;
    const scoreB = res.scoreB;

    // Team A
    match.teamA.forEach(pId => {
      const stats = statsMap[pId];
      if (stats) {
        stats.matchesPlayed++;
        stats.pointsFor += scoreA;
        stats.pointsAgainst += scoreB;
        if (scoreA > scoreB) stats.wins++;
        else if (scoreA < scoreB) stats.losses++;
        else stats.draws++;
      }
    });

    // Team B
    match.teamB.forEach(pId => {
      const stats = statsMap[pId];
      if (stats) {
        stats.matchesPlayed++;
        stats.pointsFor += scoreB;
        stats.pointsAgainst += scoreA;
        if (scoreB > scoreA) stats.wins++;
        else if (scoreB < scoreA) stats.losses++;
        else stats.draws++;
      }
    });
  });

  // Calculate final ratios and differences
  const statsList = Object.values(statsMap);
  statsList.forEach(stats => {
    stats.pointDifference = stats.pointsFor - stats.pointsAgainst;
    stats.pointsRatio = stats.matchesPlayed > 0 ? parseFloat((stats.pointsFor / stats.matchesPlayed).toFixed(1)) : 0;
  });

  // Sort by Points Won (primary), Point Difference (secondary), then Wins (tertiary)
  return statsList.sort((a, b) => {
    if (b.pointsFor !== a.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
    if (b.pointDifference !== a.pointDifference) {
      return b.pointDifference - a.pointDifference;
    }
    return b.wins - a.wins;
  });
}

export default function LeaderboardView({
  players,
  schedule,
  results,
  config,
  onEditPastScore,
  onStartNextMatch,
  onResetTournament,
  onFinishTournament,
  isTournamentFinished,
}: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  
  // Scoring state for direct match editing
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);

  const leaderboardStats = calculateLeaderboard(players, schedule, results);
  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Determine completed vs total matches
  const totalMatches = schedule.length;
  const completedMatchesCount = Object.values(results).filter(r => r.isCompleted).length;
  const nextMatchIndex = completedMatchesCount;
  const hasMoreMatches = completedMatchesCount < totalMatches;

  const handleEditPastClick = (matchId: string, currentA: number, currentB: number) => {
    setEditingMatchId(matchId);
    setEditScoreA(currentA);
    setEditScoreB(currentB);
  };

  const handleSaveEdit = (matchId: string) => {
    onEditPastScore(matchId, editScoreA, editScoreB);
    setEditingMatchId(null);
  };

  // Top 3 players for podium
  const top1 = leaderboardStats[0];
  const top2 = leaderboardStats[1];
  const top3 = leaderboardStats[2];

  return (
    <div id="leaderboard-view" className="w-full max-w-md mx-auto flex flex-col gap-4">
      
      {/* Visual Tab Selection */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-950 rounded-xl border border-slate-850">
        <button
          type="button"
          id="tab-leaderboard-btn"
          onClick={() => setActiveTab('leaderboard')}
          className={`py-2.5 rounded-lg text-xs font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-slate-800 text-[#BEF264] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>
        <button
          type="button"
          id="tab-history-btn"
          onClick={() => setActiveTab('history')}
          className={`py-2.5 rounded-lg text-xs font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-slate-800 text-[#BEF264] shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Match Schedule ({completedMatchesCount}/{totalMatches})</span>
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        /* LEADERBOARD VIEW */
        <div className="flex flex-col gap-4">
          
          {/* PODIUM VISUAL (Show only if we have at least 3 players and some games played) */}
          {leaderboardStats.length >= 3 && completedMatchesCount > 0 && (
            <div id="podium-section" className="bg-slate-900 rounded-2xl border border-slate-850 p-4 shadow-sm flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                ⭐ Current Standings Podium
              </span>
              
              <div className="w-full flex items-end justify-center gap-2 pt-6 pb-2">
                {/* 2nd Place: Left */}
                {top2 && (
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-center mb-1 max-w-[90px] truncate">
                      <span className="text-xs font-bold text-slate-300 block">{top2.playerName}</span>
                      <span className="text-[11px] font-black text-[#BEF264] font-mono">{top2.pointsFor} pts</span>
                    </div>
                    <div className="w-full h-12 bg-slate-800 border-t-2 border-slate-700 rounded-t-lg flex items-center justify-center shadow-xs">
                      <span className="text-sm font-bold text-slate-400">2nd</span>
                    </div>
                  </div>
                )}

                {/* 1st Place: Center (Taller) */}
                {top1 && (
                  <div className="flex flex-col items-center flex-1 -mt-6">
                    <div className="text-center mb-1 max-w-[100px] truncate">
                      <span className="text-sm font-black text-[#BEF264] animate-pulse block">👑 {top1.playerName}</span>
                      <span className="text-xs font-black text-[#BEF264] font-mono">{top1.pointsFor} pts</span>
                    </div>
                    <div className="w-full h-18 bg-[#BEF264]/10 border-t-4 border-[#BEF264] rounded-t-xl flex items-center justify-center shadow-md relative">
                      <span className="text-base font-black text-[#BEF264]">1st</span>
                      <span className="absolute -top-3 text-lg">🏆</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place: Right */}
                {top3 && (
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-center mb-1 max-w-[90px] truncate">
                      <span className="text-xs font-bold text-slate-400 block">{top3.playerName}</span>
                      <span className="text-[11px] font-black text-[#BEF264] font-mono">{top3.pointsFor} pts</span>
                    </div>
                    <div className="w-full h-9 bg-slate-850 border-t-2 border-slate-800 rounded-t-lg flex items-center justify-center shadow-xs">
                      <span className="text-xs font-bold text-slate-500">3rd</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEADERBOARD LIST */}
          <div className="bg-slate-900 rounded-2xl border border-slate-850 shadow-sm overflow-hidden flex flex-col">
            {/* Header row */}
            <div className="grid grid-cols-12 px-4 py-3 bg-slate-950 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="col-span-2 text-center">Rank</span>
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center" title="Total Points Won">Points</span>
              <span className="col-span-2 text-center" title="Point Difference">Diff</span>
              <span className="col-span-2 text-center" title="Matches Played">Played</span>
            </div>

            {/* Player rows */}
            <div className="flex flex-col divide-y divide-slate-850">
              {leaderboardStats.map((stats, idx) => {
                const isExpanded = expandedPlayerId === stats.playerId;
                const isTopThree = idx < 3;
                const rankEmojis = ['🥇', '🥈', '🥉'];

                return (
                  <div key={stats.playerId} className="flex flex-col">
                    {/* Row Item */}
                    <button
                      type="button"
                      id={`leaderboard-row-${stats.playerId}`}
                      onClick={() => setExpandedPlayerId(isExpanded ? null : stats.playerId)}
                      className={`grid grid-cols-12 px-4 py-3.5 items-center text-left transition-colors ${
                        isExpanded ? 'bg-[#BEF264]/5' : 'hover:bg-slate-850/40'
                      }`}
                    >
                      {/* Rank */}
                      <span className="col-span-2 text-center text-xs font-bold flex items-center justify-center">
                        {isTopThree && completedMatchesCount > 0 ? (
                          <span className="text-sm">{rankEmojis[idx]}</span>
                        ) : (
                          <span className="text-slate-500 font-mono">{idx + 1}</span>
                        )}
                      </span>

                      {/* Name */}
                      <span className="col-span-4 flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-200 truncate">{stats.playerName}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </span>

                      {/* Points */}
                      <span className="col-span-2 text-center text-xs font-extrabold text-[#BEF264] font-mono">
                        {stats.pointsFor}
                      </span>

                      {/* Point Diff */}
                      <span className={`col-span-2 text-center text-xs font-bold font-mono ${
                        stats.pointDifference > 0 
                          ? 'text-green-400' 
                          : stats.pointDifference < 0 
                            ? 'text-red-400' 
                            : 'text-slate-500'
                      }`}>
                        {stats.pointDifference > 0 ? `+${stats.pointDifference}` : stats.pointDifference}
                      </span>

                      {/* Played */}
                      <span className="col-span-2 text-center text-xs text-slate-300 font-mono">
                        {stats.matchesPlayed}
                      </span>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="bg-slate-950 px-5 py-3 border-t border-b border-slate-850 flex flex-col gap-2 font-sans animate-fade-in">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Wins</span>
                            <span className="text-xs font-bold text-slate-200">{stats.wins}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Draws</span>
                            <span className="text-xs font-bold text-slate-200">{stats.draws}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Losses</span>
                            <span className="text-xs font-bold text-slate-200">{stats.losses}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Avg Score</span>
                            <span className="text-xs font-extrabold text-[#BEF264] font-mono">{stats.pointsRatio}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 flex justify-between px-1 mt-1 font-sans">
                          <span>Total Points Against: <strong className="text-slate-200">{stats.pointsAgainst}</strong></span>
                          <span>Record (W-D-L): <strong className="text-slate-200">{stats.wins}-{stats.draws}-{stats.losses}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* MATCH SCHEDULE & HISTORY */
        <div className="bg-slate-900 rounded-2xl border border-slate-850 shadow-sm overflow-hidden flex flex-col p-4 gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Match Schedule</span>
            <span className="text-xs text-slate-400 font-medium">Completed: {completedMatchesCount} of {totalMatches}</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {schedule.map(match => {
              const result = results[match.id];
              const isPlayed = result?.isCompleted;
              const isEditing = editingMatchId === match.id;
              
              const pA1 = playersMap[match.teamA[0]]?.name || 'Unknown';
              const pA2 = playersMap[match.teamA[1]]?.name || 'Unknown';
              const pB1 = playersMap[match.teamB[0]]?.name || 'Unknown';
              const pB2 = playersMap[match.teamB[1]]?.name || 'Unknown';

              const byesStr = match.byes.map(id => playersMap[id]?.name).filter(Boolean).join(', ');

              return (
                <div
                  key={match.id}
                  id={`match-history-row-${match.id}`}
                  className={`border rounded-xl p-3 flex flex-col gap-2 transition-all ${
                    isPlayed 
                      ? 'bg-slate-950/40 border-slate-800/80 text-slate-300' 
                      : match.matchIndex === nextMatchIndex
                        ? 'bg-[#BEF264]/10 border-[#BEF264]/40 ring-1 ring-[#BEF264]/10'
                        : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Match {match.matchIndex + 1}
                    </span>
                    {isPlayed ? (
                      <span className="text-[10px] font-bold text-green-400 bg-green-950/40 px-2 py-0.5 rounded border border-green-900/50 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Played
                      </span>
                    ) : match.matchIndex === nextMatchIndex ? (
                      <span className="text-[10px] font-black text-slate-900 bg-[#BEF264] px-2 py-0.5 rounded border border-[#BEF264] animate-pulse flex items-center gap-0.5">
                        🎯 Next Match
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Scheduled
                      </span>
                    )}
                  </div>

                  {/* Edit Score Mode */}
                  {isEditing ? (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-[#BEF264] block">Edit Score:</span>
                      
                      <div className="flex items-center gap-2 justify-center">
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-[10px] text-slate-400 truncate text-center max-w-[100px]">{pA1} + {pA2}</span>
                          <input
                            type="number"
                            value={editScoreA}
                            onChange={e => setEditScoreA(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-16 p-1.5 bg-slate-900 border border-slate-700 text-white rounded text-center text-sm font-bold"
                          />
                        </div>

                        <span className="text-xs font-bold text-slate-500">vs</span>

                        <div className="flex flex-col items-center flex-1">
                          <span className="text-[10px] text-slate-400 truncate text-center max-w-[100px]">{pB1} + {pB2}</span>
                          <input
                            type="number"
                            value={editScoreB}
                            onChange={e => setEditScoreB(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-16 p-1.5 bg-slate-900 border border-slate-700 text-white rounded text-center text-sm font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1.5 justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => setEditingMatchId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(match.id)}
                          className="px-2.5 py-1 bg-[#BEF264] text-slate-950 rounded text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" /> Save Score
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Pairing / Score view */
                    <div className="flex items-center justify-between">
                      {/* Left Team */}
                      <div className="flex-1 flex flex-col">
                        <span className="text-xs font-medium text-slate-200 truncate">{pA1}</span>
                        <span className="text-xs font-medium text-slate-200 truncate">{pA2}</span>
                      </div>

                      {/* Scores or VS */}
                      <div className="px-3 flex flex-col items-center shrink-0">
                        {isPlayed ? (
                          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                            <span className="text-sm font-extrabold text-[#BEF264] font-mono">{result.scoreA}</span>
                            <span className="text-xs text-slate-500 font-bold">-</span>
                            <span className="text-sm font-extrabold text-[#BEF264] font-mono">{result.scoreB}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-900 py-0.5 px-1.5 rounded">VS</span>
                        )}
                      </div>

                      {/* Right Team */}
                      <div className="flex-1 flex flex-col text-right">
                        <span className="text-xs font-medium text-slate-200 truncate">{pB1}</span>
                        <span className="text-xs font-medium text-slate-200 truncate">{pB2}</span>
                      </div>
                    </div>
                  )}

                  {/* Rest details */}
                  {byesStr && (
                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60 font-sans italic">
                      🛋️ Sitting out: <span className="font-semibold text-slate-300">{byesStr}</span>
                    </div>
                  )}

                  {/* Edit Score Button */}
                  {isPlayed && !isEditing && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        id={`edit-past-score-${match.id}`}
                        onClick={() => handleEditPastClick(match.id, result.scoreA, result.scoreB)}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#BEF264] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Score
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FOOTER TOURNAMENT ACTIONS */}
      <div className="flex flex-col gap-2 mt-4">
        {hasMoreMatches && !isTournamentFinished ? (
          <button
            type="button"
            id="start-next-match-btn"
            onClick={onStartNextMatch}
            className="w-full bg-[#BEF264] text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-md shadow-[#BEF264]/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm hover:brightness-110"
          >
            <PlayCircle className="w-5 h-5 stroke-[2.5]" />
            <span>START NEXT MATCH 🚀</span>
          </button>
        ) : (
          !isTournamentFinished && (
            <button
              type="button"
              id="finish-tournament-btn"
              onClick={onFinishTournament}
              className="w-full bg-[#BEF264] text-slate-950 font-black py-4 px-4 rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-base hover:brightness-110"
            >
              <Award className="w-5.5 h-5.5 stroke-[2.5]" />
              <span>FINISH TOURNAMENT & CROWN CHAMPION 👑</span>
            </button>
          )
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            id="reset-tournament-btn"
            onClick={onResetTournament}
            className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset / New Game</span>
          </button>
          
          {!isTournamentFinished && hasMoreMatches && (
            <button
              type="button"
              onClick={onFinishTournament}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all flex items-center justify-center cursor-pointer border border-slate-700"
            >
              Finish Tournament Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
