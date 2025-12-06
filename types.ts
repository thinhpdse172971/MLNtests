export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export enum GameState {
  WELCOME = 'WELCOME',
  LOADING = 'LOADING',
  PRE_QUESTION = 'PRE_QUESTION', // The "Get Ready" screen
  QUESTION = 'QUESTION',
  FEEDBACK = 'FEEDBACK',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR'
}

export interface PlayerState {
  score: number;
  streak: number;
  correctAnswers: number;
}