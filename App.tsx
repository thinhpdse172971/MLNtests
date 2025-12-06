import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Question, PlayerState } from './types';
import { generateQuestions } from './services/geminiService';
import { Button } from './components/Button';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock, 
  Loader2, 
  Users, 
  BookOpen, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// Shape icons for Kahoot feel
const Shapes = {
  Triangle: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L2 22h20L12 2z" /></svg>,
  Diamond: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2l10 10-10 10L2 12z" /></svg>,
  Circle: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><circle cx="12" cy="12" r="10" /></svg>,
  Square: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
};

const ANSWER_COLORS = [
  "bg-red-500 hover:bg-red-400 border-b-4 border-red-700",    // Option 0
  "bg-blue-500 hover:bg-blue-400 border-b-4 border-blue-700",   // Option 1
  "bg-yellow-500 hover:bg-yellow-400 border-b-4 border-yellow-700", // Option 2
  "bg-green-500 hover:bg-green-400 border-b-4 border-green-700"   // Option 3
];

const ANSWER_ICONS = [Shapes.Triangle, Shapes.Diamond, Shapes.Circle, Shapes.Square];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [countdown, setCountdown] = useState(3);
  const [playerState, setPlayerState] = useState<PlayerState>({ score: 0, streak: 0, correctAnswers: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  
  // Use ReturnType<typeof setInterval> to handle both browser (number) and Node (Timeout) environments
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Game Loop Logic ---

  const startGame = async () => {
    setGameState(GameState.LOADING);
    const qs = await generateQuestions();
    setQuestions(qs);
    setCountdown(3);
    setGameState(GameState.PRE_QUESTION);
  };

  const startQuestion = useCallback(() => {
    setGameState(GameState.QUESTION);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setPointsEarned(0);
  }, []);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCountdown(3);
      setGameState(GameState.PRE_QUESTION);
    } else {
      setGameState(GameState.FINISHED);
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || timeLeft === 0) return; // Prevent multiple answers

    if (timerRef.current) clearInterval(timerRef.current);
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = index === currentQ.correctAnswerIndex;
    
    setSelectedAnswer(index);
    setIsAnswerCorrect(isCorrect);

    let points = 0;
    if (isCorrect) {
      // Points calculation based on speed (Kahoot style: up to 1000 pts)
      // Formula: (1 - (timeElapsed / timeTotal) / 2) * 1000
      // Simplified: base 600 + speed bonus up to 400
      const speedFactor = timeLeft / 20;
      points = Math.round(600 + (400 * speedFactor));
      
      // Streak bonus
      const streakBonus = Math.min(playerState.streak * 100, 500);
      points += streakBonus;

      setPointsEarned(points);
      setPlayerState(prev => ({
        score: prev.score + points,
        streak: prev.streak + 1,
        correctAnswers: prev.correctAnswers + 1
      }));
    } else {
      setPlayerState(prev => ({ ...prev, streak: 0 }));
    }

    // Brief delay before showing feedback screen to let user see their selection
    setTimeout(() => {
      setGameState(GameState.FEEDBACK);
    }, 1000);
  };

  const restartGame = () => {
    setPlayerState({ score: 0, streak: 0, correctAnswers: 0 });
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setGameState(GameState.WELCOME);
  };

  // --- Effects ---

  // Timer for Question Phase
  useEffect(() => {
    if (gameState === GameState.QUESTION) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Time up logic
            setSelectedAnswer(-1); // -1 indicates time up/no answer
            setIsAnswerCorrect(false);
            setPlayerState(p => ({ ...p, streak: 0 }));
            setGameState(GameState.FEEDBACK);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Pre-question Countdown
  useEffect(() => {
    if (gameState === GameState.PRE_QUESTION) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            startQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, startQuestion]);

  // --- Renders ---

  if (gameState === GameState.WELCOME) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-800 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-5xl font-extrabold mb-2 tracking-tight">Group 3</h1>
            <p className="text-xl text-emerald-100 font-medium mb-8">Quiz: Chủ nghĩa xã hội Mác-Lê Nin</p>
            
            <div className="space-y-4">
              <Button 
                onClick={startGame} 
                size="lg" 
                fullWidth 
                className="text-xl shadow-lg hover:scale-105 transform transition-transform"
              >
                Bắt đầu ngay
              </Button>
              <div className="flex items-center justify-center space-x-2 text-sm text-emerald-200">
                <BookOpen className="w-4 h-4" />
                <span>10 Câu hỏi • AI Generated</span>
              </div>
            </div>
          </div>
          <p className="text-emerald-200/60 text-sm">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>
    );
  }

  if (gameState === GameState.LOADING) {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-16 h-16 animate-spin mb-4" />
        <h2 className="text-2xl font-bold animate-pulse">Đang tạo bộ câu hỏi...</h2>
        <p className="text-emerald-200 mt-2">Hệ thống AI đang chuẩn bị dữ liệu</p>
      </div>
    );
  }

  if (gameState === GameState.PRE_QUESTION) {
    return (
      <div className="min-h-screen bg-emerald-700 flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-8 text-emerald-200 animate-fade-in">Câu hỏi {currentQuestionIndex + 1}</h2>
          
          <div key={countdown} className="animate-pop">
            <div className="text-8xl font-black bg-white text-emerald-800 w-48 h-48 rounded-full flex items-center justify-center shadow-2xl mx-auto">
              {countdown}
            </div>
          </div>
          
          <p className="mt-8 text-2xl font-bold animate-pulse">Sẵn sàng...</p>
        </div>
      </div>
    );
  }

  if (gameState === GameState.QUESTION) {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center px-8 sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
              {currentQuestionIndex + 1}
            </div>
            <span className="font-bold text-gray-500 hidden sm:inline">/ {questions.length}</span>
          </div>
          <div className="flex-1 mx-8 max-w-xl hidden sm:block">
             <h3 className="text-center font-bold text-gray-800 text-lg truncate">{currentQ.questionText}</h3>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase font-bold">Điểm số</span>
                <span className="font-black text-xl text-emerald-800">{playerState.score}</span>
             </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
           
           {/* Timer Bar */}
           <div className="w-full h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
             <div 
                className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 5 ? 'bg-red-500' : 'bg-purple-500'}`}
                style={{ width: `${(timeLeft / 20) * 100}%` }}
             />
           </div>

           {/* Big Question Text */}
           <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg text-center mb-8 w-full border-b-8 border-gray-200">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-800 leading-tight">
                {currentQ.questionText}
              </h2>
              {/* Optional: Visual timer circle if needed, keeping it clean for now */}
              <div className="mt-6 inline-flex items-center justify-center bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-bold">
                 <Clock className="w-5 h-5 mr-2" />
                 {timeLeft}s
              </div>
           </div>

           {/* Answer Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full sm:h-auto">
              {currentQ.options.map((opt, idx) => {
                const Icon = ANSWER_ICONS[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={selectedAnswer !== null}
                    className={`
                      ${ANSWER_COLORS[idx]} 
                      text-white p-6 sm:p-8 rounded-xl shadow-lg transform transition-all 
                      flex items-center justify-between group
                      ${selectedAnswer === null ? 'hover:scale-[1.02] active:scale-95' : 'opacity-50 cursor-default'}
                      ${selectedAnswer === idx ? '!opacity-100 ring-4 ring-offset-2 ring-emerald-500' : ''}
                    `}
                  >
                    <div className="flex items-center text-left w-full">
                      <div className="mr-4 bg-black/20 p-2 rounded-lg">
                        <Icon />
                      </div>
                      <span className="text-xl sm:text-2xl font-bold">{opt}</span>
                    </div>
                  </button>
                );
              })}
           </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.FEEDBACK) {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-white ${isAnswerCorrect ? 'bg-emerald-600' : 'bg-red-600'}`}>
        <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 max-w-2xl w-full text-center shadow-2xl animate-pop">
           
           <div className="mb-6 flex justify-center">
             {isAnswerCorrect ? (
               <CheckCircle className="w-24 h-24 text-white drop-shadow-md" />
             ) : (
               <XCircle className="w-24 h-24 text-white drop-shadow-md" />
             )}
           </div>

           <h2 className="text-4xl font-black mb-2">
             {isAnswerCorrect ? (selectedAnswer === -1 ? "Hết giờ!" : "Chính xác!") : "Sai rồi!"}
           </h2>
           
           {isAnswerCorrect && (
             <div className="bg-emerald-800/30 inline-block px-6 py-2 rounded-full mb-6">
                <span className="text-2xl font-bold">+{pointsEarned} Điểm</span>
                {playerState.streak > 1 && <span className="ml-2 text-sm text-yellow-300">🔥 Chuỗi {playerState.streak}!</span>}
             </div>
           )}

           {!isAnswerCorrect && (
              <div className="bg-black/20 p-4 rounded-xl mb-6 text-left">
                <p className="text-sm opacity-80 uppercase font-bold mb-1">Đáp án đúng</p>
                <p className="text-xl font-bold">{currentQ.options[currentQ.correctAnswerIndex]}</p>
              </div>
           )}

           {currentQ.explanation && (
             <div className="mb-8 text-white/90 italic bg-black/10 p-4 rounded-lg">
               "{currentQ.explanation}"
             </div>
           )}

           <div className="flex justify-center">
              <Button 
                onClick={handleNextQuestion} 
                variant="secondary" 
                size="lg"
                className="shadow-xl"
              >
                {currentQuestionIndex < questions.length - 1 ? (
                   <span className="flex items-center">Câu tiếp theo <ArrowRight className="ml-2 w-5 h-5"/></span>
                ) : (
                   <span className="flex items-center">Xem kết quả <Trophy className="ml-2 w-5 h-5"/></span>
                )}
              </Button>
           </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.FINISHED) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 text-white">
         <div className="max-w-3xl w-full bg-white text-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-emerald-600 p-8 text-center text-white">
               <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-300 drop-shadow-lg" />
               <h1 className="text-4xl font-black mb-2">Hoàn thành!</h1>
               <p className="text-emerald-100 text-lg">Group 3 - Quiz Mác-Lê Nin</p>
            </div>

            {/* Stats */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <p className="text-gray-500 font-bold uppercase text-xs mb-1">Tổng điểm</p>
                  <p className="text-4xl font-black text-emerald-600">{playerState.score}</p>
               </div>
               <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <p className="text-gray-500 font-bold uppercase text-xs mb-1">Chính xác</p>
                  <p className="text-4xl font-black text-blue-600">{playerState.correctAnswers} / {questions.length}</p>
               </div>
               <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <p className="text-gray-500 font-bold uppercase text-xs mb-1">Đánh giá</p>
                  <p className="text-2xl font-black text-purple-600">
                    {playerState.correctAnswers >= 8 ? "Xuất sắc 🌟" : 
                     playerState.correctAnswers >= 5 ? "Khá tốt 👍" : "Cần cố gắng 📚"}
                  </p>
               </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 bg-gray-100 flex justify-center">
               <Button onClick={restartGame} size="lg" className="flex items-center space-x-2">
                 <RefreshCw className="w-5 h-5" />
                 <span>Chơi lại</span>
               </Button>
            </div>
         </div>
      </div>
    );
  }

  return null;
}