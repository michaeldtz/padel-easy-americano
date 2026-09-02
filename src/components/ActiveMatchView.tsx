/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, TournamentConfig, MatchPairing, ActiveMatchState, MatchResult } from '../types';
import CourtVisual from './CourtVisual';
import { Undo2, Redo2, Check, AlertCircle, Play, Sparkles, Award, Edit, Keyboard } from 'lucide-react';

interface ActiveMatchViewProps {
  match: MatchPairing;
  totalMatchesCount: number;
  playersMap: Record<string, Player>;
  config: TournamentConfig;
  initialState: ActiveMatchState | null;
  onUpdateState: (state: ActiveMatchState) => void;
  onSubmitResult: (result: MatchResult) => void;
  onSkipMatch?: () => void;
}

export default function ActiveMatchView({
  match,
  totalMatchesCount,
  playersMap,
  config,
  initialState,
  onUpdateState,
  onSubmitResult,
  onSkipMatch,
}: ActiveMatchViewProps) {
  // Resolve players
  const playerA1: Player = playersMap[match.teamA[0]] || { id: 'a1', name: 'Unknown 1', joinedAt: 0 };
  const playerA2: Player = playersMap[match.teamA[1]] || { id: 'a2', name: 'Unknown 2', joinedAt: 0 };
  const playerB1: Player = playersMap[match.teamB[0]] || { id: 'b1', name: 'Unknown 3', joinedAt: 0 };
  const playerB2: Player = playersMap[match.teamB[1]] || { id: 'b2', name: 'Unknown 4', joinedAt: 0 };

  const byesPlayers = match.byes.map(id => playersMap[id]).filter(Boolean) as Player[];

  // Local state for live tracking
  const [scoreA, setScoreA] = useState(initialState?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initialState?.scoreB ?? 0);
  const [currentServerId, setCurrentServerId] = useState<string | null>(initialState?.currentServerId ?? match.teamA[0]);
  const [firstServerId, setFirstServerId] = useState<string | null>(initialState?.firstServerId ?? match.teamA[0]);

  // Redo / Undo history stack
  const [history, setHistory] = useState<ActiveMatchState['history']>(initialState?.history ?? []);
  const [redoStack, setRedoStack] = useState<ActiveMatchState['history']>([]);

  // Direct edit mode vs live button click mode
  const [isDirectInputMode, setIsDirectInputMode] = useState(false);
  const [directScoreA, setDirectScoreA] = useState(String(scoreA));
  const [directScoreB, setDirectScoreB] = useState(String(scoreB));

  // Sync state whenever the match ID changes
  useEffect(() => {
    if (initialState && initialState.matchId === match.id) {
      setScoreA(initialState.scoreA);
      setScoreB(initialState.scoreB);
      setCurrentServerId(initialState.currentServerId);
      setFirstServerId(initialState.firstServerId);
      setHistory(initialState.history);
      setRedoStack([]);
      setDirectScoreA(String(initialState.scoreA));
      setDirectScoreB(String(initialState.scoreB));
    } else {
      setScoreA(0);
      setScoreB(0);
      setCurrentServerId(match.teamA[0]);
      setFirstServerId(match.teamA[0]);
      setHistory([]);
      setRedoStack([]);
      setDirectScoreA('0');
      setDirectScoreB('0');
    }
  }, [match.id, initialState]);

  // Determine limits
  const isFixedPoints = config.scoringType === 'fixed_points';
  const limit = isFixedPoints ? config.fixedPointsLimit : config.targetScoreLimit;
  const currentTotal = scoreA + scoreB;

  // Is match complete?
  let isCompleted = false;
  if (isFixedPoints) {
    isCompleted = currentTotal >= limit;
  } else {
    isCompleted = scoreA >= limit || scoreB >= limit;
  }

  // Update parent state
  const notifyStateChange = (newScoreA: number, newScoreB: number, newServer: string | null, newHistory: ActiveMatchState['history']) => {
    onUpdateState({
      matchId: match.id,
      scoreA: newScoreA,
      scoreB: newScoreB,
      history: newHistory,
      currentServerId: newServer,
      firstServerId,
    });
  };

  const handleAddPoint = (team: 'A' | 'B') => {
    if (isCompleted) return;

    // Save history
    const snapshot = { scoreA, scoreB, serverId: currentServerId };
    const updatedHistory = [...history, snapshot];
    setHistory(updatedHistory);
    setRedoStack([]); // Clear redo on new action

    let nextScoreA = scoreA;
    let nextScoreB = scoreB;

    if (team === 'A') {
      nextScoreA += 1;
      setScoreA(nextScoreA);
      setDirectScoreA(String(nextScoreA));
    } else {
      nextScoreB += 1;
      setScoreB(nextScoreB);
      setDirectScoreB(String(nextScoreB));
    }

    // Auto rotate server every 4 points in Americano
    const nextTotal = nextScoreA + nextScoreB;
    let nextServer = currentServerId;
    if (isFixedPoints && nextTotal % 4 === 0 && nextTotal < limit) {
      // Alternate service through all 4 players
      // Sequence: teamA[0] -> teamB[0] -> teamA[1] -> teamB[1]
      const order = [match.teamA[0], match.teamB[0], match.teamA[1], match.teamB[1]];
      const currentIndex = order.indexOf(currentServerId || match.teamA[0]);
      const nextIndex = (currentIndex + 1) % 4;
      nextServer = order[nextIndex];
      setCurrentServerId(nextServer);
    }

    notifyStateChange(nextScoreA, nextScoreB, nextServer, updatedHistory);
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    // Save current state to redo stack
    setRedoStack(prev => [{ scoreA, scoreB, serverId: currentServerId }, ...prev]);

    setScoreA(previous.scoreA);
    setScoreB(previous.scoreB);
    setCurrentServerId(previous.serverId);
    setHistory(newHistory);
    setDirectScoreA(String(previous.scoreA));
    setDirectScoreB(String(previous.scoreB));

    notifyStateChange(previous.scoreA, previous.scoreB, previous.serverId, newHistory);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);
    setRedoStack(newRedoStack);

    const snapshot = { scoreA, scoreB, serverId: currentServerId };
    const newHistory = [...history, snapshot];
    setHistory(newHistory);

    setScoreA(nextState.scoreA);
    setScoreB(nextState.scoreB);
    setCurrentServerId(nextState.serverId);
    setDirectScoreA(String(nextState.scoreA));
    setDirectScoreB(String(nextState.scoreB));

    notifyStateChange(nextState.scoreA, nextState.scoreB, nextState.serverId, newHistory);
  };

  const handleManualScoreSubmit = () => {
    let parsedA = parseInt(directScoreA, 10);
    let parsedB = parseInt(directScoreB, 10);

    if (isNaN(parsedA) || parsedA < 0) parsedA = 0;
    if (isNaN(parsedB) || parsedB < 0) parsedB = 0;

    // Apply limits if they exceeded in manual input or validate
    setScoreA(parsedA);
    setScoreB(parsedB);
    setIsDirectInputMode(false);

    const snapshot = { scoreA, scoreB, serverId: currentServerId };
    const updatedHistory = [...history, snapshot];
    setHistory(updatedHistory);

    notifyStateChange(parsedA, parsedB, currentServerId, updatedHistory);
  };

  const handleSubmit = () => {
    const result: MatchResult = {
      matchId: match.id,
      scoreA,
      scoreB,
      playedAt: Date.now(),
      isCompleted: true,
    };
    onSubmitResult(result);
  };

  // Serve toggle handler
  const handleSelectServer = (playerId: string) => {
    setCurrentServerId(playerId);
    notifyStateChange(scoreA, scoreB, playerId, history);
  };

  // Quick reset active match
  const handleResetMatch = () => {
    if (window.confirm('Are you sure you want to reset the current match score to 0-0?')) {
      setScoreA(0);
      setScoreB(0);
      setHistory([]);
      setRedoStack([]);
      setCurrentServerId(match.teamA[0]);
      setDirectScoreA('0');
      setDirectScoreB('0');
      notifyStateChange(0, 0, match.teamA[0], []);
    }
  };

  // Progress metrics
  let progressPercent = 0;
  if (isFixedPoints) {
    progressPercent = Math.min(100, (currentTotal / limit) * 100);
  } else {
    const leadingScore = Math.max(scoreA, scoreB);
    progressPercent = Math.min(100, (leadingScore / limit) * 100);
  }

  return (
    <div id="active-match-view" className="w-full max-w-md mx-auto flex flex-col gap-4">
      {/* Top Match Progress Indicator */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-850 shadow-sm flex flex-col gap-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#BEF264] bg-[#BEF264]/10 px-2.5 py-1 rounded-full border border-[#BEF264]/20">
            🎾 Match {match.matchIndex + 1} of {totalMatchesCount}
          </span>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            Mode: {isFixedPoints ? `Fixed Total (${limit} pts)` : `First to ${limit}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCompleted ? 'bg-[#BEF264] animate-pulse' : 'bg-[#BEF264]/80'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
          <span>Match Started</span>
          {isCompleted ? (
            <span className="text-[#BEF264] font-bold flex items-center gap-1 animate-pulse">
              <Award className="w-3.5 h-3.5" /> Complete! Submit score below
            </span>
          ) : isFixedPoints ? (
            <span>{currentTotal} / {limit} points played</span>
          ) : (
            <span>Leading to {limit} points</span>
          )}
        </div>
      </div>

      {/* BIG SCORING PANEL */}
      <div className="bg-slate-900 rounded-2xl border border-slate-850 shadow-md p-4 flex flex-col gap-4">
        {isDirectInputMode ? (
          /* Direct score entry mode */
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Keyboard className="w-4 h-4 text-[#BEF264]" /> Enter final score manually
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-300 font-semibold truncate">
                  {playerA1.name} + {playerA2.name}
                </span>
                <input
                  type="number"
                  pattern="[0-9]*"
                  id="direct-score-a"
                  value={directScoreA}
                  onChange={e => setDirectScoreA(e.target.value)}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-[#BEF264]"
                  placeholder="0"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-300 font-semibold truncate text-right">
                  {playerB1.name} + {playerB2.name}
                </span>
                <input
                  type="number"
                  pattern="[0-9]*"
                  id="direct-score-b"
                  value={directScoreB}
                  onChange={e => setDirectScoreB(e.target.value)}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-[#BEF264]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDirectInputMode(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualScoreSubmit}
                className="flex-1 py-2 rounded-lg bg-[#BEF264] text-slate-900 font-bold text-xs"
              >
                Apply Score
              </button>
            </div>
          </div>
        ) : (
          /* Live Point Counters */
          <div className="flex flex-col gap-3">
            {/* Warning Alert if completed */}
            {isCompleted && (
              <div className="bg-amber-950/40 border border-amber-900/50 text-amber-300 rounded-xl p-3 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Score target met! You can now submit or adjust.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              {/* Team A Clickable Card */}
              <button
                type="button"
                id="add-point-teamA"
                onClick={() => handleAddPoint('A')}
                disabled={isCompleted}
                className={`flex flex-col items-center justify-between p-4 py-6 rounded-2xl border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-slate-950/40 border-slate-800 cursor-default opacity-85' 
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-750 active:scale-97'
                }`}
              >
                <div className="text-[10px] font-bold text-[#BEF264] bg-[#BEF264]/10 px-2.5 py-0.5 rounded uppercase tracking-wider mb-2">
                  Team Left
                </div>
                <div className="text-5xl font-black text-white tracking-tight my-1.5 font-mono">
                  {scoreA}
                </div>
                <div className="text-xs text-slate-300 text-center font-bold line-clamp-2 max-w-[140px] leading-tight">
                  {playerA1.name} &<br /> {playerA2.name}
                </div>
                {!isCompleted && (
                  <span className="mt-3 text-[10px] bg-[#BEF264] text-slate-950 font-black py-1 px-3 rounded-full uppercase shadow-xs">
                    +1 Point
                  </span>
                )}
              </button>

              {/* Team B Clickable Card */}
              <button
                type="button"
                id="add-point-teamB"
                onClick={() => handleAddPoint('B')}
                disabled={isCompleted}
                className={`flex flex-col items-center justify-between p-4 py-6 rounded-2xl border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-slate-950/40 border-slate-800 cursor-default opacity-85' 
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-750 active:scale-97'
                }`}
              >
                <div className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-2.5 py-0.5 rounded uppercase tracking-wider mb-2">
                  Team Right
                </div>
                <div className="text-5xl font-black text-[#BEF264] tracking-tight my-1.5 font-mono">
                  {scoreB}
                </div>
                <div className="text-xs text-slate-300 text-center font-bold line-clamp-2 max-w-[140px] leading-tight">
                  {playerB1.name} &<br /> {playerB2.name}
                </div>
                {!isCompleted && (
                  <span className="mt-3 text-[10px] bg-[#BEF264] text-slate-950 font-black py-1 px-3 rounded-full uppercase shadow-xs">
                    +1 Point
                  </span>
                )}
              </button>
            </div>

            {/* Quick point subtractor / controls */}
            <div className="flex justify-between items-center px-1 mt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  id="undo-point-btn"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 active:scale-95 disabled:opacity-20 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                  title="Undo last point"
                >
                  <Undo2 className="w-4 h-4 text-slate-400" />
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 active:scale-95 disabled:opacity-20 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold"
                  title="Redo undone point"
                >
                  <Redo2 className="w-4 h-4 text-slate-400" />
                  <span>Redo</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDirectScoreA(String(scoreA));
                    setDirectScoreB(String(scoreB));
                    setIsDirectInputMode(true);
                  }}
                  className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-white active:scale-95 flex items-center gap-1 text-xs font-bold"
                >
                  <Edit className="w-3.5 h-3.5 text-[#BEF264]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetMatch}
                  className="p-2 rounded-lg border border-red-950/60 bg-slate-950 text-red-400 hover:bg-red-950/30 active:scale-95 text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Court Component */}
      <div className="bg-slate-900 rounded-2xl border border-slate-850 shadow-md p-4 flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Court Representation</span>
        <CourtVisual
          teamA={[playerA1, playerA2]}
          teamB={[playerB1, playerB2]}
          byes={byesPlayers}
          currentServerId={currentServerId}
          onSelectServer={handleSelectServer}
        />
      </div>

      {/* SUBMISSION BUTTONS */}
      <div className="flex flex-col gap-2 mt-2">
        {isCompleted ? (
          <button
            type="button"
            id="submit-score-btn"
            onClick={handleSubmit}
            className="w-full bg-[#BEF264] text-slate-950 font-black py-4 px-4 rounded-xl shadow-lg shadow-[#BEF264]/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-base hover:brightness-110"
          >
            <Check className="w-5.5 h-5.5 stroke-[2.5]" />
            <span>SUBMIT RESULTS & CONTINUE 🏆</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {onSkipMatch && (
              <button
                type="button"
                onClick={onSkipMatch}
                className="py-3 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-all"
              >
                Skip / Postpone Match
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Mark this match complete with the current score and save?')) {
                  handleSubmit();
                }
              }}
              className="py-3 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1"
            >
              Finish Early ({scoreA}-{scoreB})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
