import { GoogleGenAI } from '@google/genai';
import { Topic, ConversationTurn } from '../types';

// The SDK uses an enum for schema types. We replicate the necessary parts here.
enum Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
}

// Initialize the GoogleGenAI instance and export it for use across the app.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


export const analyzePerformance = async (topic: Topic, conversation: ConversationTurn[]): Promise<any> => {
    const model = 'gemini-2.5-flash';
    
    // FIX: Handle cases where the user completes a session without providing any answers.
    // This prevents API errors from an empty analysis target and provides a default,
    // encouraging feedback report, ensuring a consistent user experience.
    const allAnswersEmpty = conversation.every(turn => turn.answer.trim() === '' || turn.answer.trim() === '(답변 없음)');

    if (allAnswersEmpty && conversation.length > 0) {
        console.warn("All answers are empty. Generating default low-grade feedback.");
        return {
            speakingType: "묵언수행 도전자",
            speakingTypeDescription: "아직 당신의 목소리를 듣지 못했어요. 다음엔 꼭 당신의 생각을 들려주세요!",
            level: "Lv.1 스피치 병아리",
            habits: "아직 답변이 없어 분석할 수 없지만, 시작이 반이에요! 다음엔 꼭 목소리를 들려주세요.",
            dialect: "아직 목소리를 듣지 못해 분석할 수 없어요.",
            strengths: "도전하는 용기가 가장 큰 강점입니다! 다음 단계로 나아갈 준비가 되셨네요.",
            improvements: "다음 연습에서는 질문에 짧게라도 답변해보는 것을 목표로 해보세요. 어떤 말이든 괜찮아요!",
            summary: "스피치 여정의 첫 걸음을 뗀 것을 축하해요! 이제 당신의 목소리를 세상에 들려줄 시간입니다.",
            rankPercentile: 100,
            levelUpSuggestion: "다음 연습에서 한 마디만 해도 레벨업! 할 수 있어요!",
            hashtags: ["#도전의시작", "#묵언수행", "#다음엔꼭"],
            individualFeedbacks: conversation.map(turn => ({
                question: turn.question,
                answer: turn.answer,
                feedback: "답변이 없어 피드백을 드릴 수 없어요. 다음엔 꼭 답변을 녹음해주세요!"
            }))
        };
    }
    
    const analysisTarget = `사용자는 "${topic}" 주제로 말하기 연습을 했습니다. 다음은 전체 대화 내용입니다:\n${conversation.map(turn => `Q: ${turn.question}\nA: ${turn.answer || "(답변 없음)"}`).join('\n\n')}`;
    
    const instructions = `당신은 사용자의 말하기 능력을 분석하고 MBTI 테스트 결과처럼 재미있고 공유하고 싶게 만드는 피드백을 생성하는 AI 스피치 코치입니다. 20-30대 사용자를 타겟으로, 재치 있고 격려하는 톤을 사용해주세요. 주어진 JSON 스키마에 따라 분석 결과를 한국어로 제공해주세요.

중요: 'level'과 'rankPercentile' 값은 서로 논리적으로 일관되어야 합니다. 예를 들어, 'Lv.1 스피치 병아리'는 보통 상위 70-100% 범위에 해당하고, 'Lv.4 스피치 마스터'는 상위 1-10% 범위에 해당해야 합니다.`;

    const prompt = `${instructions}\n\n[분석 대상]\n${analysisTarget}`;
    
    const feedbackSchema = {
        type: Type.OBJECT,
        properties: {
            speakingType: { type: Type.STRING, description: '사용자의 말하기 스타일을 나타내는 창의적이고 재미있는 캐릭터명 (예: "논리정연 빌드업 마스터", "감성 폭발형 공감술사")' },
            speakingTypeDescription: { type: Type.STRING, description: '해당 캐릭터명에 대한 짧고 재치있는 설명.' },
            level: { type: Type.STRING, description: '말하기 실력 레벨. "Lv.1 스피치 병아리", "Lv.2 스피치 챌린저", "Lv.3 스피치 고수", "Lv.4 스피치 마스터" 중 하나로 표현.' },
            habits: { type: Type.STRING, description: '재미있게 표현된 말하기 습관 분석. "어... 같은 필러가 좀 있네요. 생각할 시간이 필요했군요!" 처럼 친근하게 표현.' },
            dialect: { type: Type.STRING, description: '재미있게 표현된 사투리 사용 여부 분석. "구수한 사투리가 매력 포인트!"나 "서울말 완전 정복!" 과 같이 긍정적이고 재미있게 표현.' },
            strengths: { type: Type.STRING, description: '잘한 점에 대한 구체적이고 칭찬하는 피드백. 최소 3문장 이상으로 상세하게 작성.' },
            improvements: { type: Type.STRING, description: '개선점에 대한 부드럽고 격려하는 제안. 최소 3문장 이상으로 상세하게 작성.' },
            summary: { type: Type.STRING, description: '전체적인 성과에 대한 총평. "인싸력 60점. 다음엔 100점 가즈아!" 와 같이 짧고 강렬한 밈/코멘트 스타일로 작성하되, 최소 3문장 이상으로 성의있게 작성.' },
            rankPercentile: { type: Type.NUMBER, description: '전체 사용자 중 상위 몇 퍼센트인지 1에서 100 사이의 정수 숫자로 제공. (예: 35)' },
            levelUpSuggestion: { type: Type.STRING, description: '다음 레벨 달성을 위한 동기부여 메시지. "연습 1회만 더하면 Lv.2 달성!"' },
            hashtags: {
              type: Type.ARRAY,
              description: 'SNS 공유를 위한 재미있는 해시태그 3개 배열. (예: ["#AI스피치코치", "#말잘하고싶다", "#오늘의TMI"])',
              items: { type: Type.STRING }
            },
            individualFeedbacks: {
              type: Type.ARRAY,
              description: '각 질문과 답변에 대한 개별 피드백 배열. 원래 질문과 답변을 그대로 복사하고, 피드백을 추가.',
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "사용자에게 제시된 원래 질문" },
                  answer: { type: Type.STRING, description: "사용자의 답변. 없다면 빈 문자열." },
                  feedback: { type: Type.STRING, description: '답변에 대한 건설적인 피드백. 최소 2문장 이상으로 작성.' }
                },
                required: ['question', 'answer', 'feedback']
              }
            }
        },
        required: [
            'speakingType', 'speakingTypeDescription', 'level', 'habits', 'dialect', 
            'strengths', 'improvements', 'summary', 'rankPercentile', 
            'levelUpSuggestion', 'hashtags', 'individualFeedbacks'
        ]
    };

    try {
        const response = await ai.models.generateContent({
            model,
            // FIX: Simplified the `contents` property for a text-only prompt, adhering to Gemini API best practices.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: feedbackSchema,
            },
        });
        
        const jsonText = response.text;

        if (!jsonText) {
            console.error("Invalid response structure from API:", response);
            throw new Error("API로부터 유효하지 않은 응답을 받았습니다.");
        }

        return JSON.parse(jsonText.trim());

    } catch (error) {
        console.error("Error analyzing performance:", error);
        throw new Error("피드백 분석 중 오류가 발생했습니다.");
    }
};