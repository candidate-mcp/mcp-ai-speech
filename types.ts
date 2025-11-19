export enum Topic {
  INTERVIEW = "면접 연습",
  PRESENTATION = "발표 연습",
  DAILY = "일상 대화",
}

export interface ConversationTurn {
  question: string;
  answer: string;
}

export interface IndividualFeedback {
  question: string;
  answer: string;
  feedback: string;
}

export interface Feedback {
  level: string;
  habits: string;
  dialect: string;
  strengths: string;
  improvements: string;
  summary: string; // Witty summary
  individualFeedbacks: IndividualFeedback[];
  // New MBTI-style fields
  speakingType: string;
  speakingTypeDescription: string;
  hashtags: string[];
  rankPercentile: number;
  levelUpSuggestion: string;
}
