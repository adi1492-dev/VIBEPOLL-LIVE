/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Tv, 
  Trash2, 
  Settings, 
  BarChart3, 
  Compass, 
  Vote as VoteIcon,
  Layers, 
  Calendar, 
  FileCheck,
  UserCheck, 
  RefreshCw,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Poll } from './types';
import { PollCreate } from './components/PollCreate';
import { PollPresenter } from './components/PollPresenter';
import { PollVoter } from './components/PollVoter';

export default function App() {
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'presenter' | 'creator' | 'voter'>('dashboard');
  const [voterPollId, setVoterPollId] = useState<string | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  
  // Dashboard poll storage
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  // 1. Detect voter routing or dashboard loading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('voterId') || params.get('vId');
    
    if (vId) {
      setVoterPollId(vId);
      setCurrentSection('voter');
    } else {
      fetchActivePolls();
    }
  }, []);

  // Fetch all active/draft/ended polls from Express server
  const fetchActivePolls = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      const response = await fetch('/api/polls');
      if (response.ok) {
        const data = await response.json();
        // Sort descending by creation date
        setPolls(data.sort((a: Poll, b: Poll) => b.createdAt - a.createdAt));
      } else {
        setErrorText('Failed to reload polls from database.');
      }
    } catch (err) {
      console.error(err);
      setErrorText('Error connecting to Server API. Deploying engine...');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a specific poll
  const handleDeletePoll = async (id: string, question: string) => {
    if (!confirm(`Are you sure you want to permanently delete poll "${question}"?`)) return;
    
    try {
      const response = await fetch(`/api/polls/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchActivePolls();
      } else {
        alert('Could not delete poll.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Navigations helpers for Voter mapping on index
  const loadVoterTestingSim = (id: string) => {
    // We override local tester hash so we simulate voter URL path manually
    const testUrl = `${window.location.origin}/?voterId=${id}`;
    window.history.pushState({}, '', testUrl);
    setVoterPollId(id);
    setCurrentSection('voter');
  };

  const handleCreatedPollTransit = (newPoll: Poll) => {
    setSelectedPollId(newPoll.id);
    setCurrentSection('presenter');
    fetchActivePolls(); // update background
  };

  const exitPollVoterView = () => {
    // Reset query parameters cleanly
    window.history.pushState({}, '', window.location.origin);
    setVoterPollId(null);
    setCurrentSection('dashboard');
    fetchActivePolls();
  };

  // 2. Voter Landing Scene Rendering Flow (Standalone Mode)
  if (currentSection === 'voter' && voterPollId) {
    return (
      <div className="relative min-h-screen bg-[#020617] text-slate-100 font-sans flex items-center justify-center p-4 overflow-hidden">
        {/* Background Glow Effects */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-purple-900/10 rounded-full blur-[100px] rotate-12 pointer-events-none z-0"></div>

        <div className="relative z-10 w-full space-y-4">
          <div className="w-full max-w-lg mx-auto flex items-center justify-between px-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase select-none tracking-widest">
              <Compass className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              Host Polling Node
            </span>
            <button
              onClick={exitPollVoterView}
              className="text-xxs font-bold text-cyan-400 hover:text-cyan-300 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all cursor-pointer uppercase tracking-wider"
            >
              Exit to Creator Dashboard
            </button>
          </div>
          <PollVoter pollId={voterPollId} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background Glow Effects */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-purple-900/10 rounded-full blur-[100px] rotate-12 pointer-events-none z-0"></div>

      {/* GLOBAL BANNER NAV */}
      <header className="sticky top-0 z-45 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 px-4 md:px-10 py-4 flex justify-between items-center max-w-7xl mx-auto rounded-b-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <VoteIcon className="w-5 h-5 text-white stroke-[2.5] animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight text-white uppercase flex items-center gap-1 select-none">
              VIBEPOLL <span className="text-cyan-400 font-normal">LIVE</span>
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase hidden sm:block">
              PLATFORM PRESENTERS • NODE: SSE PORT 3000
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-2 relative z-10">
          {currentSection !== 'dashboard' && (
            <button
              onClick={() => {
                setCurrentSection('dashboard');
                fetchActivePolls();
              }}
              className="py-2 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-700/50"
            >
              Dashboard Home
            </button>
          )}

          {currentSection === 'dashboard' && (
            <button
              onClick={() => setCurrentSection('creator')}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold tracking-wider uppercase rounded-full shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              New Poll Session
            </button>
          )}
        </nav>
      </header>

      {/* CORE FRAME CONTAINER FOR MULTIPLE VISUAL CHANNELS */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
        {currentSection === 'creator' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentSection('dashboard')}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Creator Dashboard
            </button>
            <PollCreate onPollCreated={handleCreatedPollTransit} />
          </div>
        )}

        {currentSection === 'presenter' && selectedPollId && (
          <PollPresenter 
            pollId={selectedPollId} 
            onBack={() => {
              setCurrentSection('dashboard');
              fetchActivePolls();
            }} 
          />
        )}

        {currentSection === 'dashboard' && (
          <div className="space-y-8 relative z-10" id="dashboard-landing-container">
            {/* 1. Hero Landing Welcome Area */}
            <div className="p-8 md:p-12 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-lg relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-8">
              <div className="space-y-4 max-w-xl text-left z-10">
                <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xxs font-extrabold tracking-widest uppercase rounded-full">
                  ⚡ SUPERCHARGED LIVE SSE POLLS
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight italic">
                  Which framework are you prioritizing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 underline decoration-indigo-500/30">production apps</span> this year?
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The ultimately optimized, zero-latency system featuring automatic QR code projections, real-time live progressive SVG graphs, demographic response segmenting, and instant quiz scoring.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setCurrentSection('creator')}
                    className="py-3 px-6 rounded-full bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/40 hover:shadow-indigo-500/50 cursor-pointer"
                  >
                    Build First Poll Template
                  </button>
                  <button
                    onClick={() => {
                      setCurrentSection('creator');
                    }}
                    className="py-3 px-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    Hydrate Template Presets
                  </button>
                </div>
              </div>

              {/* Decorative side stats card block matching client visualization styling */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 w-full lg:w-80 shadow-2xl backdrop-blur-lg space-y-4 select-none self-stretch flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      SYSTEM CAPACITY
                    </h4>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-bold rounded border border-cyan-500/30">LIVE</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lightweight unidirected real-time text stream updating audiences dynamically in &lt;10ms.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="block text-xxs text-slate-500 font-bold tracking-wider uppercase">Latency</span>
                    <span className="block text-lg font-bold text-cyan-400 font-mono tracking-tight mt-0.5">&lt;0.5s</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="block text-xxs text-slate-500 font-bold tracking-wider uppercase">Scale</span>
                    <span className="block text-lg font-bold text-indigo-400 font-mono tracking-tight mt-0.5">500+ Cap</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-850 pt-3 flex justify-between font-mono">
                  <span>Version Node: v2.4.0</span>
                  <span className="text-cyan-400">Port Binding: 3000</span>
                </div>
              </div>
            </div>

            {/* 2. Main Dashboard Activity List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 italic">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    All Live Sessions & Drafts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Launch active clocks and view instant live results summary.
                  </p>
                </div>
                
                <button
                  onClick={fetchActivePolls}
                  className="p-2 text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/60 backdrop-blur rounded-xl cursor-pointer transition-colors"
                  title="Reload Session Data Status"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>

              {errorText && (
                <div className="p-3.5 border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 rounded-xl animate-fade-in">
                  {errorText}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-48 bg-slate-900/40 border border-slate-800/80 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : polls.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 space-y-4">
                  <Layers className="w-12 h-12 text-slate-600 mx-auto" />
                  <div>
                    <h4 className="text-slate-300 font-bold text-sm">No Live Poll Sessions Yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Click the "New Poll Session" or load predefined icebreakers on the sidebar of the builder.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentSection('creator')}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-full transition-all shadow-md cursor-pointer"
                  >
                    Build a Quick Poll
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {polls.map((poll) => {
                    const isDraft = poll.status === 'draft';
                    const isActive = poll.status === 'active';
                    const isEnded = poll.status === 'ended';
                    
                    return (
                      <div
                        key={poll.id}
                        className="p-5 rounded-3xl bg-slate-900/50 border border-slate-805 hover:border-indigo-500/40 backdrop-blur shadow-lg flex flex-col justify-between h-52 select-none hover:shadow-indigo-500/5 hover:scale-[1.01] transition-all duration-300"
                        id={`dashboard-poll-card-${poll.id}`}
                      >
                        {/* Upper Card Block */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center gap-2">
                            {/* Status Badge */}
                            {isDraft && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700/50">
                                Draft Session
                              </span>
                            )}
                            {isActive && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 tracking-wider">
                                  Live Active
                                </span>
                              </div>
                            )}
                            {isEnded && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 tracking-wider font-semibold">
                                Complete
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-bold font-mono">
                              {poll.votes.length} {poll.votes.length === 1 ? 'Vote' : 'Votes'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-100 line-clamp-2 leading-relaxed font-display">
                            {poll.question}
                          </h4>
                        </div>

                        {/* Lower Interaction Row */}
                        <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center gap-1.5">
                          <div className="flex gap-1.5">
                            {/* Presenter controls navigation */}
                            <button
                              onClick={() => {
                                setSelectedPollId(poll.id);
                                setCurrentSection('presenter');
                              }}
                              className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xxs uppercase tracking-wider rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/10"
                              title="Launch Speaker/Presenter control panel"
                            >
                              <Tv className="w-3 h-3 fill-white" />
                              Presenter View
                            </button>

                            {/* Voter simulation testing */}
                            <button
                              onClick={() => loadVoterTestingSim(poll.id)}
                              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-705 text-slate-200 text-xxs font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-1 cursor-pointer"
                              title="Launch voter simulation screen of this poll"
                            >
                              <VoteIcon className="w-3 h-3 text-cyan-400" />
                              Voter Link
                            </button>
                          </div>

                          {/* Delete session button icon */}
                          <button
                            onClick={() => handleDeletePoll(poll.id, poll.question)}
                            className="p-1.5 border border-transparent rounded-full hover:border-rose-900/30 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Delete Poll Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
