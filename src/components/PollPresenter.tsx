/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  Maximize2, 
  Share2, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Award, 
  Users, 
  Clock, 
  ChevronLeft, 
  Compass, 
  CheckCircle,
  HelpCircle,
  Calendar,
  Filter,
  Monitor,
  Zap,
  Percent,
  Timer
} from 'lucide-react';
import { Poll, Vote } from '../types';
import { AnimatedCharts } from './AnimatedCharts';
import { ConfettiEffect } from './ConfettiEffect';
import QRCode from 'qrcode';

interface PollPresenterProps {
  pollId: string;
  onBack: () => void;
}

export const PollPresenter: React.FC<PollPresenterProps> = ({ pollId, onBack }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Real-time states
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSpeakerView, setIsSpeakerView] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');
  const [confettiActive, setConfettiActive] = useState(false);
  
  // Filtering analytical states
  const [selectedDemographicFilter, setSelectedDemographicFilter] = useState<string>('All');
  const [selectedDemoValueFilter, setSelectedDemoValueFilter] = useState<string>('All');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load details and connect to SSE stream
  useEffect(() => {
    if (!pollId) return;

    // Initial Fetch
    fetch(`/api/polls/${pollId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Poll not found');
        return res.json();
      })
      .then((data: Poll) => {
        setPoll(data);
      })
      .catch((err) => console.error('Error fetching poll:', err));

    // Connect SSE Stream with Long-Polling Fallback for Serverless
    let eventSource: EventSource | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    function connectSSE() {
      eventSource = new EventSource(`/api/polls/${pollId}/stream`);
      
      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const updatedPoll: Poll = JSON.parse(event.data);
          setPoll((prev) => {
            // If the poll status just transitioned from active to ended, trigger confetti
            if (prev && prev.status === 'active' && updatedPoll.status === 'ended') {
              setConfettiActive(true);
            }
            return updatedPoll;
          });
        } catch (err) {
          console.error('Error parsing SSE json:', err);
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE disconnected. Re-routing client fallback to long-polling...');
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        if (!intervalId) {
          intervalId = setInterval(async () => {
            try {
              const res = await fetch(`/api/polls/${pollId}`);
              if (res.ok) {
                const updatedPoll: Poll = await res.json();
                setPoll((prev) => {
                  if (prev && prev.status === 'active' && updatedPoll.status === 'ended') {
                    setConfettiActive(true);
                  }
                  return updatedPoll;
                });
              }
            } catch (err) {
              console.error('Poller failed:', err);
            }
          }, 2500);
        }
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (intervalId) clearInterval(intervalId);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollId]);

  // 2. Local countdown tick calculations for display
  useEffect(() => {
    if (!poll || poll.status !== 'active' || !poll.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const updateTimer = () => {
      const remainingSeconds = Math.max(0, Math.ceil((poll.expiresAt! - Date.now()) / 1000));
      setTimeRemaining(remainingSeconds);

      if (remainingSeconds <= 0 && poll.status === 'active') {
        // Poll ended
        setConfettiActive(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  // 3. Sync and generate Large Presenter QR Code on poll details change
  useEffect(() => {
    if (!pollId) return;
    const shareableUrl = `${window.location.origin}/?voterId=${pollId}`;
    
    QRCode.toDataURL(shareableUrl, { margin: 1, scale: 7 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Error generating presentation qr:', err));
  }, [pollId]);

  // Action: Launch the countdown timer
  const handleLaunchPoll = async () => {
    try {
      const token = localStorage.getItem('vibepoll_admin_token');
      const res = await fetch(`/api/polls/${pollId}/launch`, { 
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const updatedPoll = await res.json();
        setPoll(updatedPoll);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Reset the session data
  const handleResetPoll = async () => {
    if (!confirm('Are you sure you want to clear all votes and reset this poll to Draft?')) return;
    setConfettiActive(false);
    setSelectedDemographicFilter('All');
    setSelectedDemoValueFilter('All');
    try {
      const token = localStorage.getItem('vibepoll_admin_token');
      const res = await fetch(`/api/polls/${pollId}/reset`, { 
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const updatedPoll = await res.json();
        setPoll(updatedPoll);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Memoized: Compute filtered votes list based on selected demographics
  const filteredVotes = useMemo(() => {
    if (!poll) return [];
    if (selectedDemographicFilter === 'All' || selectedDemoValueFilter === 'All') {
      return poll.votes;
    }
    return poll.votes.filter(
      (v) => v.demographics[selectedDemographicFilter] === selectedDemoValueFilter
    );
  }, [poll, selectedDemographicFilter, selectedDemoValueFilter]);

  // Calculate stats based on filtered votes
  const totalVotesCount = poll ? poll.votes.length : 0;
  const filteredVotesCount = filteredVotes.length;

  const chartData = useMemo(() => {
    if (!poll) return [];

    const votesMap = poll.options.reduce((acc, opt) => {
      acc[opt.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    filteredVotes.forEach((v) => {
      if (votesMap[v.optionId] !== undefined) {
        votesMap[v.optionId]++;
      }
    });

    const isTimerEnded = poll.status === 'ended' || (poll.expiresAt && Date.now() >= poll.expiresAt);

    return poll.options.map((opt) => {
      const votes = votesMap[opt.id];
      const percentage = filteredVotesCount > 0 ? Math.round((votes / filteredVotesCount) * 100) : 0;
      const isCorrect = poll.quizMode && opt.id === poll.correctOptionId;
      return {
        id: opt.id,
        label: opt.text,
        votes,
        percentage,
        isCorrect,
        showCorrectBorder: isTimerEnded && isCorrect,
      };
    });
  }, [poll, filteredVotes, filteredVotesCount]);

  // Find overall leader based on ALL votes
  const leaderOption = useMemo(() => {
    if (!poll || poll.votes.length === 0) return null;
    
    const countMap: Record<string, number> = {};
    poll.votes.forEach((v) => {
      countMap[v.optionId] = (countMap[v.optionId] || 0) + 1;
    });

    let bestId = '';
    let max = -1;
    Object.entries(countMap).forEach(([id, qty]) => {
      if (qty > max) {
        max = qty;
        bestId = id;
      }
    });

    return poll.options.find((o) => o.id === bestId) || null;
  }, [poll]);

  // Analytics helper stats
  const latencyStats = useMemo(() => {
    if (!poll || poll.votes.length === 0) return { avg: 0, fastest: 0 };
    const validTimes = poll.votes.map(v => v.responseTimeMs).filter(t => t > 0);
    if (validTimes.length === 0) return { avg: 0, fastest: 0 };

    const sum = validTimes.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round((sum / validTimes.length) / 100) / 10, // in seconds
      fastest: Math.round(Math.min(...validTimes) / 100) / 10
    };
  }, [poll]);

  // Dynamic values selection list for demonic filters
  const demographicValuesList = useMemo(() => {
    if (!poll || selectedDemographicFilter === 'All') return [];
    const target = poll.demographics.find(f => f.name === selectedDemographicFilter);
    return target ? target.options : [];
  }, [poll, selectedDemographicFilter]);

  if (!poll) {
    return (
      <div className="max-w-md mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-indigo-500 border-dashed rounded-full animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Opening presenter monitor tunnel...</p>
      </div>
    );
  }

  const isExpired = poll.status === 'ended' || (poll.expiresAt && Date.now() >= poll.expiresAt);

  return (
    <div className="w-full space-y-6" id="presenter-monitor-view">
      {/* Dynamic particles Confetti triggers when status ends */}
      <ConfettiEffect active={confettiActive} type="fireworks" />

      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-xl backdrop-blur-lg mb-6">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2 mr-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800/60 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-cyan-400 tracking-wider font-display uppercase select-none">PRESENTATION MONITOR</h2>
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-450 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'}`} />
            </div>
            <p className="text-xs text-slate-300 font-semibold truncate mt-0.5">Poll URI: {poll.question}</p>
          </div>
        </div>

        {/* Presenter controls box */}
        <div className="flex flex-wrap items-center gap-2">
          {poll.status === 'draft' && (
            <button
              onClick={handleLaunchPoll}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-full shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all duration-200"
            >
              <Play className="w-3.5 h-3.5 fill-white stroke-[2.5]" />
              Launch Live Poll
            </button>
          )}

          {(poll.status === 'active' || poll.status === 'ended') && (
            <button
              onClick={handleResetPoll}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 hover:border-slate-600 font-semibold text-xs rounded-full flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset & Restart
            </button>
          )}

          <button
            onClick={() => setIsSpeakerView(true)}
            className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all duration-200"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Speaker Projection
          </button>
        </div>
      </div>

      {/* DUAL CORES CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Real-time Charts & Demographics filter */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-4 backdrop-blur-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-1.5 font-display select-none italic">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Live Dynamic Charts
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">
                  Visual presentation charts growing instantly in real-time as choices land.
                </p>
              </div>

              {/* Toggles bar vs donut */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-800">
                <button
                  onClick={() => setChartType('bar')}
                  className={`py-1.5 px-3.5 rounded-full text-xxs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === 'bar' ? 'bg-slate-800 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-slate-250'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  BAR TRACKS
                </button>
                <button
                  onClick={() => setChartType('donut')}
                  className={`py-1.5 px-3.5 rounded-full text-xxs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === 'donut' ? 'bg-slate-800 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-slate-250'
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  RADIUS RING
                </button>
              </div>
            </div>

            {/* Demographics segmentation selectors filter */}
            {poll.demographics.length > 0 && (
              <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/80 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyan-400" />
                  Segment Results:
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedDemographicFilter}
                    onChange={(e) => {
                      setSelectedDemographicFilter(e.target.value);
                      setSelectedDemoValueFilter('All');
                    }}
                    className="py-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="All">All Segmentation (Overall)</option>
                    {poll.demographics.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  {selectedDemographicFilter !== 'All' && (
                    <select
                      value={selectedDemoValueFilter}
                      onChange={(e) => setSelectedDemoValueFilter(e.target.value)}
                      className="py-1 px-2.5 bg-cyan-950/30 border border-cyan-800/30 rounded-lg text-xs font-bold text-cyan-400 outline-none animate-fade-in cursor-pointer"
                    >
                      <option value="All">All Values</option>
                      {demographicValuesList.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedDemographicFilter !== 'All' && selectedDemoValueFilter !== 'All' && (
                  <span className="text-xxs text-cyan-400 font-mono ml-auto">
                    Filtering {filteredVotesCount} of {totalVotesCount} votes
                  </span>
                )}
              </div>
            )}

            {/* Visual Chart Container */}
            <div className="pt-2 min-h-[180px] flex items-center justify-center">
              {filteredVotesCount === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Users className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">No response data matches current filter filter.</p>
                  <p className="text-[10px] text-slate-500">Wait for participants to place choice coordinates.</p>
                </div>
              ) : (
                <AnimatedCharts
                  data={chartData}
                  type={chartType}
                  themeColor={poll.theme}
                  totalVotes={filteredVotesCount}
                />
              )}
            </div>
          </div>

          {/* Presenter metrics dashboard row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 shrink-0">
                <Users className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Voters</span>
                <span className="block text-xl font-bold text-slate-100 font-display font-mono">{totalVotesCount}</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Speed</span>
                <span className="block text-xl font-bold text-slate-100 font-display font-mono">
                  {latencyStats.avg > 0 ? `${latencyStats.avg}s` : '—'}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex items-center gap-3.5 hover:border-slate-700/60 transition-colors">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Session Winner</span>
                <span className="block text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                  {leaderOption ? leaderOption.text : 'Awaiting responses'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Share & QR Code */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-xl text-center space-y-4 backdrop-blur-lg">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-display">Session Joining Invitation</h4>
              <p className="text-xxs text-slate-400 mt-1">
                Project this URL or QR on screens to invite classroom attendees or conference voters.
              </p>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3 bg-white rounded-3xl w-44 h-44 mx-auto border border-slate-200 shadow-lg flex items-center justify-center relative group">
                <img src={qrCodeDataUrl} alt="Voters Session Join Link" className="w-full h-full select-none" />
              </div>
            ) : (
              <div className="h-44 w-11/12 bg-slate-950/80 border border-slate-800 rounded-3xl animate-pulse mx-auto" />
            )}

            <div className="space-y-1.5 text-left">
              <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Voter Access Address</span>
              <div className="p-2 px-3 rounded-full bg-slate-950/80 border border-slate-850 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300 truncate max-w-[170px]">
                  {window.location.host}/?voterId={pollId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?voterId=${pollId}`);
                    alert('Presenter sharing URL copied successfully!');
                  }}
                  className="py-1 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] uppercase rounded-full transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL SPEAKER VIEW MODAL OUTLINE LAYOUT */}
      {isSpeakerView && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-6 font-sans">
          {/* Confetti inside full view */}
          <ConfettiEffect active={confettiActive} type="fireworks" />

          {/* HEADER BACK CONTROLLER */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-[10px] text-indigo-400 font-extrabold tracking-widest uppercase rounded">
                SLIDES SPEAKING PROJECTION
              </span>
              <p className="text-xs text-slate-500">Press ESC or click stop projection to exit</p>
            </div>

            <button
              onClick={() => setIsSpeakerView(false)}
              className="py-2 px-4 rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold transition-all hover:bg-slate-900/60 cursor-pointer"
            >
              Stop Speaker Projection [ESC]
            </button>
          </div>

          {/* MAIN PROJECTION CARD GRID */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
            {/* Title & Charts block */}
            <div className="lg:col-span-8 flex flex-col justify-center space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Interactive Polling Spotlight</span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  {poll.question}
                </h1>
                
                {poll.quizMode && (
                  <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-amber-500/10 text-xs font-extrabold text-amber-500 border border-amber-500/20">
                    <Zap className="w-4 h-4" />
                    GAME TRIVIA ACTIVE
                  </span>
                )}
              </div>              {/* Huge charts display */}
              <div className="p-6 md:p-8 rounded-3xl bg-slate-900/50 border border-slate-805 shadow-2xl flex items-center justify-center backdrop-blur-md">
                {totalVotesCount === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-10 h-10 border-2 border-cyan-500/30 border-dashed rounded-full animate-spin mx-auto" />
                    <h3 className="text-lg font-bold text-slate-300">Wait-room connecting...</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Join using the credentials listed on the right. Results render on-screen in real-time.
                    </p>
                  </div>
                ) : (
                  <AnimatedCharts
                    data={chartData}
                    type={chartType}
                    themeColor={poll.theme}
                    totalVotes={totalVotesCount}
                  />
                )}
              </div>
            </div>

            {/* Timers & Instruction Block */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center gap-6 p-6 rounded-3xl bg-slate-900/50 border border-slate-800 h-full backdrop-blur-lg">
              {/* Dynamic countdown element */}
              <div className="text-center space-y-1 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Remaining countdown</span>
                
                {isExpired ? (
                  <div className="px-5 py-2.5 rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20 text-sm font-bold tracking-wider uppercase animate-bounce mt-1">
                    VOTING COMPLETE (ENDED)
                  </div>
                ) : (
                  <div className="text-6xl md:text-8xl font-black text-slate-100 font-mono tracking-tighter mt-1 flex items-center gap-2">
                    <Timer className="w-12 h-12 text-cyan-400" />
                    {timeRemaining !== null ? `${timeRemaining}s` : 'Active'}
                  </div>
                )}
              </div>

              {/* Huge Projected QR scanner */}
              <div className="text-center space-y-4 pt-4 border-t border-slate-800 w-full">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Want to Vote? Scan to Join!</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Point your smartphone camera at the code below</p>
                </div>

                {qrCodeDataUrl ? (
                  <div className="p-3 bg-white rounded-3xl w-48 h-48 mx-auto border shadow-lg flex items-center justify-center">
                    <img src={qrCodeDataUrl} alt="Proj Join Code" className="w-full h-full select-none" />
                  </div>
                ) : (
                  <div className="h-44 w-11/12 bg-slate-950 rounded-3xl animate-pulse mx-auto" />
                )}

                <div className="text-center">
                  <span className="block text-[10px] text-slate-450 uppercase tracking-wider font-semibold">Or enter link in browser:</span>
                  <span className="block text-sm font-extrabold text-cyan-400 font-mono tracking-tight mt-1">
                    {window.location.host}/?voterId={pollId}
                  </span>
                </div>
              </div>

              {/* Joint count stats */}
              <div className="w-full text-center p-3 rounded-xl bg-slate-900/40 border border-slate-900 flex justify-around">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-black">Responses</span>
                  <span className="block text-xl font-black text-slate-100 font-mono">{totalVotesCount}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-black">Segment</span>
                  <span className="block text-xl font-black text-slate-100 font-mono">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
