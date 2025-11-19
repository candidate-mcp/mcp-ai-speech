import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ai } from '../services/geminiService';
// FIX: Removed 'LiveSession' as it is not an exported member of '@google/genai'.
import { LiveServerMessage, Modality, Blob } from '@google/genai';

// --- Start of Web Speech API types (for non-Android) ---
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number; item(index: number): SpeechRecognitionResult; [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean; readonly length: number; item(index: number): SpeechRecognitionAlternative; [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative { readonly transcript: string; readonly confidence: number; }
interface SpeechRecognitionErrorEvent extends Event { readonly error: string; readonly message: string; }
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
  onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
  onend: (this: SpeechRecognition, ev: Event) => any;
  start(): void; stop(): void;
}
interface SpeechRecognitionStatic { new (): SpeechRecognition; }
declare global { 
  // FIX: Added webkitAudioContext to the global Window interface to resolve a TypeScript error for cross-browser compatibility.
  interface Window { 
    SpeechRecognition: SpeechRecognitionStatic; 
    webkitSpeechRecognition: SpeechRecognitionStatic; 
    webkitAudioContext: typeof AudioContext;
  } 
}
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// --- End of Web Speech API types ---

// --- Start of Gemini Live API Helper Functions (for Android) ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // FIX: Symmetrically convert float audio data to 16-bit PCM.
    // Multiplying by 32767 avoids potential clipping/overflow issues that
    // could occur with asymmetric conversion, ensuring cleaner audio data is
    // sent to the Gemini API for more reliable transcription on Android.
    int16[i] = data[i] * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
// --- End of Gemini Live API Helper Functions ---


export const useSpeechRecognition = ({ 
  onError, 
  onEnd 
}: { 
  onError?: (error: string) => void;
  onEnd?: (transcript: string) => void; 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onEndRef = useRef(onEnd);
  const intentionalStopRef = useRef(false);

  // --- Start of Gemini Live API refs and state ---
  const isAndroid = useMemo(() => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent), []);
  const useGeminiLive = useMemo(() => isAndroid || !SpeechRecognition, [isAndroid]);
  const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const finalTranscriptFromGemini = useRef('');
  // FIX: Add a ref to track if a stop action is in progress to prevent race conditions.
  const isStoppingRef = useRef(false);
  // --- End of Gemini Live API refs and state ---

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const stopGeminiRecording = useCallback(() => {
    // FIX: Immediately disconnect the script processor to halt the `onaudioprocess`
    // callback. This is crucial to prevent `sendRealtimeInput` from being called
    // on a session that is already closing, which is a primary cause of API errors.
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
    }
    
    setIsListening(false);
    
    if(intentionalStopRef.current && onEndRef.current) {
        onEndRef.current(finalTranscriptFromGemini.current);
    }
    finalTranscriptFromGemini.current = ''; // Reset for next use
    intentionalStopRef.current = false; // Always reset flag
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;
    setTranscript('');
    intentionalStopRef.current = false;
    isStoppingRef.current = false; // Reset the stopping flag at the beginning of a start attempt.

    // --- USE GEMINI LIVE API ---
    if (useGeminiLive) {
        finalTranscriptFromGemini.current = '';
        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsListening(true);
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        // FIX: Check if a stop request was made during the connection phase.
                        // If so, abort the setup and immediately close the session to
                        // prevent race conditions.
                        if (isStoppingRef.current) {
                            console.warn('Gemini Live: Aborting setup because stop was called during connection.');
                            sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
                            return;
                        }

                        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current!);
                        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                // CRITICAL FIX: Check the stopping flag *immediately before* sending data.
                                // This prevents a race condition where a stop request arrives after
                                // the `onaudioprocess` event has started but before the data is sent,
                                // thus avoiding sending data to a closing session.
                                if (isStoppingRef.current) {
                                    return;
                                }
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            finalTranscriptFromGemini.current += text;
                            setTranscript(finalTranscriptFromGemini.current);
                        }
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                            // Acknowledge model's audio output to comply with API contract.
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live API Error:', e);
                        // FIX: Suppress the error alert if the error occurred during a
                        // user-initiated stop action, as this is expected behavior in a
                        // rapid start/stop scenario and not a true failure.
                        if (isStoppingRef.current) {
                            console.warn('Gemini Live API Error occurred during stop, suppressing alert.');
                            stopGeminiRecording();
                            return;
                        }
                        if (onError) onError('Gemini API Error');
                        stopGeminiRecording();
                    },
                    onclose: (e: CloseEvent) => {
                       stopGeminiRecording();
                    },
                },
                config: {
                    inputAudioTranscription: {},
                    responseModalities: [Modality.AUDIO],
                },
            });

        } catch (err) {
            console.error("Error starting Gemini recording:", err);
            if (onError) onError(err instanceof Error ? err.name : 'Unknown Error');
            setIsListening(false);
        }
        return;
    }

    // --- USE WEB SPEECH API (fallback for supported browsers) ---
    if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const newTranscript = Array.from(event.results).map(result => result[0].transcript).join('');
            setTranscript(newTranscript);
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech' || event.error === 'aborted') {
                console.warn(`Speech recognition ended with '${event.error}'. This is often due to a quick stop and is handled gracefully.`);
                return;
            }
            if (onError) onError(event.error);
        };
        recognition.onend = () => {
            setIsListening(false);
            if (intentionalStopRef.current) {
                setTranscript(currentTranscript => {
                    if (onEndRef.current) onEndRef.current(currentTranscript);
                    return currentTranscript;
                });
            }
            intentionalStopRef.current = false;
        };
        recognitionRef.current = recognition;
    }
    
    try {
        recognitionRef.current.start();
        setIsListening(true);
    } catch (err) {
        console.error("Error starting speech recognition:", err);
        if (onError && err instanceof Error) onError(err.name);
        setIsListening(false);
    }
  }, [isListening, onError, useGeminiLive, stopGeminiRecording]);

  const stopListening = useCallback(() => {
    if (!isListening) return;
    intentionalStopRef.current = true;
    isStoppingRef.current = true; // Set the stopping flag immediately.

    if (useGeminiLive) {
        stopGeminiRecording();
        return;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, useGeminiLive, stopGeminiRecording]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      intentionalStopRef.current = false;
      if (useGeminiLive) {
        stopGeminiRecording();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [useGeminiLive, stopGeminiRecording]);

  const hasRecognitionSupport = useMemo(() => {
    const hasGeminiSupport = !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return !!SpeechRecognition || hasGeminiSupport;
  }, []);

  return { isListening, transcript, startListening, stopListening, hasRecognitionSupport };
};