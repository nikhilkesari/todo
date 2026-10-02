import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/aiService';
import { VoiceChatMessage, ExtractedVoiceTask, VoiceDialogueResponse } from '../types';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'complete' | 'error';

// Browser Web Speech API interfaces
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export function useVoiceConversation(isOpen: boolean) {
  const { addTask, projects } = useApp();

  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [extractedTask, setExtractedTask] = useState<ExtractedVoiceTask | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isCompleteRef = useRef<boolean>(false);
  const prevIsOpenRef = useRef<boolean>(false);

  // Persistent listening tracking
  const userWantsListeningRef = useRef<boolean>(false);
  const accumulatedSpeechRef = useRef<string>('');
  const interimSpeechRef = useRef<string>('');

  const messagesRef = useRef<VoiceChatMessage[]>([]);
  const projectsRef = useRef(projects);

  messagesRef.current = messages;
  projectsRef.current = projects;

  // Pick natural voice for speech synthesis
  const getNaturalVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferredNames = [
      'Samantha',
      'Google US English',
      'Google UK English Female',
      'Daniel',
      'Karen',
      'Serena',
      'Moira',
      'Alex',
    ];

    for (const name of preferredNames) {
      const match = voices.find((v) => v.name.includes(name));
      if (match) return match;
    }

    const defaultEnglish = voices.find((v) => v.lang.startsWith('en') && v.default);
    if (defaultEnglish) return defaultEnglish;

    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }, []);

  // Stop any active speech synthesis
  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
  }, []);

  // Speak assistant response with natural cadence
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onDone?.();
        return;
      }

      cancelSpeech();

      const cleanSpoken = text.replace(/[*_#`[\]()]/g, '').trim();
      if (!cleanSpoken) {
        onDone?.();
        return;
      }

      let hasFinished = false;
      let safetyTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        isSpeakingRef.current = false;
        onDone?.();
      };

      try {
        const utterance = new SpeechSynthesisUtterance(cleanSpoken);
        const voice = getNaturalVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.02;

        utterance.onstart = () => {
          isSpeakingRef.current = true;
          setState('speaking');
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('Speech synthesis utterance error:', e.error);
          }
          finish();
        };

        window.speechSynthesis.speak(utterance);

        // Safety fallback timer for headless test environments without active audio drivers
        const wordCount = cleanSpoken.split(/\s+/).length;
        const estDurationMs = Math.min(2500, Math.max(300, wordCount * 120));
        safetyTimer = setTimeout(finish, estDurationMs);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
        finish();
      }
    },
    [cancelSpeech, getNaturalVoice]
  );

  // Process a completed turn of user speech
  const processTurn = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      cancelSpeech();
      setState('thinking');
      setInterimTranscript('');

      const updatedHistory: VoiceChatMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: trimmed },
      ];
      setMessages(updatedHistory);

      try {
        const projectSummaries = projectsRef.current.map((p) => ({ id: p.id, name: p.name }));
        const response: VoiceDialogueResponse = await aiService.voiceDialogue(
          updatedHistory,
          projectSummaries
        );

        if (!isMountedRef.current) return;

        if (response.extractedTask) {
          setExtractedTask((prev) => ({
            ...prev,
            ...response.extractedTask,
          }));
        }

        const nextHistory: VoiceChatMessage[] = [
          ...updatedHistory,
          { role: 'assistant', content: response.reply },
        ];
        setMessages(nextHistory);

        if (response.isComplete && response.extractedTask && response.extractedTask.title) {
          isCompleteRef.current = true;
          try {
            await addTask({
              title: response.extractedTask.title,
              description: response.extractedTask.description,
              dueDate: response.extractedTask.dueDate,
              projectId: response.extractedTask.projectId || 'inbox',
              priority: response.extractedTask.priority || 'medium',
              completed: false,
            });
          } catch (dbErr) {
            console.error('Failed to commit voice task to database:', dbErr);
          }

          speakText(response.reply, () => {
            if (isMountedRef.current) {
              setState('complete');
            }
          });
        } else if (response.action === 'cancel') {
          speakText(response.reply, () => {
            if (isMountedRef.current) {
              setState('idle');
            }
          });
        } else {
          // Assistant spoke response (clarification or confirmation)
          speakText(response.reply, () => {
            if (isMountedRef.current && !isCompleteRef.current) {
              setState('idle');
            }
          });
        }
      } catch (err: unknown) {
        console.error('Error during voice dialogue turn:', err);
        if (isMountedRef.current) {
          const fallbackMsg = "I'm having a little trouble connecting. Could you please say that once more?";
          setMessages((prev) => [...prev, { role: 'assistant', content: fallbackMsg }]);
          speakText(fallbackMsg, () => {
            if (isMountedRef.current) {
              setState('idle');
            }
          });
        }
      }
    },
    [addTask, cancelSpeech, speakText]
  );

  // Helper to initialize or retrieve the speech recognition instance
  const getOrCreateRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return null;
    }

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      isListeningRef.current = true;
      setState('listening');
      setErrorMessage(null);
    };

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) {
          accumulatedSpeechRef.current = (accumulatedSpeechRef.current + ' ' + transcript).trim();
        } else {
          interim += transcript;
        }
      }
      interimSpeechRef.current = interim;
      const combined = (accumulatedSpeechRef.current + ' ' + interim).trim();
      setInterimTranscript(combined);
    };

    rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
      // Ignore 'no-speech' pauses: user is allowed to pause while talking persistently
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'not-allowed') {
        userWantsListeningRef.current = false;
        isListeningRef.current = false;
        setErrorMessage('Microphone access denied. Please enable mic permissions or type below.');
        setState('error');
        return;
      }
      console.warn('Speech recognition notice:', event.error);
    };

    rec.onend = () => {
      isListeningRef.current = false;
      // If user still wants listening (did NOT press stop button), restart immediately!
      if (userWantsListeningRef.current && isMountedRef.current) {
        try {
          rec.start();
          isListeningRef.current = true;
          setState('listening');
        } catch {
          setTimeout(() => {
            if (userWantsListeningRef.current && isMountedRef.current) {
              try {
                rec.start();
                isListeningRef.current = true;
                setState('listening');
              } catch {
                // ignore
              }
            }
          }, 150);
        }
      } else {
        setState((curr) => (curr === 'listening' ? 'idle' : curr));
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, []);

  // Start persistent listening
  const startListening = useCallback(() => {
    cancelSpeech();
    userWantsListeningRef.current = true;
    accumulatedSpeechRef.current = '';
    interimSpeechRef.current = '';
    setInterimTranscript('');
    setErrorMessage(null);

    const rec = getOrCreateRecognition();
    if (!rec) return;

    try {
      rec.start();
      isListeningRef.current = true;
      setState('listening');
    } catch {
      isListeningRef.current = true;
      setState('listening');
    }
  }, [cancelSpeech, getOrCreateRecognition]);

  // Stop persistent listening and process the captured speech
  const stopListening = useCallback(() => {
    userWantsListeningRef.current = false;
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setState('idle');

    // Retrieve entire captured transcript from this persistent session
    const fullText = (accumulatedSpeechRef.current + ' ' + interimSpeechRef.current).trim();
    accumulatedSpeechRef.current = '';
    interimSpeechRef.current = '';
    setInterimTranscript('');

    if (fullText) {
      processTurn(fullText);
    }
  }, [processTurn]);

  // Toggle persistent listening on/off with button press
  const toggleMic = useCallback(() => {
    if (state === 'listening' || isListeningRef.current || userWantsListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Manual task confirmation
  const confirmTask = useCallback(async () => {
    if (!extractedTask || !extractedTask.title) return;

    try {
      setState('thinking');
      cancelSpeech();
      await addTask({
        title: extractedTask.title,
        description: extractedTask.description,
        dueDate: extractedTask.dueDate,
        projectId: extractedTask.projectId || 'inbox',
        priority: extractedTask.priority || 'medium',
        completed: false,
      });

      isCompleteRef.current = true;
      const successMsg = `Great! I've added "${extractedTask.title}" to your tasks.`;
      setMessages((prev) => [...prev, { role: 'assistant', content: successMsg }]);
      speakText(successMsg, () => {
        if (isMountedRef.current) {
          setState('complete');
        }
      });
    } catch (err) {
      console.error('Failed to confirm task:', err);
      setState('error');
      setErrorMessage('Could not save task. Please try again.');
    }
  }, [extractedTask, addTask, cancelSpeech, speakText]);

  // Reset conversation
  const resetConversation = useCallback(() => {
    cancelSpeech();
    userWantsListeningRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    isCompleteRef.current = false;
    setExtractedTask(null);
    setInterimTranscript('');
    setErrorMessage(null);

    const greeting: VoiceChatMessage = {
      role: 'assistant',
      content: "Hey there! What can I help you add to your task list today?",
    };
    setMessages([greeting]);
    setState('idle');

    // Automatically start listening persistently upon opening so user can talk immediately!
    startListening();
  }, [cancelSpeech, startListening]);

  // Only trigger reset when isOpen transitions from false to true
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window !== 'undefined') {
      const hasSpeechRec = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setIsSupported(hasSpeechRec);
    }

    if (isOpen && !prevIsOpenRef.current) {
      resetConversation();
    } else if (!isOpen && prevIsOpenRef.current) {
      cancelSpeech();
      userWantsListeningRef.current = false;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    }
    prevIsOpenRef.current = isOpen;

    return () => {
      if (!isOpen) {
        cancelSpeech();
        userWantsListeningRef.current = false;
        isListeningRef.current = false;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
      }
    };
  }, [isOpen, resetConversation, cancelSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelSpeech();
      userWantsListeningRef.current = false;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [cancelSpeech]);

  return {
    state,
    messages,
    interimTranscript,
    extractedTask,
    errorMessage,
    isSupported,
    isListening: state === 'listening' || isListeningRef.current || userWantsListeningRef.current,
    startListening,
    stopListening,
    toggleMic,
    sendMessage: processTurn,
    confirmTask,
    resetConversation,
  };
}
