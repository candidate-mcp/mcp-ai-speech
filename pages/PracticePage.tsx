
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzePerformance } from '../services/geminiService';
import { MicIcon, StopIcon, CloseIcon } from '../components/icons';
import { Topic, ConversationTurn } from '../types';
import { questionDatabase } from '../data/questions';

const LOCAL_STORAGE_KEY = 'ai-speech-coach-session';

const PracticePage: React.FC = () => {
  const { topic, conversation, addTurn, setFeedback, resetState } = useAppContext();
  const navigate = useNavigate();

  const [shuffledQuestions, setShuffledQuestions] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const endPracticeAfterStopRef = useRef(false);
  
  const currentQuestion = shuffledQuestions[questionIndex] || '';
  const totalQuestions = shuffledQuestions.length;

  // Save progress to local storage on each turn
  useEffect(() => {
    if (topic && conversation.length > 0) {
      try {
        const sessionToSave = JSON.stringify({ topic, conversation });
        localStorage.setItem(LOCAL_STORAGE_KEY, sessionToSave);
      } catch (error) {
        console.error("Failed to save session to localStorage", error);
      }
    }
  }, [topic, conversation]);
  
  // Initialize and setup questions
  useEffect(() => {
    if (!topic) {
      navigate('/');
      return;
    }
    const questionsForTopic = questionDatabase[topic] || [];
    const shuffled = [...questionsForTopic].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setQuestionIndex(conversation.length < shuffled.length ? conversation.length : 0);
    setIsProcessing(false);
  }, [topic, navigate]); // `conversation` is intentionally omitted to avoid reshuffling

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTimeout(() => {
        if ('speechSynthesis' in window && text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    }, 100);
  }, []);

  useEffect(() => {
    if (currentQuestion && !isProcessing && !isAnalyzing) {
      speak(currentQuestion);
    }
  }, [currentQuestion, isProcessing, isAnalyzing, speak]);

  const endAndAnalyze = useCallback(async (conv?: ConversationTurn[]) => {
    const finalConversation = conv || conversation;
    if (isAnalyzing || finalConversation.length === 0) {
        if (finalConversation.length === 0) {
            alert("분석할 대화 내용이 없습니다. 홈으로 돌아갑니다.");
            resetState();
            navigate('/');
        }
        return;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsAnalyzing(true);
    try {
      // FIX: Add a short delay before starting analysis. This can help prevent
      // issues on some Android devices where stopping speech synthesis might
      // momentarily affect other browser operations.
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await analyzePerformance(topic as Topic, finalConversation);
      setFeedback(result);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clean up on successful analysis
      navigate('/results');
    } catch (error) {
      console.error(error);
      alert('결과 분석에 실패했습니다. 다시 시도해주세요.');
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, topic, conversation, setFeedback, navigate, resetState]);
  
  const handleRecognitionEnd = useCallback((finalTranscript: string) => {
    setIsProcessing(true);
    const newTurn = { question: currentQuestion, answer: finalTranscript.trim() || "(답변 없음)" };
    addTurn(newTurn);
    
    const newConversation = [...conversation, newTurn];
    const isLastQuestion = questionIndex + 1 >= totalQuestions;

    if (endPracticeAfterStopRef.current || isLastQuestion) {
        endPracticeAfterStopRef.current = false;
        endAndAnalyze(newConversation);
    } else {
        setQuestionIndex(prevIndex => prevIndex + 1);
        setIsProcessing(false);
    }
  }, [addTurn, conversation, currentQuestion, questionIndex, totalQuestions, endAndAnalyze]);

  const handleRecognitionError = useCallback((error: string) => {
    console.error("Speech Recognition Error:", error);
    if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'NotAllowedError') {
      alert("마이크 사용이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.");
    } else {
      alert(`음성 인식 중 오류가 발생했습니다: ${error}`);
    }
  }, []);

  const { isListening, transcript, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition({
    onError: handleRecognitionError,
    onEnd: handleRecognitionEnd,
  });

  const handleStartListening = useCallback(() => {
    if (isProcessing || isListening) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    // FIX: Add a short delay before starting to listen. This helps prevent
    // race conditions on Android where stopping speech synthesis and starting
    // microphone access immediately can cause errors.
    setTimeout(() => {
        startListening();
    }, 150);
  }, [isProcessing, isListening, startListening]);

  const handleEndPractice = () => {
    if (isListening) {
      endPracticeAfterStopRef.current = true;
      stopListening();
    } else {
      endAndAnalyze();
    }
  };

  const handleGoHome = () => {
    if (isListening) stopListening();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    resetState();
    navigate('/');
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xl font-semibold text-slate-700">답변을 분석하고 있습니다...</p>
        <p className="text-slate-500">잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (!hasRecognitionSupport) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">음성 인식 미지원</h2>
          <p className="text-slate-700 max-w-md">
            현재 사용하시는 브라우저는 음성 인식을 지원하지 않습니다. 원활한 서비스 이용을 위해 데스크톱의 Chrome 브라우저 또는 최신 버전의 모바일 브라우저 사용을 권장합니다.
          </p>
          <button onClick={handleGoHome} className="mt-8 bg-orange-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors">
            홈으로 돌아가기
          </button>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center justify-center mb-4">
                <h1 className="text-xl font-bold text-slate-800 text-center">
                    <span className="text-orange-500">{topic}</span> 연습 중
                </h1>
                <button 
                  onClick={handleGoHome} 
                  aria-label="연습 중단하고 홈으로 가기" 
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <CloseIcon className="w-6 h-6"/>
                </button>
            </div>
            {totalQuestions > 0 && (
                <div>
                    <div className="flex justify-between mb-1 text-sm font-semibold text-slate-600">
                        <span>진행도</span>
                        <span>{Math.min(questionIndex + 1, totalQuestions)} / {totalQuestions}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                            className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${(Math.min(questionIndex + 1, totalQuestions) / totalQuestions) * 100}%` }}>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg p-8 md:p-12 flex flex-col justify-center min-h-[250px] md:min-h-[300px]">
          {isListening ? (
              <>
                  <p className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 animate-pulse">
                      듣고 있어요...
                  </p>
                  <p className="text-slate-500 text-lg md:text-xl min-h-[60px]">
                      {transcript || "답변을 말씀해주세요."}
                  </p>
              </>
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-slate-800">
              {currentQuestion || '질문을 생성중입니다...'}
            </p>
          )}
        </div>
      </main>

      <footer className="bg-white p-4 border-t border-slate-200">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-4">
            <button
                onClick={isListening ? stopListening : handleStartListening}
                disabled={isProcessing || !currentQuestion}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl disabled:bg-slate-300 disabled:cursor-not-allowed transform hover:scale-105 ${
                    isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
                aria-label={isListening ? '녹음 중지' : '답변 녹음 시작'}
            >
                {isListening ? <StopIcon className="w-10 h-10"/> : <MicIcon className="w-12 h-12"/>}
            </button>
            <div className="h-12 mt-2 flex items-center justify-center">
              {conversation.length >= 3 && !isListening && (
                <button 
                    onClick={handleEndPractice} 
                    disabled={isProcessing}
                    className="bg-slate-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-wait"
                >
                  연습 종료 및 결과 확인하기
                </button>
              )}
            </div>
        </div>
      </footer>
    </div>
  );
};

export default PracticePage;