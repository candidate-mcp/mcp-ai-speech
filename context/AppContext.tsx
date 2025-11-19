import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Topic, ConversationTurn, Feedback } from '../types';

interface AppContextType {
  topic: Topic | null;
  setTopic: (topic: Topic | null) => void;
  conversation: ConversationTurn[];
  setConversation: (conversation: ConversationTurn[]) => void;
  addTurn: (turn: ConversationTurn) => void;
  feedback: Feedback | null;
  setFeedback: (feedback: Feedback | null) => void;
  resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const LOCAL_STORAGE_KEY = 'ai-speech-coach-session';


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSession) {
        const { topic: savedTopic, conversation: savedConversation } = JSON.parse(savedSession);
        if (savedTopic && Array.isArray(savedConversation) && savedConversation.length > 0) {
          setTopic(savedTopic);
          setConversation(savedConversation);
        }
      }
    } catch (error) {
      console.error("Failed to load session from localStorage", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  const addTurn = (turn: ConversationTurn) => {
    setConversation(prev => [...prev, turn]);
  };
  
  const resetState = () => {
    setTopic(null);
    setConversation([]);
    setFeedback(null);
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
        console.error("Failed to remove session from localStorage", error);
    }
  };


  return (
    <AppContext.Provider value={{ topic, setTopic, conversation, setConversation, addTurn, feedback, setFeedback, resetState }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};