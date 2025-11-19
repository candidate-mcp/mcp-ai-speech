

import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Topic } from '../types';
import { FeedbackIcon, ShieldIcon, MicIcon, CheckCircleIcon } from '../components/icons';

// Re-imagined TopicCard for a more viral/engaging look
const TopicCard: React.FC<{
  topic: Topic;
  emoji: string;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  isPopular?: boolean;
}> = ({ emoji, title, description, isSelected, onSelect, isPopular }) => {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 ${
        isSelected 
          ? 'border-orange-500 bg-orange-50 shadow-lg ring-2 ring-orange-500 ring-offset-2' 
          : 'border-slate-200 bg-white hover:border-orange-400 hover:shadow-md'
      }`}
    >
      {isPopular && (
          <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-tl-2xl rounded-br-lg shadow-md z-10">
            인기
          </div>
      )}
      {isSelected && (
        <div className="absolute top-4 right-4 text-orange-500">
            <CheckCircleIcon className="w-7 h-7" />
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="text-4xl">{emoji}</div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
};

const HowItWorksStep: React.FC<{
    icon: React.ReactNode;
    step: string;
    title: string;
    description: string;
  }> = ({ icon, step, title, description }) => (
    <div className="flex items-start gap-6">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-500">
            {icon}
        </div>
      </div>
      <div>
        <h4 className="font-bold text-lg text-slate-900 mb-1">{step}: {title}</h4>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );


const HomePage: React.FC = () => {
  const { topic, setTopic, conversation, resetState } = useAppContext();
  const navigate = useNavigate();
  const practiceSectionRef = useRef<HTMLElement>(null);
  
  const hasSavedSession = topic && conversation.length > 0;

  const handleStart = () => {
    if (topic) {
      navigate('/practice');
    }
  };

  const handleResume = () => {
    navigate('/practice');
  };

  const handleStartNew = () => {
    resetState();
  };
  
  const scrollToPractice = () => {
    practiceSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-xl font-bold text-slate-800">AI Speech Coach</a>
            <a href="https://www.candidate.im/candidate-remote-consultation?utm_source=aistudio&utm_medium=display&utm_campaign=ai-speach&utm_content=cta" target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm shadow-sm hover:bg-slate-100 transition-all">
              서비스 도입 문의
            </a>
          </div>
        </div>
      </header>
      
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 md:w-96 md:h-96 bg-orange-300/50 rounded-full filter blur-3xl opacity-60"></div>
        <div className="absolute bottom-1/4 left-0 -ml-24 w-48 h-48 md:w-80 md:h-80 bg-purple-300/50 rounded-full filter blur-3xl opacity-60"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column: Hero Text */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-snug">
                “AI가 본 내 말하기 실력,
                <br />
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    몇점일까?”
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-md mx-auto md:mx-0">
                AI가 당신의 말하기를 꼼꼼하게 채점하고, 공유할 수 있는 피드백 리포트를 만들어드려요.
              </p>
              <div className="mt-8 flex justify-center md:justify-start">
                <button
                  onClick={scrollToPractice}
                  className="bg-slate-900 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg hover:bg-slate-700 transition-all duration-300 transform hover:scale-105"
                >
                  내 말하기 점수 확인하기 💯
                </button>
              </div>
            </div>

            {/* Right Column: Visual Element */}
            <div className="hidden md:block">
                <div className="relative transform-gpu -rotate-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-2xl shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-orange-500/30 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/30 rounded-full filter blur-3xl"></div>
                    <div className="relative">
                        <p className="font-semibold text-orange-400 tracking-wider text-sm">AI 말하기 리포트</p>
                        <h2 className="text-3xl font-bold mt-2">논리정연 빌드업 마스터</h2>
                        <p className="mt-2 text-slate-300">차분하고 논리적인 설명으로 상대방을 납득시키는 데 탁월한 능력을 가졌군요!</p>
                        
                        <div className="mt-6">
                            <p className="font-bold text-slate-100">전체 연습자 중 <span className="text-orange-400">상위 15%</span></p>
                            <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                                <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2 flex-wrap">
                            <span className="bg-slate-700 text-orange-400 text-xs font-semibold px-2 py-1 rounded-full">#체계적</span>
                            <span className="bg-slate-700 text-orange-400 text-xs font-semibold px-2 py-1 rounded-full">#설득의신</span>
                            <span className="bg-slate-700 text-orange-400 text-xs font-semibold px-2 py-1 rounded-full">#AI인증</span>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </div>

      <main ref={practiceSectionRef} className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {hasSavedSession ? (
          <section className="mb-12 md:mb-16 p-6 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-2xl text-center shadow-lg">
            <h2 className="text-2xl font-bold text-orange-900/90 mb-2">
              앗, 아직 끝나지 않은 연습이 있어요! 😮
            </h2>
            <p className="text-orange-800/80 mb-6">
              <span className="font-bold">"{topic}"</span> 주제로 {conversation.length}개의 대화를 나눴습니다.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleResume}
                className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-orange-600 transition-all duration-300 transform hover:scale-105"
              >
                이어서 하기
              </button>
              <button
                onClick={handleStartNew}
                className="bg-white/80 backdrop-blur-sm text-slate-700 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-white transition-all duration-300 border border-slate-300"
              >
                새로 시작
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-12 md:mb-16">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-800">먼저, 연습할 상황을 선택해주세요 👇</h2>
                <p className="mt-2 text-slate-500">하나를 선택 한 후 말하기 연습을 시작해보세요.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TopicCard 
                    topic={Topic.INTERVIEW}
                    emoji="💼" 
                    title="면접 완전 정복하기"
                    description="자신감 있는 답변으로 합격을 향해!"
                    isSelected={topic === Topic.INTERVIEW} 
                    onSelect={() => setTopic(Topic.INTERVIEW)}
                    isPopular={true}
                />
                <TopicCard 
                    topic={Topic.PRESENTATION}
                    emoji="🎤"
                    title="떨지 않고 발표하기"
                    description="청중을 사로잡는 발표 마스터 되기"
                    isSelected={topic === Topic.PRESENTATION} 
                    onSelect={() => setTopic(Topic.PRESENTATION)}
                    isPopular={true}
                />
                <TopicCard 
                    topic={Topic.DAILY}
                    emoji="💬"
                    title="말하기 감각 깨우기"
                    description="재치있고 논리적인 대화 스킬 UP!"
                    isSelected={topic === Topic.DAILY} 
                    onSelect={() => setTopic(Topic.DAILY)} 
                />
              </div>
            </section>

            <div className="text-center mb-16 md:mb-24">
                <button
                    onClick={handleStart}
                    disabled={!topic}
                    className="relative z-10 bg-orange-500 text-white font-bold py-4 px-12 rounded-lg text-xl shadow-lg hover:bg-orange-600 transition-all duration-300 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none transform disabled:transform-none hover:scale-105"
                >
                    연습 시작! 🔥
                </button>
            </div>
          </>
        )}

        <section>
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-800">AI 말하기 코치는 이렇게 똑똑해요</h2>
                <p className="mt-2 text-slate-500">체계적인 3단계 분석으로 당신의 성장을 돕습니다.</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-10">
                <HowItWorksStep
                    icon={<MicIcon className="w-8 h-8"/>}
                    step="Step 1"
                    title="녹음 & 연습"
                    description="주제에 맞춰 편하게 말해보세요. AI가 당신의 목소리를 실시간으로 듣고 있어요."
                />
                 <HowItWorksStep
                    icon={<FeedbackIcon className="w-8 h-8"/>}
                    step="Step 2"
                    title="AI 상세 분석"
                    description="말하기 습관, 목소리 톤, 사용 어휘까지 꼼꼼하게 분석해 강점과 개선점을 찾아내요."
                />
                 <HowItWorksStep
                    icon={<ShieldIcon className="w-8 h-8"/>}
                    step="Step 3"
                    title="결과 리포트"
                    description="당신만의 '말하기 캐릭터'를 발견하고, 공유하고 싶어지는 멋진 결과 리포트를 받아보세요!"
                />
            </div>
        </section>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="mb-10">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">성과를 내는 말하기, 이제 데이터로 완성합니다.</h3>
                <div className="mt-6">
                    <a
                        href="https://www.candidate.im/candidate-remote-consultation?utm_source=aistudio&utm_medium=display&utm_campaign=ai-speach&utm_content=cta"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-slate-900 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg hover:bg-slate-700 transition-all duration-300 transform hover:scale-105"
                    >
                        서비스 도입 문의
                    </a>
                </div>
            </div>
            <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} AI Speech Coach. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;