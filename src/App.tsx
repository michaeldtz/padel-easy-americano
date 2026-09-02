/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, TournamentConfig, MatchPairing, MatchResult, ActiveMatchState, TournamentState } from './types';
import { generateSchedule } from './utils/scheduler';
import { calculateLeaderboard } from './components/LeaderboardView';
import RegistrationView from './components/RegistrationView';
import ActiveMatchView from './components/ActiveMatchView';
import LeaderboardView from './components/LeaderboardView';
import { Trophy, Activity, Dumbbell, Sparkles, RefreshCw, Calendar, Users, Award, ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'padel_americano_tournament_state';

export default function App() {
  const [tournament, setTournament] = useState<TournamentState | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tournament state from localStorage:', e);
    }
    return null;
  });

  // Current sub-view: 'match' | 'leaderboard' | 'celebration'
  const [currentSubView, setCurrentSubView] = useState<'match' | 'leaderboard'>('match');

  // Save state to local storage whenever it changes
  useEffect(() => {
    try {
      if (tournament) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save tournament state to localStorage:', e);
    }
  }, [tournament]);

  // Start a new tournament
  const handleStartTournament = (registeredPlayers: Player[], config: TournamentConfig, totalMatches: number) => {
    const generatedSchedule = generateSchedule(registeredPlayers, totalMatches);

    const firstMatch = generatedSchedule[0];
    const initialActiveMatch: ActiveMatchState | null = firstMatch
      ? {
          matchId: firstMatch.id,
          scoreA: 0,
          scoreB: 0,
          history: [],
          currentServerId: firstMatch.teamA[0],
          firstServerId: firstMatch.teamA[0],
        }
      : null;

    const newTournament: TournamentState = {
      id: `tournament-${Date.now()}`,
      name: `Tournament ${new Date().toLocaleDateString()}`,
      status: 'active',
      players: registeredPlayers,
      config,
      schedule: generatedSchedule,
      results: {},
      currentMatchIndex: 0,
      activeMatchState: initialActiveMatch,
      createdAt: Date.now(),
    };

    setTournament(newTournament);
    setCurrentSubView('match');
  };

  // Update live match scores
  const handleUpdateActiveMatchState = (matchState: ActiveMatchState) => {
    if (!tournament) return;
    setTournament(prev => {
      if (!prev) return null;
      return {
        ...prev,
        activeMatchState: matchState,
      };
    });
  };

  // Submit final score of current match
  const handleSubmitMatchResult = (result: MatchResult) => {
    if (!tournament) return;

    setTournament(prev => {
      if (!prev) return null;

      const updatedResults = {
        ...prev,
        [result.matchId]: result, // Wait, results is a Record<string, MatchResult> in TournamentState. But we need to spread and assign
      };

      // Let's write the results updates safely:
      const newResults = {
        ...prev.results,
        [result.matchId]: result,
      };

      const nextIndex = prev.currentMatchIndex + 1;
      const nextMatch = prev.schedule[nextIndex];

      let nextActiveMatchState: ActiveMatchState | null = null;
      if (nextMatch) {
        nextActiveMatchState = {
          matchId: nextMatch.id,
          scoreA: 0,
          scoreB: 0,
          history: [],
          currentServerId: nextMatch.teamA[0],
          firstServerId: nextMatch.teamA[0],
        };
      }

      return {
        ...prev,
        results: newResults,
        currentMatchIndex: nextIndex < prev.schedule.length ? nextIndex : prev.currentMatchIndex,
        activeMatchState: nextActiveMatchState,
        status: nextIndex >= prev.schedule.length ? 'completed' : prev.status,
      };
    });

    // Automatically navigate to leaderboard to review standings
    setCurrentSubView('leaderboard');
  };

  // Skip / Postpone current match (push to end of schedule)
  const handleSkipMatch = () => {
    if (!tournament) return;
    const currentIndex = tournament.currentMatchIndex;
    const currentMatch = tournament.schedule[currentIndex];
    if (!currentMatch) return;

    if (window.confirm('Postpone this match and move it to the end of the tournament?')) {
      setTournament(prev => {
        if (!prev) return null;

        // Clone schedule and move the active match to the end
        const newSchedule = [...prev.schedule];
        const [skipped] = newSchedule.splice(currentIndex, 1);
        
        // Push to end
        newSchedule.push(skipped);

        // Re-index matchIndex values
        const reindexedSchedule = newSchedule.map((m, idx) => ({
          ...m,
          matchIndex: idx,
        }));

        // Resolve next match active state
        const nextMatch = reindexedSchedule[currentIndex];
        const nextActiveMatchState: ActiveMatchState | null = nextMatch
          ? {
              matchId: nextMatch.id,
              scoreA: 0,
              scoreB: 0,
              history: [],
              currentServerId: nextMatch.teamA[0],
              firstServerId: nextMatch.teamA[0],
            }
          : null;

        return {
          ...prev,
          schedule: reindexedSchedule,
          activeMatchState: nextActiveMatchState,
        };
      });
    }
  };

  // Edit a past score in history
  const handleEditPastScore = (matchId: string, scoreA: number, scoreB: number) => {
    if (!tournament) return;
    setTournament(prev => {
      if (!prev) return null;
      
      const existingResult = prev.results[matchId];
      if (!existingResult) return prev;

      const updatedResult: MatchResult = {
        ...existingResult,
        scoreA,
        scoreB,
        playedAt: Date.now(),
      };

      return {
        ...prev,
        results: {
          ...prev.results,
          [matchId]: updatedResult,
        },
      };
    });
  };

  // Advance to next pairing
  const handleStartNextMatch = () => {
    setCurrentSubView('match');
  };

  // Reset or start completely over
  const handleResetTournament = () => {
    if (window.confirm('Are you sure you want to end this tournament? All logged results will be permanently cleared.')) {
      setTournament(null);
    }
  };

  // Finish early or complete
  const handleFinishTournament = () => {
    if (window.confirm('Do you want to finalize the tournament and crown the champion?')) {
      setTournament(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
        };
      });
    }
  };

  // Resume tournament or edit setup
  const handleBackToSetup = () => {
    if (window.confirm('Go back to Setup? This will erase the current tournament.')) {
      setTournament(null);
    }
  };

  // Helper Map for fast player lookup
  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    if (tournament) {
      tournament.players.forEach(p => {
        map[p.id] = p;
      });
    }
    return map;
  }, [tournament]);

  // Quick simulation tool (extremely helpful for developers and coordinators to test leaderboard standings instantly!)
  const handleSimulateRest = () => {
    if (!tournament) return;
    
    const simulatedResults: Record<string, MatchResult> = { ...tournament.results };
    let currentIndex = tournament.currentMatchIndex;

    tournament.schedule.forEach(match => {
      if (!simulatedResults[match.id]?.isCompleted) {
        // Generate random realistic score
        let scoreA = 0;
        let scoreB = 0;
        if (tournament.config.scoringType === 'fixed_points') {
          const limit = tournament.config.fixedPointsLimit;
          // Split randomly
          scoreA = Math.floor(Math.random() * (limit + 1));
          scoreB = limit - scoreA;
        } else {
          const limit = tournament.config.targetScoreLimit;
          const winnerGetsLimit = Math.random() > 0.5;
          scoreA = winnerGetsLimit ? limit : Math.floor(Math.random() * limit);
          scoreB = !winnerGetsLimit ? limit : Math.floor(Math.random() * limit);
        }

        simulatedResults[match.id] = {
          matchId: match.id,
          scoreA,
          scoreB,
          playedAt: Date.now(),
          isCompleted: true,
        };
        currentIndex++;
      }
    });

    setTournament(prev => {
      if (!prev) return null;
      return {
        ...prev,
        results: simulatedResults,
        currentMatchIndex: prev.schedule.length - 1,
        activeMatchState: null,
        status: 'completed',
      };
    });
    
    setCurrentSubView('leaderboard');
  };

  // Final leaderboard stands
  const finalLeaderboard = tournament ? calculateLeaderboard(tournament.players, tournament.schedule, tournament.results) : [];
  const champion = finalLeaderboard[0];

  return (
    <div id="iphone-wrapper" className="min-h-screen bg-slate-950 flex justify-center py-0 sm:py-6 px-0 sm:px-4 font-sans text-slate-100 antialiased selection:bg-[#BEF264]/30">
      
      {/* iPhone shell frame style for desktops, full-bleed on mobile */}
      <div 
        id="app-container" 
        className="w-full max-w-md bg-slate-950 min-h-screen sm:min-h-[850px] sm:max-h-[920px] sm:rounded-[40px] sm:shadow-2xl sm:border-[12px] sm:border-slate-900 overflow-y-auto relative flex flex-col scrollbar-thin pb-8 border-slate-900"
      >
        
        {/* iOS Top Notch Simulator for Desktop View */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-900 rounded-b-2xl z-50"></div>

        {/* TOP STATUS BAR ACCENTS */}
        <div className="bg-slate-950 text-slate-400 px-6 pt-3 pb-1 flex justify-between items-center text-[10px] font-bold tracking-tight select-none pointer-events-none sm:pt-6 border-b border-slate-900">
          <span className="font-mono text-[#BEF264]">Padel App v1.0</span>
          <div className="flex items-center gap-1">
            <span>● Court 1 Connected</span>
          </div>
        </div>

        {/* TOURNAMENT HEADER */}
        {tournament && (
          <header className="bg-slate-900 text-slate-100 px-5 pb-5 pt-3 border-b border-slate-800 flex flex-col gap-2 shadow-md relative shrink-0">
            <div className="flex justify-between items-center">
              <button 
                type="button" 
                id="back-to-setup-btn"
                onClick={handleBackToSetup}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors bg-slate-800 py-1.5 px-3 rounded-lg border border-slate-750 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Exit Setup</span>
              </button>
              
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Tournament status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  tournament.status === 'completed' 
                    ? 'bg-[#BEF264] text-slate-950 font-black' 
                    : 'bg-[#BEF264]/10 text-[#BEF264] border border-[#BEF264]/20'
                }`}>
                  {tournament.status === 'completed' ? '🏆 Completed' : '🎾 In Progress'}
                </span>
              </div>
            </div>

            <div className="mt-1">
              <h2 className="text-lg font-black tracking-tight uppercase italic">{tournament.name}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-[#BEF264]" /> {tournament.players.length} Players
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#BEF264]" /> {tournament.schedule.length} matches total
                </span>
              </div>
            </div>

            {/* Quick Test simulator bar - hidden if tournament is already completed */}
            {tournament.status !== 'completed' && (
              <button
                type="button"
                onClick={handleSimulateRest}
                className="absolute right-5 bottom-4 text-[10px] bg-[#BEF264] hover:brightness-110 active:scale-95 text-slate-950 font-extrabold py-1 px-2.5 rounded-md shadow flex items-center gap-1 cursor-pointer"
                title="Instantly simulates match scores to test leaderboard!"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Simulate All ⚡</span>
              </button>
            )}
          </header>
        )}

        {/* ACTIVE NAVIGATION TAB BAR (IF ACTIVE TOURNAMENT) */}
        {tournament && tournament.status !== 'completed' && (
          <nav className="bg-slate-950 border-b border-slate-900 grid grid-cols-2 text-center text-xs font-bold text-slate-400 select-none shrink-0 shadow-xs">
            <button
              type="button"
              id="nav-scorer-tab"
              onClick={() => setCurrentSubView('match')}
              className={`py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                currentSubView === 'match'
                  ? 'border-[#BEF264] text-[#BEF264] bg-slate-900/40 font-extrabold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>On-Court Scorer</span>
            </button>
            <button
              type="button"
              id="nav-standings-tab"
              onClick={() => setCurrentSubView('leaderboard')}
              className={`py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                currentSubView === 'leaderboard'
                  ? 'border-[#BEF264] text-[#BEF264] bg-slate-900/40 font-extrabold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Standings / Schedule</span>
            </button>
          </nav>
        )}

        {/* MAIN VIEWS SWITCHER */}
        <main className="flex-1 p-4 flex flex-col justify-start">
          {!tournament ? (
            /* Screen 1: Registration View */
            <RegistrationView onStartTournament={handleStartTournament} />
          ) : tournament.status === 'completed' ? (
            /* CELEBRATION / CHAMPION SCREEN */
            <div id="celebration-view" className="w-full max-w-md mx-auto flex flex-col gap-5 text-center p-3 animate-fade-in">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
                
                {/* Floating graphic elements */}
                <div className="absolute -left-4 -top-4 w-20 h-20 bg-[#BEF264] rounded-full opacity-5 blur-xl"></div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#BEF264] rounded-full opacity-5 blur-xl"></div>
                
                <div className="w-18 h-18 bg-[#BEF264]/10 rounded-full flex items-center justify-center text-3xl mb-4 shadow border border-[#BEF264]/20 animate-bounce">
                  🏆
                </div>
                
                <span className="text-[10px] font-black text-[#BEF264] uppercase tracking-widest bg-[#BEF264]/10 border border-[#BEF264]/20 px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#BEF264]" /> Tournament Champion
                </span>

                <h2 className="text-3xl font-black tracking-tight text-white mt-3 font-sans uppercase italic">
                  {champion ? champion.playerName : 'No Winner'}
                </h2>

                <div className="text-xs text-slate-400 mt-1 font-medium">
                  Scored <strong className="text-[#BEF264] font-extrabold text-sm">{champion ? champion.pointsFor : 0}</strong> individual points total!
                </div>

                <div className="w-full border-t border-dashed border-slate-800 my-5"></div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Award className="w-4 h-4 text-[#BEF264]" /> Final Standings Podium
                </h3>

                <div className="w-full flex flex-col gap-2">
                  {finalLeaderboard.slice(0, 3).map((stats, index) => {
                    const medals = ['🥇 Gold', '🥈 Silver', '🥉 Bronze'];
                    return (
                      <div 
                        key={stats.playerId} 
                        className={`flex justify-between items-center px-4 py-3 rounded-xl border ${
                          index === 0 
                            ? 'bg-[#BEF264]/10 border-[#BEF264]/30 text-white font-bold' 
                            : 'bg-slate-950 border-slate-850 text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-semibold">{medals[index]}</span>
                        <span className="text-xs font-extrabold">{stats.playerName}</span>
                        <span className="text-xs font-mono font-black text-[#BEF264]">{stats.pointsFor} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard details tab overlay */}
              <div className="bg-slate-900 rounded-2xl border border-slate-850 p-4 shadow-md text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">All standings</span>
                <div className="flex flex-col divide-y divide-slate-800">
                  {finalLeaderboard.map((stats, idx) => (
                    <div key={stats.playerId} className="flex justify-between py-2 text-xs font-sans items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-slate-950 border border-slate-850 font-mono text-[10px] font-bold rounded-full flex items-center justify-center text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{stats.playerName}</span>
                      </div>
                      <div className="flex gap-4 font-mono text-slate-400">
                        <span>Diff: <strong className={stats.pointDifference >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.pointDifference >= 0 ? `+${stats.pointDifference}` : stats.pointDifference}</strong></span>
                        <span>Points: <strong className="text-[#BEF264] font-extrabold">{stats.pointsFor}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete Reset Button */}
              <button
                type="button"
                id="new-tournament-celebration-btn"
                onClick={handleResetTournament}
                className="w-full bg-[#BEF264] text-slate-950 font-black py-4 px-4 rounded-xl shadow-lg shadow-[#BEF264]/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              >
                <Dumbbell className="w-5 h-5 stroke-[2.5]" />
                <span>START A NEW TOURNAMENT 🎾</span>
              </button>
            </div>
          ) : currentSubView === 'match' ? (
            /* Screen 2: Active Match View */
            tournament.activeMatchState ? (
              <ActiveMatchView
                match={tournament.schedule[tournament.currentMatchIndex]}
                totalMatchesCount={tournament.schedule.length}
                playersMap={playersMap}
                config={tournament.config}
                initialState={tournament.activeMatchState}
                onUpdateState={handleUpdateActiveMatchState}
                onSubmitResult={handleSubmitMatchResult}
                onSkipMatch={handleSkipMatch}
              />
            ) : (
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-850 shadow text-center py-12 flex flex-col items-center">
                <Trophy className="w-12 h-12 text-[#BEF264] mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-200">No active match pairing found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed font-sans">
                  All generated pairings have been scored! Check the standings view or finalize this tournament.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentSubView('leaderboard')}
                  className="mt-5 bg-[#BEF264] text-slate-950 font-black py-2.5 px-4 rounded-lg text-xs hover:brightness-110 cursor-pointer"
                >
                  View Leaderboard & Standings
                </button>
              </div>
            )
          ) : (
            /* Screen 3: Leaderboard & Schedule View */
            <LeaderboardView
              players={tournament.players}
              schedule={tournament.schedule}
              results={tournament.results}
              config={tournament.config}
              onEditPastScore={handleEditPastScore}
              onStartNextMatch={handleStartNextMatch}
              onResetTournament={handleResetTournament}
              onFinishTournament={handleFinishTournament}
              isTournamentFinished={tournament.status === 'completed'}
            />
          )}
        </main>
      </div>
    </div>
  );
}
