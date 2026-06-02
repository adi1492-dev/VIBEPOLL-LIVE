/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Settings, 
  Sparkles, 
  BookOpen, 
  CheckCircle, 
  Layers, 
  Image as ImageIcon, 
  ChevronRight, 
  FileText,
  Bookmark,
  Calendar
} from 'lucide-react';
import { DemographicField, PollTemplate, Poll } from '../types';

interface PollCreateProps {
  onPollCreated: (poll: Poll) => void;
}

const themePresets = [
  { id: 'indigo', label: 'Indigo Wave', preview: 'from-indigo-600 to-purple-600 bg-indigo-600' },
  { id: 'coral', label: 'Coral Burst', preview: 'from-rose-500 to-orange-500 bg-rose-500' },
  { id: 'emerald', label: 'Emerald Aurora', preview: 'from-emerald-500 to-teal-500 bg-emerald-500' },
  { id: 'amber', label: 'Solar Flare', preview: 'from-amber-500 to-yellow-500 bg-amber-500' },
  { id: 'slate', label: 'Slate Minimal', preview: 'from-slate-600 to-zinc-600 bg-slate-600' },
  { id: 'cyber', label: 'Cyber Neon', preview: 'from-cyan-400 via-fuchsia-500 to-yellow-400 bg-cyan-400' },
];

const imagePresets = [
  { label: 'None', url: '' },
  { label: '🎓 Study Ground', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60' },
  { label: '🚀 Cosmic Innovation', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=60' },
  { label: '💻 Tech Workspace', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60' },
  { label: '🎨 Abstract Shapes', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=60' },
];

export const PollCreate: React.FC<PollCreateProps> = ({ onPollCreated }) => {
  // Input states
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [timer, setTimer] = useState<number>(60);
  const [theme, setTheme] = useState<Poll['theme']>('indigo');
  const [quizMode, setQuizMode] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Demographics fields list
  const [demographics, setDemographics] = useState<DemographicField[]>([]);
  
  // Custom templates list from backend
  const [templates, setTemplates] = useState<PollTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  // Hydrate form using a template
  const applyTemplate = (tpl: PollTemplate) => {
    setQuestion(tpl.question || '');
    setOptions(tpl.options.length >= 2 ? [...tpl.options] : ['', '']);
    setTimer(tpl.timer || 60);
    setTheme(tpl.theme || 'indigo');
    setDemographics(tpl.demographics || []);
    setQuizMode(tpl.quizMode || false);
    if (tpl.quizMode && tpl.correctOptionIdIndex !== null && tpl.correctOptionIdIndex !== undefined) {
      setCorrectOptionIndex(tpl.correctOptionIdIndex);
    } else {
      setCorrectOptionIndex(null);
    }
    setErrorMessage('');
  };

  // Add an option field
  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  // Remove an option field
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, idx) => idx !== index);
      setOptions(updated);
      
      // Keep correct option index updated if shifted
      if (correctOptionIndex === index) {
        setCorrectOptionIndex(null);
      } else if (correctOptionIndex !== null && correctOptionIndex > index) {
        setCorrectOptionIndex(correctOptionIndex - 1);
      }
    }
  };

  // Edit value of an option
  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  // Add demographic field
  const handleAddDemographic = (preset: 'role' | 'experience' | 'custom') => {
    let newField: DemographicField;
    
    if (preset === 'role') {
      newField = {
        id: `demo-${Math.random().toString(36).substring(2, 6)}`,
        name: 'Role / Occupation',
        options: ['Student', 'Professional', 'Educator', 'Executive']
      };
    } else if (preset === 'experience') {
      newField = {
        id: `demo-${Math.random().toString(36).substring(2, 6)}`,
        name: 'Years in Tech',
        options: ['Junior (<1 yr)', 'Mid (1-3 yrs)', 'Senior (4+ yrs)']
      };
    } else {
      newField = {
        id: `demo-${Math.random().toString(36).substring(2, 6)}`,
        name: 'Age Range',
        options: ['Under 18', '18 - 30', '31 - 50', '50+']
      };
    }

    setDemographics([...demographics, newField]);
  };

  // Remove demographic field
  const handleRemoveDemographic = (id: string) => {
    setDemographics(demographics.filter(field => field.id !== id));
  };

  // Edit demographic config
  const handleDemographicNameChange = (id: string, name: string) => {
    setDemographics(demographics.map(f => f.id === id ? { ...f, name } : f));
  };

  const handleDemographicOptionsChange = (id: string, optionsText: string) => {
    const optionsArray = optionsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setDemographics(demographics.map(f => f.id === id ? { ...f, options: optionsArray } : f));
  };

  // Submit and create Poll on client/server
  const handleSubmitPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!question.trim()) {
      setErrorMessage('Please provide a poll question.');
      return;
    }

    const filteredOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (filteredOptions.length < 2) {
      setErrorMessage('At least 2 non-empty multiple choice options are required.');
      return;
    }

    if (quizMode && (correctOptionIndex === null || correctOptionIndex >= filteredOptions.length)) {
      setErrorMessage('Please mark one of the options as the correct answer in Quiz Mode.');
      return;
    }

    setIsSubmittingPoll(true);

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options: filteredOptions,
          timer,
          demographics,
          theme,
          quizMode,
          correctOptionId: quizMode && correctOptionIndex !== null ? `opt-${correctOptionIndex}` : null,
          imageUrl: imageUrl || null
        })
      });

      if (response.ok) {
        const createdPoll = await response.json();
        onPollCreated(createdPoll);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to create poll on server.');
      }
    } catch (err) {
      setErrorMessage('Network connection error. Server might be launching...');
      console.error(err);
    } finally {
      setIsSubmittingPoll(false);
    }
  };

  // Save current details as a Template
  const handleSaveAsTemplate = async () => {
    setErrorMessage('');
    if (!templateName.trim()) {
      setErrorMessage('Please enter a template name.');
      return;
    }

    const filteredOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (filteredOptions.length < 2) {
      setErrorMessage('To save, configure at least 2 non-empty options.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          question: question.trim() || 'Untitled Question',
          options: filteredOptions,
          timer,
          demographics,
          theme,
          quizMode,
          correctOptionIdIndex: quizMode ? correctOptionIndex : null
        })
      });

      if (response.ok) {
        setTemplateName('');
        setShowSaveTemplateModal(false);
        await fetchTemplates();
      } else {
        setErrorMessage('Failed to save template on backend.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error saving template to server.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full" id="poll-creator-panel">
      {/* Templates Sidebar */}
      <div className="lg:col-span-4 p-5 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-xl backdrop-blur-lg space-y-4">
        <div className="flex items-center gap-2 mb-2 p-1">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-slate-100 font-display">Quick Templates</h2>
        </div>
        <p className="text-xs text-slate-400 p-1">
          Choose a pre-made template to instantly hydrate your poll config, then launch!
        </p>

        <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
          {templates.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-900 rounded-xl">
              No templates found.
            </div>
          ) : (
            templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left p-3 rounded-2xl border border-slate-850 hover:border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-all duration-200 group flex justify-between items-center cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400">
                    {tpl.name}
                  </span>
                  <span className="block text-xxs text-slate-400 truncate mt-0.5">
                    {tpl.question}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))
          )}
        </div>
        
        <div className="pt-3 border-t border-slate-900">
          <button
            type="button"
            onClick={() => {
              if (!question.trim()) {
                setErrorMessage('Configure your question before saving a template.');
                return;
              }
              setShowSaveTemplateModal(true);
            }}
            className="w-full py-2.5 px-3 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/65 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            Save Current as Template
          </button>
        </div>
      </div>

      {/* Main Creation Form */}
      <form onSubmit={handleSubmitPoll} className="lg:col-span-8 p-6 md:p-8 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-2xl backdrop-blur-lg space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display italic">
            <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            Create Your Live Poll
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            Build interactive templates, set a countdown, and invite voters instantly with live presentation tools.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Question Area */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Poll Question or Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Which modern framework is your favorite choice?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full text-base py-3 px-4 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 outline-none transition-all"
            id="poll-question-input"
          />
        </div>

        {/* Voting Options */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Choice Options (Multiple Choice)
            </label>
            <span className="text-xxs text-slate-500">
              {options.length}/8 Options Used
            </span>
          </div>

          <div className="space-y-2.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {quizMode && (
                  <button
                    type="button"
                    onClick={() => setCorrectOptionIndex(idx)}
                    className={`p-2 rounded-xl transition-all border ${
                      correctOptionIndex === idx
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                    }`}
                    title={correctOptionIndex === idx ? 'Correct option chosen' : 'Mark as Correct Answer'}
                  >
                    <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
                
                <input
                  type="text"
                  required
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm outline-none placeholder-slate-600 transition-all"
                  id={`option-input-${idx}`}
                />

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2.5 rounded-xl border border-slate-850 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={options.length >= 8}
            onClick={handleAddOption}
            className="w-full py-2 px-3 border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40 rounded-xl text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Another Option
          </button>
        </div>

        {/* Custom Timer & Controls Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-900">
          {/* Timer Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Poll Active Timer
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="1800"
                value={timer}
                onChange={(e) => setTimer(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-24 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-center outline-none"
              />
              <span className="text-xs text-slate-400 font-medium">seconds</span>

              {/* Fast presets buttons */}
              <div className="flex gap-1.5 ml-2">
                {[30, 60, 120, 300].map((sec) => (
                  <button
                    type="button"
                    key={sec}
                    onClick={() => setTimer(sec)}
                    className={`py-1.5 px-2.5 rounded-lg border text-xxs font-mono transition-all ${
                      timer === sec
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-semibold'
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quiz mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-400" />
              Game Mode Mode
            </label>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-900">
              <input
                type="checkbox"
                id="quiz-mode-trigger"
                checked={quizMode}
                onChange={(e) => {
                  setQuizMode(e.target.checked);
                  if (!e.target.checked) setCorrectOptionIndex(null);
                  else if (correctOptionIndex === null) setCorrectOptionIndex(0);
                }}
                className="w-4.5 h-4.5 rounded text-indigo-500 accent-indigo-500 bg-slate-950 border-slate-800"
              />
              <label htmlFor="quiz-mode-trigger" className="cursor-pointer select-none">
                <span className="block text-xs font-bold text-slate-200">Enable Trivia Quiz Mode</span>
                <span className="block text-xxs text-slate-400">Score correctness & highlight the actual answer on reveal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Image Support */}
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Image Support Card (Optional)
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="url"
              placeholder="Paste custom landscape image absolute URL"
              value={imageUrl || ''}
              onChange={(e) => setImageUrl(e.target.value || null)}
              className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 outline-none"
            />
            
            {/* Quick gorgeous presets */}
            <div className="flex flex-wrap gap-1.5">
              {imagePresets.map((img) => (
                <button
                  type="button"
                  key={img.label}
                  onClick={() => setImageUrl(img.url || null)}
                  className={`py-1 px-2 rounded-lg border text-[10px] transition-all font-medium ${
                    (imageUrl === img.url || (!imageUrl && !img.url))
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold'
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Demographics customization fields */}
        <div className="space-y-3.5 pt-3 border-t border-slate-900">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              Audience Demographics Custom Fields
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAddDemographic('role')}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xxs font-semibold text-slate-300 cursor-pointer"
              >
                + Presets: Role
              </button>
              <button
                type="button"
                onClick={() => handleAddDemographic('experience')}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xxs font-semibold text-slate-300 cursor-pointer"
              >
                + Presets: Experience
              </button>
              <button
                type="button"
                onClick={() => handleAddDemographic('custom')}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xxs font-semibold text-slate-300 cursor-pointer"
              >
                + Presets: Age
              </button>
            </div>
          </div>
          
          <p className="text-xxs text-slate-500">
            Mandate voters to fill out these quick credentials before submitting, providing you rich segmentation analytics on results.
          </p>

          <div className="space-y-3">
            {demographics.map((field) => (
              <div 
                key={field.id}
                className="p-3.5 rounded-xl border border-slate-900 bg-slate-900/20 flex flex-col md:flex-row items-stretch md:items-center gap-3"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Attribute Name</span>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleDemographicNameChange(field.id, e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-850 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Options (Comma separated)</span>
                    <input
                      type="text"
                      placeholder="Student, Tech, Educator"
                      value={field.options.join(', ')}
                      onChange={(e) => handleDemographicOptionsChange(field.id, e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-850 text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="shrink-0 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveDemographic(field.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Brand Themes */}
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Brand Cover Theme Accent
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {themePresets.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTheme(t.id as Poll['theme'])}
                className={`py-2 px-3 rounded-xl border text-xs text-left text-slate-200 transition-all cursor-pointer ${
                  theme === t.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900'
                    : 'border-slate-850 hover:border-slate-800 bg-slate-900/50'
                }`}
              >
                <div className={`h-2 w-full rounded mb-1.5 bg-gradient-to-r ${t.preview}`} />
                <span className="font-semibold text-xxs tracking-wide">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submitting Actions */}
        <div className="pt-4 border-t border-slate-900 flex justify-end">
          <button
            type="submit"
            disabled={isSubmittingPoll}
            className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-indigo-600/20 transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
            id="create-poll-btn"
          >
            {isSubmittingPoll ? 'Creating Poll...' : 'Instantiate & Create Poll'}
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </form>

      {/* Save Template Dialog Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="p-6 w-full max-w-md rounded-2xl bg-slate-950 border border-slate-900 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Save Poll Design</h3>
              <p className="text-xs text-slate-400 mt-1">
                Save the current setup parameters as a quick template reusable on any future sessions.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xxs font-bold text-slate-300 uppercase tracking-wider">
                Template Session Name
              </label>
              <input
                type="text"
                placeholder="🎓 e.g., Senior Thesis Feedback"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-850 text-slate-100 placeholder-slate-500 text-sm outline-none outline-offset-0 focus:border-indigo-500 focus:ring-1"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-transparent whitespace-nowrap"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingTemplate}
                onClick={handleSaveAsTemplate}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10"
              >
                {isSavingTemplate ? 'Saving...' : 'Save Reusable Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
