/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, TournamentConfig, ScoringType } from '../types';
import { getDefaultMatchCount } from '../utils/scheduler';
import { Users, Plus, Trash2, Dumbbell, Sparkles, Trophy } from 'lucide-react';

interface RegistrationViewProps {
  onStartTournament: (players: Player[], config: TournamentConfig, totalMatches: number) => void;
  initialPlayers?: Player[];
}

const PRESET_5_PLAYERS = ['Matías', 'Alejandro', 'Agustín', 'Arturo', 'Chingotto'];
const PRESET_6_PLAYERS = ['Galan', 'Coello', 'Tapia', 'Lebron', 'Navarro', 'Belasteguín'];

export default function RegistrationView({ onStartTournament, initialPlayers = [] }: RegistrationViewProps) {
  const [players, setPlayers] = useState<Player[]>(() => {
    if (initialPlayers.length > 0) return initialPlayers;
    // Default to a 5-player preset for instant testing
    return PRESET_5_PLAYERS.map((name, index) => ({
      id: `player-${Date.now()}-${index}`,
      name,
      joinedAt: Date.now() + index,
    }));
  });

  const [newPlayerName, setNewPlayerName] = useState('');
  const [scoringType, setScoringType] = useState<ScoringType>('fixed_points');
  const [fixedPointsLimit, setFixedPointsLimit] = useState(24);
  const [targetScoreLimit, setTargetScoreLimit] = useState(15);
  const [customMatchesCount, setCustomMatchesCount] = useState<number | null>(null);

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name,
      joinedAt: Date.now(),
    };

    setPlayers(prev => [...prev, newPlayer]);
    setNewPlayerName('');
    setCustomMatchesCount(null); // Reset custom matches to re-evaluate default recommendations
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setCustomMatchesCount(null); // Reset custom matches
  };

  const handleLoadPreset = (count: number) => {
    const presetNames = count === 5 ? PRESET_5_PLAYERS : PRESET_6_PLAYERS;
    const newPlayers = presetNames.map((name, index) => ({
      id: `player-preset-${count}-${index}-${Date.now()}`,
      name,
      joinedAt: Date.now() + index,
    }));
    setPlayers(newPlayers);
    setCustomMatchesCount(null);
  };

  const recommendedMatches = getDefaultMatchCount(players.length);
  const totalMatchesToPlay = customMatchesCount ?? recommendedMatches;

  const handleStart = () => {
    if (players.length < 4) return;
    const config: TournamentConfig = {
      scoringType,
      fixedPointsLimit,
      targetScoreLimit,
      numberOfRounds: 1, // Handled primarily by the total count of matches
    };
    onStartTournament(players, config, totalMatchesToPlay);
  };

  return (
    <div id="registration-view" className="w-full max-w-md mx-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col font-sans">
      {/* Visual Header Banner */}
      <div className="bg-slate-950 p-6 relative flex flex-col gap-1.5 overflow-hidden border-b border-slate-800">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-[#BEF264] rounded-full opacity-10 blur-2xl"></div>
        <div className="flex items-center gap-2">
          <div className="bg-[#BEF264]/10 p-2 rounded-xl text-[#BEF264]">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-[#BEF264]">Americano Scorekeeper</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight mt-1 font-display text-white uppercase italic">PADEL AMERICANO</h1>
        <p className="text-xs text-slate-400 font-sans font-normal">
          Ideal for 5 or 6 players. Every point counts! Generate pairings where everyone plays with everyone.
        </p>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* Quick presets */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#BEF264]" /> Quick Load Presets
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="preset-5-btn"
              onClick={() => handleLoadPreset(5)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                players.length === 5 && players[0].name === PRESET_5_PLAYERS[0]
                  ? 'bg-[#BEF264] border-[#BEF264] text-slate-900 font-extrabold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🎾 5 Players Preset
            </button>
            <button
              type="button"
              id="preset-6-btn"
              onClick={() => handleLoadPreset(6)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                players.length === 6 && players[0].name === PRESET_6_PLAYERS[0]
                  ? 'bg-[#BEF264] border-[#BEF264] text-slate-900 font-extrabold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🎾 6 Players Preset
            </button>
          </div>
        </div>

        {/* Players Section */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#BEF264]" /> Registered Players ({players.length})
            </label>
            {players.length < 4 && (
              <span className="text-[10px] font-black text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/50">
                ⚠️ Need at least 4
              </span>
            )}
          </div>

          {/* Add player form */}
          <form onSubmit={handleAddPlayer} className="flex gap-2 mb-3">
            <input
              type="text"
              id="player-name-input"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Enter player name..."
              maxLength={20}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BEF264]/30 focus:border-[#BEF264] placeholder-slate-500 transition-all text-slate-100"
            />
            <button
              type="submit"
              id="add-player-btn"
              className="bg-[#BEF264] text-slate-900 hover:brightness-115 active:scale-95 p-2.5 rounded-xl transition-all flex items-center justify-center shadow-md shadow-[#BEF264]/10 font-bold"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>

          {/* Player list tags */}
          <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 border border-slate-800 rounded-xl p-2 bg-slate-950/40">
            {players.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 font-sans italic">
                No players added yet. Add players or click a preset above!
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id}
                  id={`player-row-${player.id}`}
                  className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-900 bg-[#BEF264] w-5 h-5 flex items-center justify-center rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{player.name}</span>
                  </div>
                  <button
                    type="button"
                    id={`remove-player-${player.id}`}
                    onClick={() => handleRemovePlayer(player.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configurations Section */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-4.5">
          {/* Scoring style selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
              🏆 Match scoring style
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl">
              <button
                type="button"
                id="score-fixed-btn"
                onClick={() => setScoringType('fixed_points')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  scoringType === 'fixed_points'
                    ? 'bg-slate-800 text-[#BEF264] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fixed Points Total
              </button>
              <button
                type="button"
                id="score-target-btn"
                onClick={() => setScoringType('target_score')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  scoringType === 'target_score'
                    ? 'bg-slate-800 text-[#BEF264] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                First to Target
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              {scoringType === 'fixed_points'
                ? 'Classic Americano: Each match is played until the specified points are reached (e.g., 24). Every point counts for individual tally!'
                : 'Winner take all: Standard padel game style. First team to reach target points (e.g., 15) wins the match.'}
            </p>
          </div>

          {/* Scoring limits */}
          {scoringType === 'fixed_points' ? (
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 flex justify-between">
                <span>Total Match Points Limit</span>
                <span className="text-[#BEF264] font-black">{fixedPointsLimit} pts</span>
              </label>
              <div className="flex gap-2">
                {[16, 24, 32, 40].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFixedPointsLimit(val)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      fixedPointsLimit === val
                        ? 'bg-[#BEF264] border-[#BEF264] text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 flex justify-between">
                <span>First to Target Score Limit</span>
                <span className="text-[#BEF264] font-black">{targetScoreLimit} pts</span>
              </label>
              <div className="flex gap-2">
                {[11, 15, 21].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetScoreLimit(val)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      targetScoreLimit === val
                        ? 'bg-[#BEF264] border-[#BEF264] text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matches Count config */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase">
                ⚔️ Matches in Tournament
              </label>
              {players.length >= 4 && !customMatchesCount && (
                <span className="text-[10px] font-bold text-[#BEF264] bg-[#BEF264]/10 px-2 py-0.5 rounded border border-[#BEF264]/20 flex items-center gap-0.5">
                  ⭐ Recommended
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCustomMatchesCount(Math.max(1, totalMatchesToPlay - 1))}
                disabled={players.length < 4 || totalMatchesToPlay <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-lg font-bold"
              >
                -
              </button>
              
              <div className="flex-1 text-center bg-slate-950 border border-slate-800 py-2 rounded-lg">
                <span className="text-sm font-black text-slate-100">{totalMatchesToPlay}</span>
                <span className="text-xs text-slate-400 block">Matches total</span>
              </div>

              <button
                type="button"
                onClick={() => setCustomMatchesCount(totalMatchesToPlay + 1)}
                disabled={players.length < 4 || totalMatchesToPlay >= 40}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-lg font-bold"
              >
                +
              </button>
            </div>

            {players.length >= 4 && customMatchesCount !== null && customMatchesCount !== recommendedMatches && (
              <button
                type="button"
                onClick={() => setCustomMatchesCount(null)}
                className="text-[11px] text-[#BEF264] hover:text-[#BEF264]/80 font-bold underline mt-1.5 block text-right w-full"
              >
                Reset to perfect mathematical recommendation ({recommendedMatches} matches)
              </button>
            )}

            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              {players.length >= 4
                ? `At ${players.length} players, ${recommendedMatches} matches guarantees a perfect round-robin of balanced partnership and rests.`
                : 'Add at least 4 players to calculate recommended matches.'}
            </p>
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          id="start-tournament-btn"
          onClick={handleStart}
          disabled={players.length < 4}
          className={`w-full py-3.5 rounded-xl font-black tracking-tight transition-all shadow-md flex items-center justify-center gap-2 ${
            players.length >= 4
              ? 'bg-[#BEF264] text-slate-900 hover:brightness-110 active:scale-98 cursor-pointer shadow-[#BEF264]/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50 shadow-none'
          }`}
        >
          <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          <span>START TOURNAMENT 🚀</span>
        </button>
      </div>
    </div>
  );
}
