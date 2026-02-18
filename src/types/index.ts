export interface UserContext {
  id: string;
  email: string;
  role?: string;
}

export interface Keystroke {
  key: string;
  timestamp: number;
  correct: boolean;
  position: number;
}

export interface ReplayData {
  keystrokes: Keystroke[];
}

export interface LessonSubmission {
  wpm: number;
  accuracy: number;
  score: number;
  duration: number;
  lessonText: string;
  errorKeys: string[];
  correctKeys: string[];
  replay: ReplayData;
}

export interface UserSync {
  email: string;
  username?: string;
  avatarUrl?: string;
}

export interface LeaderboardQuery {
  type: 'wpm' | 'time' | 'score';
  period: 'daily' | 'weekly' | 'alltime';
}
