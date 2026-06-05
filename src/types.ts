/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PollOption {
  id: string;
  text: string;
}

export interface DemographicField {
  id: string;
  name: string;
  options: string[];
}

export interface Vote {
  id: string;
  optionId: string;
  timestamp: number;
  fingerprint: string;
  demographics: Record<string, string>; // e.g. { "Role": "Student" }
  responseTimeMs: number; // calculated on client
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  timer: number; // in seconds
  createdAt: number;
  expiresAt: number | null; // Timestamp in ms
  status: 'draft' | 'active' | 'ended';
  demographics: DemographicField[];
  votes: Vote[];
  theme: 'indigo' | 'coral' | 'emerald' | 'amber' | 'slate' | 'cyber';
  quizMode: boolean;
  correctOptionId: string | null;
  imageUrl: string | null;
  userId?: string;
}

export interface PollTemplate {
  id: string;
  name: string;
  question: string;
  options: string[];
  timer: number;
  demographics: DemographicField[];
  quizMode: boolean;
  correctOptionIdIndex: number | null; // index of correct option
  theme: Poll['theme'];
}
