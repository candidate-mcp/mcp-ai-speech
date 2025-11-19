import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAppContext } from '../context/AppContext';
import { 
    ChevronDownIcon, ChevronUpIcon, HomeIcon, DownloadIcon, DocumentIcon 
} from '../components/icons';
import { IndividualFeedback } from '../types';

const CardFeedbackItem: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="bg-slate-50/10 backdrop-blur-sm p-4 rounded-lg shadow-md border border-slate-50/20">
    <h3 className="font-bold text-orange-400 mb-2 text-sm">{title}</h3>
    <p className="text-slate-200 whitespace-pre-wrap text-base">{content}</p>
  </div>
);

const CardFeedbackMainItem: React.FC<{ title: string; content: string }> = ({ title, content }) => (
    <div className="bg-white p-5 rounded-lg shadow-sm text-slate-800">
      <h3 className="font-bold text-orange-500 mb-2">{title}</h3>
      <p className="text-slate-700 whitespace-pre-wrap">{content}</p>
    </div>
);


const IndividualFeedbackItem: React.FC<{ item: IndividualFeedback; forceOpen?: boolean }> = ({ item, forceOpen }) => {
  const [isToggled, setIsToggled] = useState(false);
  const isOpen = forceOpen || isToggled;

  return (
    <div className="border border-slate-200 rounded-lg mb-4 overflow-hidden transition-all duration-300 shadow-sm bg-white">
        <button
            onClick={() => setIsToggled(!isToggled)}
            className={`w-full text-left p-4 flex justify-between items-center transition-colors ${
                isOpen ? 'bg-orange-50 text-orange-700' : 'bg-white hover:bg-slate-50'
            }`}
        >
            <div className="flex-1 pr-4">
                <p className="font-semibold text-slate-800">{item.question}</p>
            </div>
            <div className={`flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors ${isOpen ? 'text-orange-600' : 'text-slate-600'}`}>
                <span>{isOpen ? '피드백 숨기기' : '피드백 보기'}</span>
                {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </div>
        </button>
        {isOpen && (
            <div className="px-4 py-5 border-t border-slate-200 bg-white">
                <div>
                    <h4 className="font-semibold text-slate-600 mb-2">나의 답변:</h4>
                    <div className="bg-slate-100 p-3 rounded-md text-slate-800 mb-4 whitespace-pre-wrap">
                        <p>{item.answer || "답변이 없습니다."}</p>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-orange-600 mb-2">AI 피드백:</h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{item.feedback}</p>
                </div>
            </div>
        )}
    </div>
  );
};

const ResultsPage: React.FC = () => {
  const { topic, feedback, resetState } = useAppContext();
  const navigate = useNavigate();
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  useEffect(() => {
    if (!feedback) {
      navigate('/');
    }
  }, [feedback, navigate]);

  const handleCapture = async (format: 'png' | 'pdf') => {
    if (!captureRef.current || isCapturing) return;
    
    setIsCapturing(true);

    // Wait for state update to expand toggles before capturing
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = captureRef.current;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff', // Explicitly set background to white for consistency
    });
    
    const fileName = `AI스피치코치_결과리포트.${format}`;

    if (format === 'png') {
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else { // pdf
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgHeight = pdfWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        pdf.save(fileName);
    }

    setIsCapturing(false);
  };


  if (!feedback) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <p className="mt-4 text-xl font-semibold text-slate-700">분석 결과가 없습니다. 홈으로 돌아갑니다.</p>
        </div>
    );
  }

  const handleGoHome = () => {
    resetState();
    navigate('/');
  };

  const ActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, text: string, className?: string, disabled?: boolean}> = 
  ({onClick, icon, text, className, disabled}) => (
     <button onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
        {icon}
        <span>{text}</span>
    </button>
  );

  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div ref={captureRef} className="bg-white">
            {/* Shareable Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-orange-500/30 rounded-full filter blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-24 -ml-12 w-64 h-64 bg-orange-500/40 rounded-full filter blur-3xl"></div>
                <div className="relative z-10">
                    <header className="text-center mb-8">
                        <p className="font-semibold text-orange-400 tracking-wider">{topic} 세션 결과</p>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-2 leading-tight drop-shadow-lg">
                            {feedback.speakingType}
                        </h1>
                        <p className="mt-3 text-lg text-slate-300 max-w-xl mx-auto">{feedback.speakingTypeDescription}</p>
                    </header>

                    <main>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                        <div className="md:col-span-2">
                            <CardFeedbackItem title="스피치 레벨" content={feedback.level} />
                        </div>
                        <div className="md:col-span-2">
                            <CardFeedbackItem title="총평" content={feedback.summary} />
                        </div>
                        <CardFeedbackItem title="말하기 습관" content={feedback.habits} />
                        <CardFeedbackItem title="사투리 여부" content={feedback.dialect} />
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CardFeedbackMainItem title="잘한 점 👍" content={feedback.strengths} />
                            <CardFeedbackMainItem title="개선할 점 ✍️" content={feedback.improvements} />
                        </div>

                        <div className="mt-8 text-center">
                            <div className="flex justify-center gap-2 flex-wrap">
                                {feedback.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-orange-400 text-sm font-semibold px-3 py-1 rounded-full">{tag}</span>)}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <div className="text-center my-6 bg-orange-100 p-5 rounded-lg shadow-md border border-orange-200">
                <h3 className="text-lg font-bold text-orange-900/90 mb-2">레벨업 꿀팁 🚀</h3>
                <p className="font-semibold text-orange-800/90">{feedback.levelUpSuggestion}</p>
            </div>

            <section className="mt-10 p-4 sm:p-0">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">답변별 개별 피드백</h2>
                <div>
                    {feedback.individualFeedbacks.map((item, index) => (
                    <IndividualFeedbackItem key={index} item={item} forceOpen={isCapturing} />
                    ))}
                </div>
            </section>
        </div>

        {/* --- Action Buttons --- */}
        <div className="mt-10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                    onClick={() => handleCapture('png')} 
                    disabled={isCapturing}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DownloadIcon className="w-5 h-5"/>
                    <span>{isCapturing ? '저장 중...' : '이미지로 저장'}</span>
                </button>
                <button 
                    onClick={() => handleCapture('pdf')} 
                    disabled={isCapturing}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DocumentIcon className="w-5 h-5"/>
                    <span>{isCapturing ? '저장 중...' : 'PDF로 저장'}</span>
                </button>
            </div>
            <ActionButton 
              onClick={handleGoHome} 
              icon={<HomeIcon className="w-5 h-5"/>} 
              text="홈으로 이동" 
              className="bg-orange-500 text-white hover:bg-orange-600" 
              disabled={isCapturing}
            />
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;