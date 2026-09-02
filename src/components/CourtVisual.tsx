/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player } from '../types';

interface CourtVisualProps {
  teamA: [Player, Player];
  teamB: [Player, Player];
  byes: Player[];
  currentServerId: string | null;
  onSelectServer: (playerId: string) => void;
}

export default function CourtVisual({
  teamA,
  teamB,
  byes,
  currentServerId,
  onSelectServer,
}: CourtVisualProps) {
  return (
    <div id="court-container" className="w-full flex flex-col items-center">
      {/* Padel Court Graphic */}
      <div 
        id="padel-court" 
        className="relative w-full aspect-[2/1] bg-slate-950 rounded-xl border-4 border-slate-800 shadow-inner overflow-hidden p-1 flex items-center"
      >
        {/* Court Markings */}
        {/* Outer Boundary Line */}
        <div className="absolute inset-2 border border-slate-700/60 pointer-events-none rounded-lg"></div>
        
        {/* Center Net */}
        <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] border-l-2 border-dashed border-slate-600/40 pointer-events-none z-10 flex flex-col justify-between py-1">
          <div className="w-[6px] h-[6px] bg-slate-700 rounded-full -ml-[3px] shadow border border-slate-600"></div>
          <div className="w-1 h-full bg-slate-800/40"></div>
          <div className="w-[6px] h-[6px] bg-slate-700 rounded-full -ml-[3px] shadow border border-slate-600"></div>
        </div>

        {/* Left Side Service Line */}
        <div className="absolute top-4 bottom-4 left-[20%] border-r border-slate-700/60 pointer-events-none"></div>
        {/* Left Center Line */}
        <div className="absolute top-1/2 left-[20%] right-1/2 border-t border-slate-700/60 -mt-[1px] pointer-events-none"></div>

        {/* Right Side Service Line */}
        <div className="absolute top-4 bottom-4 right-[20%] border-l border-slate-700/60 pointer-events-none"></div>
        {/* Right Center Line */}
        <div className="absolute top-1/2 left-1/2 right-[20%] border-t border-slate-700/60 -mt-[1px] pointer-events-none"></div>

        {/* PLAYERS ON COURT */}
        {/* Team A Side (Left) */}
        <div className="absolute left-[8%] right-1/2 top-0 bottom-0 flex flex-col justify-around py-4 z-20">
          {teamA.map((player, idx) => {
            const isServing = player.id === currentServerId;
            return (
              <button
                key={player.id}
                id={`court-player-${player.id}`}
                onClick={() => onSelectServer(player.id)}
                className={`relative flex items-center gap-2 self-start px-3 py-1.5 rounded-full border transition-all duration-300 shadow-md ${
                  isServing
                    ? 'bg-[#BEF264] border-[#BEF264] text-slate-950 font-bold ring-4 ring-[#BEF264]/20 scale-105'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:scale-102'
                }`}
              >
                {/* Position Marker */}
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
                  isServing ? 'bg-slate-950 text-[#BEF264]' : 'bg-slate-800 text-slate-400'
                }`}>
                  {idx === 0 ? 'L' : 'R'}
                </span>
                
                <span className="text-xs font-bold max-w-[80px] truncate">{player.name}</span>

                {isServing && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#BEF264] rounded-full border border-slate-950 flex items-center justify-center animate-bounce shadow text-[10px]">
                    🎾
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Team B Side (Right) */}
        <div className="absolute left-1/2 right-[8%] top-0 bottom-0 flex flex-col justify-around py-4 z-20 items-end">
          {teamB.map((player, idx) => {
            const isServing = player.id === currentServerId;
            return (
              <button
                key={player.id}
                id={`court-player-${player.id}`}
                onClick={() => onSelectServer(player.id)}
                className={`relative flex items-center gap-2 self-end px-3 py-1.5 rounded-full border transition-all duration-300 shadow-md ${
                  isServing
                    ? 'bg-[#BEF264] border-[#BEF264] text-slate-950 font-bold ring-4 ring-[#BEF264]/20 scale-105'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:scale-102'
                }`}
              >
                {isServing && (
                  <span className="absolute -top-1 -left-1 w-4.5 h-4.5 bg-[#BEF264] rounded-full border border-slate-950 flex items-center justify-center animate-bounce shadow text-[10px]">
                    🎾
                  </span>
                )}
                
                <span className="text-xs font-bold max-w-[80px] truncate">{player.name}</span>
                
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
                  isServing ? 'bg-slate-950 text-[#BEF264]' : 'bg-slate-800 text-slate-400'
                }`}>
                  {idx === 0 ? 'R' : 'L'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tap Instruction */}
      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-sans">
        <span className="text-[#BEF264]">💡</span> <span>Tap a player on the court to hand them the serve (🎾)</span>
      </div>

      {/* Bench / resting area */}
      {byes.length > 0 && (
        <div id="court-bench" className="w-full mt-4 bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Resting on Bench</span>
          <div className="flex flex-wrap gap-2">
            {byes.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full shadow-xs"
              >
                <span className="text-sm">🛋️</span>
                <span className="text-xs font-medium text-slate-200">{player.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Rest</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
