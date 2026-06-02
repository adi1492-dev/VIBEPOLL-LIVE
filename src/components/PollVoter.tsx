/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Vote as VoteIcon, 
  Clock, 
  CheckCircle, 
  Share2, 
  X, 
  HelpCircle, 
  User, 
  Activity, 
  Check, 
  Flame, 
  Award,
  BookOpen
} from 'lucide-react';
import { Poll, Vote } from '../types';
import { AnimatedCharts } from './AnimatedCharts';
import QRCode from 'qrcode';

interface PollVoterProps {
  pollId: string;
}

export const PollVoter: React.FC<PollVoterProps> = ({ pollId }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  
  // Demographics state
  const [demographicAnswers, setDemographicAnswers] = useState<Record<string, string>>({});
  
  // SSE connection state
  const [isConnected, setIsConnected] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Timer calculations helper
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pageLoadTimeRef = useRef<number>(Date.now());

  // Web Sharing controls
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // 1. Initialize custom device fingerprint
  useEffect(() => {
    let devId = localStorage.getItem('poll_voter_fingerprint_v1');
    if (!devId) {
      devId = `fpt-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem('poll_voter_fingerprint_v1', devId);
    }
    setFingerprint(devId);
  }, []);

  // 2. Load the initial Poll and connect to SSE Stream
  useEffect(() => {
    if (!pollId || !fingerprint) return;

    // Fetch poll on connect
    fetch(`/api/polls/${pollId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Poll not found');
        return res.json();
      })
      .then((data: Poll) => {
        setPoll(data);
        
        // Assess if device already voted
        const userVote = data.votes.find((v) => v.fingerprint === fingerprint);
        if (userVote) {
          setVotedOptionId(userVote.optionId);
        }
      })
      .catch((err) => {
        setErrorText('Could not locate poll on database. It might have been deleted.');
        console.error(err);
      });

    // Connect Server Sent Events
    const eventSource = new EventSource(`/api/polls/${pollId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setErrorText('');
    };

    eventSource.onmessage = (event) => {
      try {
        const updatedPoll: Poll = JSON.parse(event.data);
        setPoll(updatedPoll);

        // Update voted status if another client stream synced
        const userVote = updatedPoll.votes.find((v) => v.fingerprint === fingerprint);
        if (userVote) {
          setVotedOptionId(userVote.optionId);
        }
      } catch (err) {
        console.error('Error parsing sse JSON payload:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // EventSource auto reconnects, so let's just show minimal status
    };

    return () => {
      eventSource.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollId, fingerprint]);

  // 3. Dynamic countdown clock calculations
  useEffect(() => {
    if (!poll || poll.status !== 'active' || !poll.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const updateTimer = () => {
      const remainingSeconds = Math.max(0, Math.ceil((poll.expiresAt! - Date.now()) / 1000));
      setTimeRemaining(remainingSeconds);

      // Transition client poll status locally if timer hits 0
      if (remainingSeconds <= 0 && poll.status === 'active') {
        setPoll((prev) => prev ? { ...prev, status: 'ended' } : null);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateTimer(); // run initial
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  // 4. Generate direct sharing QR code
  useEffect(() => {
    if (!pollId || !showShareModal) return;
    const shareableUrl = `${window.location.origin}/?voterId=${pollId}`;
    
    QRCode.toDataURL(shareableUrl, { margin: 2, scale: 6 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [pollId, showShareModal]);

  // Handler: Submit a choice
  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poll || isSubmittingVote || votedOptionId) return;
    setErrorText('');

    if (!selectedOptionId) {
      setErrorText('Please tap on an option choice first.');
      return;
    }

    // Verify all demographic values are answered if required
    const missingDemographics = poll.demographics.filter(
      (field) => !demographicAnswers[field.name]
    );

    if (missingDemographics.length > 0) {
      setErrorText(`Please answer all questions before placing your vote.`);
      return;
    }

    setIsSubmittingVote(true);
    const voteResponseTime = Date.now() - pageLoadTimeRef.current;

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId: selectedOptionId,
          fingerprint,
          demographics: demographicAnswers,
          responseTimeMs: voteResponseTime,
        }),
      });

      if (res.ok) {
        setVotedOptionId(selectedOptionId);
        setErrorText('');
      } else {
        const payload = await res.json();
        setErrorText(payload.error || 'Could not post vote option.');
      }
    } catch (err) {
      setErrorText('Server connection lost during vote transaction.');
      console.error(err);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleDemographicFill = (fieldName: string, optionValue: string) => {
    setDemographicAnswers((prev) => ({
      ...prev,
      [fieldName]: optionValue,
    }));
  };

  if (!poll) {
    return (
      <div className="max-w-md mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-semibold text-sm">Synchronizing live stream credentials...</p>
        <p className="text-xs text-slate-500 mt-2">Checking with Express host at port 3000</p>
      </div>
    );
  }

  // Calculate totals and statistics
  const totalVotes = poll.votes.length;
  const isExpired = poll.status === 'ended' || (poll.expiresAt && Date.now() >= poll.expiresAt);

  // Map choices data for animated charts
  const voteCountMap = poll.options.reduce((acc, opt) => {
    acc[opt.id] = 0;
    return acc;
  }, {} as Record<string, number>);

  poll.votes.forEach((v) => {
    if (voteCountMap[v.optionId] !== undefined) {
      voteCountMap[v.optionId]++;
    }
  });

  const chartData = poll.options.map((opt) => {
    const votes = voteCountMap[opt.id];
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    const isCorrect = poll.quizMode && opt.id === poll.correctOptionId;
    return {
      id: opt.id,
      label: opt.text,
      votes,
      percentage,
      isCorrect,
      showCorrectBorder: isExpired && isCorrect,
    };
  });

  // Calculate user accuracy in trivia quiz mode
  const chosenOpt = poll.options.find((o) => o.id === votedOptionId);
  const isUserCorrectIndex = votedOptionId === poll.correctOptionId;

  const currentThemeHexColor = 
    poll.theme === 'coral' ? 'from-rose-500 to-orange-500' :
    poll.theme === 'emerald' ? 'from-emerald-500 to-teal-500' :
    poll.theme === 'amber' ? 'from-amber-500 to-yellow-500' :
    poll.theme === 'slate' ? 'from-slate-600 to-zinc-600' :
    poll.theme === 'cyber' ? 'from-cyan-400 via-fuchsia-500 to-yellow-400' :
    'from-indigo-600 to-purple-500';

  return (
    <div className="w-full max-w-lg mx-auto p-5 md:p-7 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-2xl space-y-6 backdrop-blur-lg" id={`voter-layout-${pollId}`}>
      {/* Dynamic Header & Expiry badge indicator */}
      <div className="flex items-center justify-between gap-3 p-1">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-4 h-4 shrink-0 ${isConnected ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 font-display">
            {isConnected ? 'LIVE SYNCED' : 'CONNECTING...'}
          </span>
        </div>

        {isExpired ? (
          <span className="px-3 py-1 rounded-full text-xxs font-bold uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400">
            Voting Closed
          </span>
        ) : poll.status === 'draft' ? (
          <span className="px-3 py-1 rounded-full text-xxs font-bold uppercase tracking-wider bg-slate-850 text-slate-400 border border-slate-800">
            Waiting Starter
          </span>
        ) : (
          <div className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 py-1 px-3 rounded-full text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            {timeRemaining !== null ? `${timeRemaining}s` : 'Active'}
          </div>
        )}
      </div>

      {errorText && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 font-medium">
          {errorText}
        </div>
      )}

      {/* Visual Image Support card display */}
      {poll.imageUrl && (
        <div className="h-32 w-full rounded-xl overflow-hidden relative border border-slate-900 shadow-md">
          <img 
            src={poll.imageUrl} 
            alt="Poll Topic Banner" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
        </div>
      )}

      {/* Main Question Display */}
      <div className="space-y-1.5">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight leading-snug">
          {poll.question}
        </h1>
        {poll.quizMode && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-500 border border-amber-500/20">
            <Flame className="w-3 h-3 saturate-150" />
            TRIVIA QUIZ SESSION
          </span>
        )}
      </div>

      {/* Main Logic: Form choice vs. Results */}
      {!votedOptionId && !isExpired ? (
        poll.status === 'draft' ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-900 bg-slate-900/10 rounded-2xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Awaiting Presentation Launch</h3>
            <p className="text-xxs text-slate-500 max-w-xs mx-auto">
              The organizer has created the poll draft. Stay on this screen; it will instantly refresh when launched.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVoteSubmit} className="space-y-6">
             {/* 1. Demographics selection fields */}
            {poll.demographics.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-widest font-display">Tell us about yourself</span>
                </div>
                
                <div className="space-y-4">
                  {poll.demographics.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">
                        {field.name} *
                      </label>
                      <div className="flex flex-wrap gap-1.5" id={`demo-field-${field.id}`}>
                        {field.options.map((optVal) => (
                          <button
                            type="button"
                            key={optVal}
                            onClick={() => handleDemographicFill(field.name, optVal)}
                            className={`py-1.5 px-3.5 rounded-full border text-xs font-semibold select-none cursor-pointer tracking-wide transition-all ${
                              demographicAnswers[field.name] === optVal
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
                            }`}
                          >
                            {optVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Choices Multiple Choice List */}
            <div className="space-y-2.5">
              <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select Your Answer Choice
              </span>
              
              {poll.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`w-full min-h-[52px] text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400/80 bg-cyan-400/10 text-slate-100 ring-2 ring-cyan-400/20'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70 text-slate-300'
                    }`}
                  >
                    <span className="text-sm font-semibold pr-3 leading-relaxed group-hover:text-slate-150">
                      {option.text}
                    </span>
                    <div className={`w-5.5 h-5.5 rounded-full border border-slate-700/60 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-cyan-500 border-cyan-400' : 'bg-slate-950'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action submit button */}
            <button
              type="submit"
              disabled={isSubmittingVote || !selectedOptionId}
              className={`w-full py-4 px-6 rounded-full font-bold text-sm tracking-widest uppercase text-white bg-gradient-to-r hover:brightness-110 select-none cursor-pointer shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed ${currentThemeHexColor}`}
              id="submit-vote-btn"
            >
              <VoteIcon className="w-4 h-4 stroke-[2.5]" />
              {isSubmittingVote ? 'Submitting Choice...' : 'Lock in My Vote'}
            </button>
          </form>
        )
      ) : (
        /* Voted Output layout or Ended results view */
        <div className="space-y-6">
          {votedOptionId && (
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-1.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-455 font-bold font-display">
                <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                <h4 className="text-sm font-bold tracking-tight">Your vote has been counted!</h4>
              </div>
              <p className="text-xs text-slate-300">
                You selected: <span className="font-semibold text-white">"{chosenOpt?.text}"</span>
              </p>

              {/* Contest scoring assessment if trivia ended */}
              {poll.quizMode && isExpired && (
                <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center gap-2 font-semibold ${
                  isUserCorrectIndex
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-450'
                }`}>
                  <Award className="w-4.5 h-4.5 shrink-0" />
                  <div>
                    {isUserCorrectIndex 
                      ? 'Congratulations! You answered correctly!' 
                      : `Nice try, but the correct answer was "${poll.options.find(o => o.id === poll.correctOptionId)?.text}"`}
                  </div>
                </div>
              )}
            </div>
          )}

          {isExpired && !votedOptionId && (
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center py-6">
              <h4 className="text-sm font-bold text-rose-450 uppercase font-display select-none">Poll Ended</h4>
              <p className="text-xs text-slate-300 mt-1">
                This poll reached its time limit. Review the final community results below.
              </p>
            </div>
          )}

          {/* Core dynamic charts layout */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Live Results Summary</span>
              <span className="font-mono text-slate-500">{totalVotes} Total VotesPlaced</span>
            </h3>
            
            <AnimatedCharts 
              data={chartData} 
              type="bar" 
              themeColor={poll.theme} 
              totalVotes={totalVotes} 
            />
          </div>
        </div>
      )}

      {/* Small Voter Utility Footer */}
      <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
        <span>Voter ID: {fingerprint.substring(0, 12)}... (Anonymous)</span>
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1 hover:text-indigo-400 select-none cursor-pointer transition-colors"
        >
          <Share2 className="w-3 h-3" />
          Share Poll Link
        </button>
      </div>

      {/* Share Modal Dialog overlay */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="p-6 w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-900 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-100">Invite Coworkers & Friends</h3>
              <p className="text-xs text-slate-400 mt-1">
                Scan the QR code or share the URL below for instant, login-free voting access.
              </p>
            </div>

            {qrCodeDataUrl && (
              <div className="flex justify-center p-2 bg-white rounded-xl w-44 h-44 mx-auto border shadow-sm">
                <img src={qrCodeDataUrl} alt="Quick Scan QR Code" className="w-full h-full" />
              </div>
            )}

            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Copy Invitation URL</span>
              <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?voterId=${pollId}`}
                  className="bg-transparent text-slate-300 text-xs truncate flex-1 outline-none font-mono"
                  id="shareable-link-input"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?voterId=${pollId}`);
                    alert('Copied link successfully!');
                  }}
                  className="py-1 px-2.5 rounded bg-indigo-600 text-white font-bold text-[10px] uppercase cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
