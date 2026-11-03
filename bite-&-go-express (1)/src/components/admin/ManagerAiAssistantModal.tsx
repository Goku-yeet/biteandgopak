import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Bike,
  Flame,
  MessageSquare,
  Clock,
  Zap,
  Volume2,
  VolumeX,
  Share2,
  CheckCircle2,
  Download,
  ChefHat,
  Sliders,
  Megaphone,
  Store,
  AlertTriangle,
  Image as ImageIcon,
  Paperclip,
  Maximize2,
  Camera,
  RotateCcw,
  Star,
  Mic,
  MicOff,
} from 'lucide-react';
import { Order, MenuItem, StoreSettings } from '../../types';
import { isStoreOpenNow } from '../../utils/operatingHours';
import { StorageService } from '../../utils/storage';

const AI_CHAT_STORAGE_KEY = 'bg_manager_ai_chat_history_v2';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  metrics?: any;
  actionType?: 'whatsapp' | 'banner' | 'prep_time' | 'report';
  actionPayload?: any;
  images?: string[]; // Attached image data URLs (from user or AI)
  generatedImageUrl?: string; // AI generated visual (SVG or PNG base64)
}

export interface ManagerAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken?: string;
  orders?: Order[];
  menuItems?: MenuItem[];
  settings?: StoreSettings;
  onRefreshData?: () => void;
}

type TopicCategory = 'sales' | 'kitchen' | 'combos' | 'visuals' | 'support' | 'marketing' | 'dispatch';

interface PendingImage {
  name: string;
  type: string;
  dataUrl: string;
}

export const ManagerAiAssistantModal: React.FC<ManagerAiAssistantModalProps> = ({
  isOpen,
  onClose,
  adminToken,
  orders = [],
  menuItems = [],
  settings,
  onRefreshData,
}) => {
  // Compute live restaurant metrics for instant HUD visibility
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const todayRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgBasket = deliveredOrders.length > 0 ? Math.round(todayRevenue / deliveredOrders.length) : 0;
  const outOfStockItems = menuItems.filter((i) => !i.isAvailable);
  const prepMinutes = settings?.customerWidgets?.estimatedPrepMinutes || 15;
  const openStatus = isStoreOpenNow(settings);
  const isStoreOpen = openStatus.isOpen;

  const [activeCategory, setActiveCategory] = useState<TopicCategory>('sales');

  const defaultWelcomeMessage: ChatMessage = {
    id: 'welcome',
    sender: 'ai',
    text: `Assalam-o-Alaikum! Hassan here, your operations partner at Bite & Go North Nazimabad Block-I.

I'm tracking our live ticket backlog, griddle pace, menu margins, customer support, and promotional visuals in real-time.

Today we've clocked **Rs. ${todayRevenue.toLocaleString()}** across **${deliveredOrders.length} delivered orders**, with **${activeOrders.length} active tickets** in the kitchen.

✨ **Capabilities Active:**
• 📷 **Send me images:** Attach photos of burger sears, bun toast, packaging, or receipts for instant culinary review.
• 🎨 **Image Generation:** Ask me to generate branded promotional posters, smash burger graphics, or combo banners.
• 🧠 **Persistent Memory Active:** I remember our previous chats and follow up with you naturally.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(AI_CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load AI chat history:', e);
    }
    return [defaultWelcomeMessage];
  });

  // Automatically save chat history whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn('Failed to persist AI chat history:', e);
    }
  }, [messages]);

  const handleClearChat = () => {
    try {
      localStorage.removeItem(AI_CHAT_STORAGE_KEY);
    } catch {}
    setMessages([
      {
        ...defaultWelcomeMessage,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Voice Interaction: Listen (Microphone) & Speak (Speaker)
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en-US' | 'ur-PK'>('en-US');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bg_manager_ai_autospeak');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [conversationalVoiceMode, setConversationalVoiceMode] = useState<boolean>(false);
  const conversationalVoiceModeRef = useRef(false);
  const isVoiceInputRef = useRef(false);
  const lastTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechResumeIntervalRef = useRef<any>(null);

  // Preload and cache browser voices eagerly so speech synthesis is instantaneous
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const list = window.speechSynthesis.getVoices();
          if (list && list.length > 0) {
            availableVoicesRef.current = list;
          }
        } catch {}
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Web Audio tone feedback for voice interaction (100% reliable across browsers)
  const playAudioFeedback = (tone: 'listen' | 'reply') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (tone === 'listen') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else {
        // Melodic dual-tone chime for AI reply
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.19);
      }
    } catch {}
  };

  // Synchronously prime / awaken speech engine within user gesture context
  const primeSpeechEngine = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.getVoices();
        // Zero-volume dummy utterance to awaken browser audio pipeline
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0.01;
        window.speechSynthesis.speak(dummy);
      } catch {}
    }
  };

  useEffect(() => {
    conversationalVoiceModeRef.current = conversationalVoiceMode;
  }, [conversationalVoiceMode]);

  // Persist speaker auto-readout toggle
  useEffect(() => {
    try {
      localStorage.setItem('bg_manager_ai_autospeak', String(autoSpeakEnabled));
    } catch {}
  }, [autoSpeakEnabled]);

  // Multimodal image state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, loading]);

  // Stop active speech playback
  const stopSpeaking = () => {
    if (speechResumeIntervalRef.current) {
      clearInterval(speechResumeIntervalRef.current);
      speechResumeIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    activeUtteranceRef.current = null;
    setSpeakingMessageId(null);
  };

  // Clean raw markdown and formatting into natural, spoken conversational cadence
  const getConversationalSummaryForSpeech = (rawText: string): string => {
    if (!rawText) return '';
    let clean = rawText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/Rs\.\s*([\d,]+)/gi, '$1 rupees')
      .replace(/\bRs\.?\s*/gi, 'rupees ')
      .replace(/\b(\d+)\s*m\b/g, '$1 minutes')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[•\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Take the first 2 concise sentences (up to ~240 characters) for snappy voice chat readout
    const sentenceMatches = clean.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (sentenceMatches && sentenceMatches.length > 0) {
      clean = sentenceMatches.slice(0, 2).join(' ').trim();
    } else if (clean.length > 240) {
      clean = clean.slice(0, 240).trim() + '.';
    }
    return clean;
  };

  // Speak AI text output through speaker with bulletproof Chromium iframe handling
  const speakAiResponse = (text: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceError('Speech synthesis is not available in this browser.');
      return;
    }

    try {
      if (speechResumeIntervalRef.current) {
        clearInterval(speechResumeIntervalRef.current);
        speechResumeIntervalRef.current = null;
      }

      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const spokenText = getConversationalSummaryForSpeech(text);
      if (!spokenText) return;

      const utterance = new SpeechSynthesisUtterance(spokenText);
      activeUtteranceRef.current = utterance; // Prevent garbage collection in Chrome
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      // Select voice from cached list or live list
      const voices = (availableVoicesRef.current.length > 0
        ? availableVoicesRef.current
        : window.speechSynthesis.getVoices()) || [];

      let chosenVoice: SpeechSynthesisVoice | null = null;
      let chosenLang = 'en-US';

      if (voices.length > 0) {
        if (voiceLang === 'ur-PK') {
          const urVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ur'));
          if (urVoice) {
            chosenVoice = urVoice;
            chosenLang = 'ur-PK';
          }
        }

        if (!chosenVoice) {
          chosenVoice =
            voices.find(
              (v) =>
                v.lang.toLowerCase().startsWith('en') &&
                (v.name.includes('Google') ||
                  v.name.includes('Natural') ||
                  v.name.includes('Daniel') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Alex') ||
                  v.name.includes('Male') ||
                  v.name.includes('Guy'))
            ) ||
            voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
            voices[0];
          chosenLang = chosenVoice?.lang || 'en-US';
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }
      }

      utterance.lang = chosenLang;
      if (msgId) setSpeakingMessageId(msgId);

      // Workaround for Chrome bug where speech can hang after 14 seconds
      speechResumeIntervalRef.current = setInterval(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        }
      }, 3000);

      utterance.onend = () => {
        if (speechResumeIntervalRef.current) {
          clearInterval(speechResumeIntervalRef.current);
          speechResumeIntervalRef.current = null;
        }
        setSpeakingMessageId(null);
        activeUtteranceRef.current = null;

        // In continuous hands-free voice dialogue mode, seamlessly resume listening after AI speaks
        if (conversationalVoiceModeRef.current) {
          setTimeout(() => {
            if (conversationalVoiceModeRef.current && !activeUtteranceRef.current) {
              startListening();
            }
          }, 500);
        }
      };

      utterance.onerror = (err) => {
        console.warn('Speech playback notice:', err);
        if (speechResumeIntervalRef.current) {
          clearInterval(speechResumeIntervalRef.current);
          speechResumeIntervalRef.current = null;
        }
        setSpeakingMessageId(null);
        activeUtteranceRef.current = null;
      };

      window.speechSynthesis.speak(utterance);
      // Extra resume safeguard for iframe autoplay policies
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn('Speech synthesis call failed:', e);
    }
  };

  // Speech Recognition (Listening to voice via microphone)
  // CRITICAL: Microphone is ONLY requested when user explicitly clicks the microphone button!
  const stopListening = () => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.stop();
      } catch {}
    }
    setIsListening(false);
    const transcriptToSend = (lastTranscriptRef.current || input).trim();
    if (transcriptToSend) {
      lastTranscriptRef.current = '';
      setInput('');
      isVoiceInputRef.current = true;
      handleSend(transcriptToSend);
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    setVoiceError(null);
    primeSpeechEngine();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Stop speaking so the AI doesn't talk over the user's voice input
    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang; // 'en-US' (understands English & Roman Urdu) or 'ur-PK'
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        lastTranscriptRef.current = '';
        playAudioFeedback('listen');
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }

        const transcript = fullTranscript.trim();
        if (transcript) {
          setInput(transcript);
          lastTranscriptRef.current = transcript;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow microphone access in your browser bar.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech was detected. Tap the mic and speak clearly.');
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice recognition: ${event.error}. You can also type directly.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        const transcriptToSend = (lastTranscriptRef.current || input).trim();
        if (transcriptToSend) {
          lastTranscriptRef.current = '';
          setInput('');
          isVoiceInputRef.current = true;
          handleSend(transcriptToSend);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceError('Could not start speech recognition. Tap the mic button to retry.');
    }
  };

  const toggleListening = () => {
    primeSpeechEngine();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Stop audio and recognition if modal closes or unmounts
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        setPendingImages((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result as string;
            setPendingImages((prev) => [
              ...prev,
              {
                name: `Pasted Image ${Date.now()}`,
                type: file.type,
                dataUrl,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleVoice = (msg: ChatMessage) => {
    if (speakingMessageId === msg.id) {
      stopSpeaking();
      return;
    }
    speakAiResponse(msg.text, msg.id);
  };

  const handleExecuteAction = async (action: string, payload: any) => {
    try {
      const token = adminToken || localStorage.getItem('bg_admin_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/ai-assistant/apply-action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(data.message || 'Action executed successfully!');
        if (onRefreshData) onRefreshData();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to execute AI action:', err);
      setActionFeedback('Failed to execute action. Please check server connection.');
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Structured topic prompts
  const topicPrompts: Record<TopicCategory, { label: string; prompt: string; icon: any }[]> = {
    sales: [
      {
        label: "Today's Performance Audit",
        prompt: "Analyze today's revenue, order volume, and ticket sizes at North Nazimabad Block-I. What patterns stand out?",
        icon: TrendingUp,
      },
      {
        label: "EasyPaisa vs COD Breakdown",
        prompt: "Review our payment split between EasyPaisa and Cash on Delivery. How can we incentivize more prepaid digital orders?",
        icon: Zap,
      },
      {
        label: "Late-Night Basket Upsell",
        prompt: "Propose 2 high-margin impulse addons to push our average ticket size above Rs. 1,500 tonight.",
        icon: Sparkles,
      },
    ],
    kitchen: [
      {
        label: "Line Turnaround Inspection",
        prompt: "Kitchen currently has active tickets grilling. What exact steps will shave 3-4 minutes off burger assembly without compromising smash crust?",
        icon: Flame,
      },
      {
        label: "Chrome Griddle Temperature",
        prompt: "Detail optimal temperature zones (400-425°F) for our smash patties, brioche butter toasting, and cheese melt speed.",
        icon: ChefHat,
      },
      {
        label: "Stock & Prep Checklist",
        prompt: "Audit our current out-of-stock items and generate a quick prep restock priority list for the next shift.",
        icon: Sliders,
      },
    ],
    combos: [
      {
        label: "Design High-Margin Duo Bundle",
        prompt: "Design a high-margin combo featuring 2 smash burgers, loaded crinkle fries, and drinks priced around Rs. 1,750 for North Nazimabad foodies.",
        icon: Flame,
      },
      {
        label: "Biscoff Shake Impulse Pairing",
        prompt: "Create an impulse dessert upsell strategy for our Gourmet Lotus Biscoff Shake that kitchen staff can execute effortlessly.",
        icon: Sparkles,
      },
      {
        label: "Nashville Tenders Box Deal",
        prompt: "Formulate a crispy tenders sharing box that appeals to late-night groups and families in Karachi North.",
        icon: ChefHat,
      },
    ],
    visuals: [
      {
        label: "📸 Double Smash Burger Photo",
        prompt: "Generate a realistic food photograph of our signature double smash burger with melting cheddar, crispy lacy crust, caramelized onions, and golden brioche bun.",
        icon: ImageIcon,
      },
      {
        label: "🍗 Crispy Nashville Tenders Photo",
        prompt: "Generate a realistic food photograph of crispy Nashville hot chicken tenders with cayenne dust, crinkle fries, and smokey ranch dip.",
        icon: Flame,
      },
      {
        label: "🍟 Loaded Cheesy Fries Photo",
        prompt: "Generate a food photograph of loaded crinkle cut cheddar fries smothered in molten cheese sauce, grilled beef, and pickled jalapenos.",
        icon: Sparkles,
      },
      {
        label: "🥤 Lotus Biscoff Shake Photo",
        prompt: "Generate a food photograph of our Gourmet Lotus Biscoff Shake topped with rich dairy whipped cream and Belgian biscuit crumbs.",
        icon: Sparkles,
      },
      {
        label: "🎁 Combo Feast Box Photo",
        prompt: "Generate a photograph of our sharing combo feast box with 2 double smash burgers, loaded fries, tenders, and chilled drinks.",
        icon: ChefHat,
      },
      {
        label: "🖼️ 20% Off Promo Poster",
        prompt: "Create a promotional marketing banner graphic for 20% off smash burgers tonight with code BITEGO.",
        icon: Megaphone,
      },
    ],
    support: [
      {
        label: "Draft WhatsApp Apology + Voucher",
        prompt: "A customer reported missing crinkle fries on their delivery in Block H. Draft a humble, sincere Karachi apology note with a Rs. 300 voucher code.",
        icon: MessageSquare,
      },
      {
        label: "Cold Burger Resolution Script",
        prompt: "Customer complaint: burger arrived lukewarm due to a busy street. Provide a respectful resolution script and immediate kitchen compensation plan.",
        icon: CheckCircle2,
      },
      {
        label: "5-Star Review Request Note",
        prompt: "Draft a friendly, short WhatsApp message asking happy customers from North Nazimabad to leave a 5-star Google/web review.",
        icon: Share2,
      },
    ],
    marketing: [
      {
        label: "Top Website Announcement Bar",
        prompt: "Write 3 punchy, high-converting copy variants for our top website announcement bar with exact emoji and promo codes.",
        icon: Megaphone,
      },
      {
        label: "Instagram Story Deal Script",
        prompt: "Draft an engaging Instagram story promo script for our Karachi audience advertising late-night smash burger delivery until 3 AM.",
        icon: Sparkles,
      },
      {
        label: "Rain & Monsoon Special Copy",
        prompt: "Create monsoon rain comfort food copy for our website ticker promoting piping-hot double smash burgers delivered to doorsteps.",
        icon: Zap,
      },
    ],
    dispatch: [
      {
        label: "Fleet Turnaround & Block Batching",
        prompt: "How can dispatch pair orders across North Nazimabad blocks and Buffer Zone to cut rider transit times?",
        icon: Bike,
      },
      {
        label: "Thermal Packaging & Heat Retention",
        prompt: "Review best packaging practices for smash burgers and crinkle fries to prevent sogginess during 30-minute delivery rides",
        icon: Clock,
      },
      {
        label: "Weather & Monsoon Rush Dispatch",
        prompt: "What delivery protocols should we activate if evening rain starts in North Nazimabad and Sakhi Hassan?",
        icon: Zap,
      },
    ],
  };

  const handleSend = async (promptToSend?: string) => {
    primeSpeechEngine();
    const text = (promptToSend || input).trim();
    if ((!text && pendingImages.length === 0) || loading) return;

    const userImages = pendingImages.map((img) => img.dataUrl);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text || (pendingImages.length > 0 ? `Shared ${pendingImages.length} photo(s) for kitchen review.` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      images: userImages.length > 0 ? userImages : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    const imagesPayload = pendingImages.map((img) => ({
      mimeType: img.type,
      data: img.dataUrl,
    }));

    if (!promptToSend) setInput('');
    setPendingImages([]);
    setLoading(true);

    try {
      const token = adminToken || localStorage.getItem('bg_admin_token') || '';
      const historyPayload = messages.slice(-20).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const isVisualIntent = activeCategory === 'visuals' || /photo|image|picture|photograph|pic|banner|poster|dish|render/i.test(text || '');

      let response = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: text || 'Please inspect and analyze this attached photo.',
          history: historyPayload,
          images: imagesPayload,
          generateImage: isVisualIntent,
        }),
      });

      // Self-healing fallback if 401
      if (response.status === 401) {
        localStorage.removeItem('bg_admin_token');
        response = await fetch('/api/admin/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text || 'Please inspect and analyze this attached photo.',
            history: historyPayload,
            images: imagesPayload,
            generateImage: isVisualIntent,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      let actionType: ChatMessage['actionType'] = undefined;
      let actionPayload: any = undefined;

      const replyText = data.reply || 'Operations check completed.';
      if (replyText.includes('Assalam-o-Alaikum') || replyText.includes('voucher') || replyText.includes('apologize')) {
        actionType = 'whatsapp';
        actionPayload = { text: replyText };
      } else if (replyText.includes('Banner') || replyText.includes('headline') || replyText.includes('Top Announcement')) {
        actionType = 'banner';
        const match = replyText.match(/"([^"]+)"/) || replyText.match(/“([^”]+)”/);
        actionPayload = { text: match ? match[1] : '🔥 Dinner Rush: 20% Off Smash Burgers Tonight!' };
      } else if (replyText.includes('prep time') && (replyText.includes('25') || replyText.includes('rush'))) {
        actionType = 'prep_time';
        actionPayload = { minutes: 25 };
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metrics: data.metrics,
        actionType,
        actionPayload,
        generatedImageUrl: data.generatedImageUrl || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Talk through speaker: speak whenever autoSpeak is on, voice mode was used, or microphone input was received
      const shouldSpeak = isVoiceInputRef.current || autoSpeakEnabled || conversationalVoiceModeRef.current || !!promptToSend;
      isVoiceInputRef.current = false;
      if (shouldSpeak) {
        playAudioFeedback('reply');
        speakAiResponse(replyText, aiMsg.id);
      }
    } catch (err: any) {
      console.error('AI assistant fetch error:', err);
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `📊 **Live Kitchen Status (North Nazimabad Block-I)**
• **Status:** Grill is fired up & accepting orders.
• **Today's Revenue:** Rs. ${todayRevenue.toLocaleString()} across ${deliveredOrders.length} delivered orders.
• **Kitchen Pipeline:** ${activeOrders.length} active tickets on the line.
• **Estimated Prep Time:** ${prepMinutes} minutes.

I evaluated your request. Let's keep orders moving fast—what should we tackle next on the shift?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      const shouldSpeak = isVoiceInputRef.current || autoSpeakEnabled || conversationalVoiceModeRef.current || !!promptToSend;
      isVoiceInputRef.current = false;
      if (shouldSpeak) {
        playAudioFeedback('reply');
        speakAiResponse(
          'Live operational status retrieved. Grill is fired up and accepting orders.',
          fallbackMsg.id
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportChat = () => {
    const chatContent = messages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.sender === 'user' ? 'Manager' : 'Hassan (Co-Founder)'}:\n${m.text}\n`
      )
      .join('\n----------------------------------------\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BiteGo_OpsBriefing_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col h-[92vh] max-h-[860px] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-amber-400 font-bold">
                  <ChefHat className="w-6 h-6" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-neutral-950 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-black text-white flex items-center gap-1.5">
                  <span>Hassan</span>
                  <span className="text-amber-400 text-xs font-mono font-normal">· Co-Founder Copilot</span>
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Operations Partner
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded">
                  Multimodal &amp; Visuals Active
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/20">
                  🧠 Memory Saved ({messages.length})
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                North Nazimabad Block-I Kitchen · Real-time revenue, tickets &amp; image generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto Voice Speaker Output Toggle */}
            <button
              type="button"
              onClick={() => {
                if (speakingMessageId) {
                  stopSpeaking();
                }
                setAutoSpeakEnabled((prev) => !prev);
              }}
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs border ${
                autoSpeakEnabled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white border-neutral-800 hover:bg-neutral-850'
              }`}
              title={
                autoSpeakEnabled
                  ? 'Speaker voice active (AI speaks responses). Click to mute.'
                  : 'Speaker muted. Click to have AI speak out responses.'
              }
            >
              {autoSpeakEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline text-[11px] font-semibold">
                {autoSpeakEnabled ? 'Speaker On' : 'Speaker Off'}
              </span>
            </button>

            {/* Test Voice Button */}
            <button
              type="button"
              onClick={() => {
                primeSpeechEngine();
                speakAiResponse(
                  'Assalam-o-Alaikum! Sound check clear. Hassan here, speaker is loud and active!'
                );
              }}
              className="px-2.5 py-1.5 text-neutral-300 hover:text-amber-400 rounded-xl bg-neutral-950 hover:bg-neutral-850 transition-colors flex items-center gap-1.5 text-xs border border-neutral-800 cursor-pointer"
              title="Test Hassan's speaker voice output"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px] font-bold">Test Voice</span>
            </button>

            <button
              type="button"
              onClick={handleClearChat}
              className="px-2.5 py-1.5 text-neutral-400 hover:text-amber-400 rounded-xl hover:bg-neutral-850 transition-colors flex items-center gap-1 text-xs border border-neutral-800 hover:border-amber-500/30"
              title="Reset conversation & start a fresh chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-semibold">New Chat</span>
            </button>
            <button
              onClick={handleExportChat}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-850 transition-colors"
              title="Export Briefing Log"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-850 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Audio Speaking Status Banner */}
        {speakingMessageId && (
          <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-neutral-900 border-b border-amber-500/40 flex items-center justify-between animate-in fade-in text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-bold text-amber-300">Hassan (Voice Chat):</span>
              <span className="italic text-neutral-300 truncate max-w-[220px] sm:max-w-md">Speaking aloud through speaker...</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopSpeaking}
                className="text-[11px] font-bold text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer"
              >
                Mute
              </button>
            </div>
          </div>
        )}

        {/* Live Restaurant Operations Metric HUD Strip */}
        <div className="px-4 py-2 bg-neutral-950/80 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {/* Store Status Pill */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
              <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-neutral-300">Store:</span>
              <strong className={isStoreOpen ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {isStoreOpen ? 'OPEN' : 'CLOSED'}
              </strong>
            </div>

            {/* Today Revenue */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
              <span className="text-neutral-400">Sales:</span>
              <strong className="text-amber-400 font-bold">
                Rs. {todayRevenue.toLocaleString()}
              </strong>
              <span className="text-neutral-500 text-[10px]">({deliveredOrders.length} dlvd)</span>
            </div>

            {/* Active Tickets */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
              <Flame className="w-3 h-3 text-red-400" />
              <span className="text-neutral-400">Kitchen:</span>
              <strong className="text-red-400 font-bold">{activeOrders.length} Cooking</strong>
            </div>

            {/* Prep Time */}
            <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
              <Clock className="w-3 h-3 text-purple-400" />
              <span className="text-neutral-400">Prep:</span>
              <strong className="text-purple-300 font-bold">{prepMinutes}m</strong>
            </div>

            {/* Stock Out Alert */}
            {outOfStockItems.length > 0 && (
              <div className="flex items-center gap-1.5 bg-red-950/50 px-2.5 py-1 rounded-lg border border-red-500/30 text-red-300">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>{outOfStockItems.length} Out of Stock</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Karachi Central Line</span>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="px-5 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">{actionFeedback}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Topic Mode Navigation Bar */}
        <div className="px-4 py-2 bg-neutral-950/60 border-b border-neutral-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
              { id: 'kitchen', label: 'Kitchen & Pace', icon: ChefHat },
              { id: 'combos', label: 'Combos & Margins', icon: Flame },
              { id: 'visuals', label: '🎨 Image Generator', icon: ImageIcon },
              { id: 'support', label: 'Customer Care', icon: MessageSquare },
              { id: 'marketing', label: 'Marketing & Banners', icon: Megaphone },
              { id: 'dispatch', label: 'Dispatch Fleet', icon: Bike },
            ] as const
          ).map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                    : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-750'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Prompts under selected category */}
        <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Quick Prompts:
          </span>
          {topicPrompts[activeCategory].map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(qp.prompt)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-amber-500/50 text-xs font-medium text-neutral-200 hover:text-amber-300 flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-amber-400" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gradient-to-b from-neutral-900 to-neutral-950">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 shadow-md relative group ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-neutral-950 font-medium'
                    : 'bg-neutral-850 border border-neutral-800 text-neutral-200'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-4 mb-2 text-[11px] opacity-80">
                  <span className="font-bold">
                    {msg.sender === 'user' ? 'Manager' : 'Hassan (Ops Co-Founder)'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Attached User Photos */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {msg.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setPreviewImage(imgUrl)}
                        className="relative rounded-xl overflow-hidden border border-black/20 max-w-[200px] max-h-[140px] cursor-pointer group/img shadow"
                      >
                        <img
                          src={imgUrl}
                          alt={`Attachment ${imgIdx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Generated Image Card */}
                {msg.generatedImageUrl && (
                  <div className="mb-3.5 p-2 bg-neutral-950 rounded-2xl border border-amber-500/30 overflow-hidden shadow-xl space-y-2">
                    <div
                      onClick={() => setPreviewImage(msg.generatedImageUrl!)}
                      className="relative rounded-xl overflow-hidden cursor-zoom-in group/aiimg"
                    >
                      <img
                        src={msg.generatedImageUrl}
                        alt="AI Generated Promotional Graphic"
                        className="w-full max-h-[340px] object-contain rounded-xl transition-transform group-hover/aiimg:scale-101"
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Generated Graphic</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={msg.generatedImageUrl}
                          download={`BiteGo_Promo_${Date.now()}.svg`}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Image</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.generatedImageUrl!);
                            setActionFeedback('Image data URL copied to clipboard!');
                            setTimeout(() => setActionFeedback(null), 3000);
                          }}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const cur = StorageService.getSettings();
                            const updated: StoreSettings = {
                              ...cur,
                              customerWidgets: {
                                ...(cur.customerWidgets as any),
                                chefSignatureImageUrl: msg.generatedImageUrl,
                              },
                            };
                            await StorageService.saveSettings(updated);
                            setActionFeedback("Updated Chef's Signature Showcase photo on storefront!");
                            if (onRefreshData) onRefreshData();
                            setTimeout(() => setActionFeedback(null), 3000);
                          }}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <span>Set as Chef's Signature</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleExecuteAction('update_banner', {
                              text: '🔥 Flash Special: Signature Smash Burgers & Loaded Combos Fresh on the Line!',
                            })
                          }
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow cursor-pointer"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span>Apply to Website Banner</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Body Text */}
                <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-line space-y-1 font-normal">
                  {msg.text}
                </div>

                {/* AI Action Toolbars */}
                {msg.sender === 'ai' && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-neutral-400">
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1 hover:text-white rounded transition-colors flex items-center gap-1 text-[11px]"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          primeSpeechEngine();
                          handleToggleVoice(msg);
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                          speakingMessageId === msg.id
                            ? 'bg-amber-500 text-neutral-950 font-bold shadow animate-pulse'
                            : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-amber-300 border border-neutral-700 hover:border-amber-500/50'
                        }`}
                        title="Listen to Hassan's voice readout"
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Speaking</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>🔊 Listen to Hassan</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* One-Click Action: Copy for WhatsApp */}
                    {msg.actionType === 'whatsapp' && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          setActionFeedback('Apology response copied for WhatsApp!');
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Copy for WhatsApp</span>
                      </button>
                    )}

                    {/* One-Click Action: Apply to Announcement Banner */}
                    {msg.actionType === 'banner' && msg.actionPayload?.text && (
                      <button
                        onClick={() =>
                          handleExecuteAction('update_banner', { text: msg.actionPayload.text })
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Apply to Website Banner</span>
                      </button>
                    )}

                    {/* One-Click Action: Set Kitchen Rush Prep Time */}
                    {msg.actionType === 'prep_time' && (
                      <button
                        onClick={() => handleExecuteAction('set_prep_time', { minutes: 25 })}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Set Prep Time: 25 Mins</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-neutral-800 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-sm">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5 animate-bounce" />
              </div>
              <div className="bg-neutral-850 border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-neutral-300 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-medium">Hassan is analyzing operations &amp; composing reply...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending Image Attachments Carousel Strip */}
        {pendingImages.length > 0 && (
          <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-800 flex items-center gap-3 overflow-x-auto">
            <span className="text-[11px] font-bold text-amber-400 shrink-0">Attached Photos:</span>
            {pendingImages.map((img, i) => (
              <div key={i} className="relative rounded-xl border border-neutral-700 overflow-hidden shrink-0 group">
                <img src={img.dataUrl} alt="preview" className="w-12 h-12 object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePendingImage(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 rounded-full text-white hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice Error Notice Banner (e.g. Permission blocked) */}
        {voiceError && (
          <div className="px-4 py-2 bg-amber-500/15 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-amber-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Voice Microphone Listening Indicator Banner */}
        {isListening && (
          <div className="px-4 py-2.5 bg-red-950/80 border-t border-red-500/40 flex flex-wrap items-center justify-between gap-2 animate-pulse">
            <div className="flex items-center gap-2.5 text-xs text-red-300 font-semibold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <Mic className="w-4 h-4 text-red-400 animate-bounce" />
              <span>
                Listening to your voice... Speak now in{' '}
                <strong className="text-white">
                  {voiceLang === 'ur-PK' ? 'اردو (Urdu)' : 'English or Roman Urdu'}
                </strong>
                !
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Selector for speech recognition */}
              <div className="flex items-center bg-neutral-900 border border-neutral-750 rounded-lg p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceLang('en-US');
                    if (recognitionRef.current) recognitionRef.current.lang = 'en-US';
                  }}
                  className={`px-2 py-0.5 rounded ${
                    voiceLang === 'en-US' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                  }`}
                >
                  EN / Roman Urdu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceLang('ur-PK');
                    if (recognitionRef.current) recognitionRef.current.lang = 'ur-PK';
                  }}
                  className={`px-2 py-0.5 rounded ${
                    voiceLang === 'ur-PK' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
                  }`}
                >
                  اردو Urdu
                </button>
              </div>

              <button
                type="button"
                onClick={stopListening}
                className="text-xs font-bold text-red-300 hover:text-white px-2.5 py-1 rounded-lg bg-red-500/25 border border-red-500/40 cursor-pointer"
              >
                Done Speaking
              </button>
            </div>
          </div>
        )}

        {/* Quick Conversational & Urdu Voice Prompt Suggestions */}
        <div className="px-4 py-1.5 bg-neutral-950/90 border-t border-neutral-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <span className="text-amber-400 text-[10px] uppercase font-bold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Try Saying:</span>
          </span>
          {[
            { label: '💡 Proactive Menu Recommendations', query: 'Hassan bhai, North Nazimabad ke liye koi killer high-margin menu recommendation ya combo idea do' },
            { label: '🍔 High-Margin Smash & Shake Combo', query: 'Double smash burger aur Lotus Biscoff shake ka high-margin duo feast combo plan banao' },
            { label: '📋 Zinger Recipe Breakdown', query: 'Zinger burger ki recipe breakdown aur ingredients stock check batao' },
            { label: '💰 Sales & Order Pipeline', query: 'Bhai aaj kitne orders aaye hain aur sales audit kya hai?' },
            { label: '🔥 Kitchen Rush Speed Tips', query: 'Kitchen rush ke waqt burger assemble speed barhane ke tareeqay batao' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSend(chip.query)}
              className="px-2.5 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors shrink-0 text-[10.5px] cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              stopListening();
              handleSend();
            }}
            onPaste={handlePaste}
            className="flex items-center gap-2"
          >
            {/* Hidden file input for images */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-2xl transition-colors cursor-pointer shrink-0"
              title="Attach Photo (Receipt, Burger, Grill, Packaging)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Continuous Conversational Voice Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !conversationalVoiceMode;
                setConversationalVoiceMode(next);
                if (next) {
                  setAutoSpeakEnabled(true);
                  startListening();
                } else {
                  stopListening();
                  stopSpeaking();
                }
              }}
              className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold ${
                conversationalVoiceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
              }`}
              title="Toggle Hands-Free Continuous Voice Conversation with Hassan"
            >
              <Volume2 className={`w-4 h-4 ${conversationalVoiceMode ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline text-[11px]">
                {conversationalVoiceMode ? 'Voice Dialogue ON' : 'Hands-Free Voice'}
              </span>
            </button>

            {/* Microphone Voice Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-2xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                isListening
                  ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/40 scale-105 animate-pulse'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border-neutral-800'
              }`}
              title={
                isListening
                  ? 'Stop voice listening'
                  : `Speak to Hassan in ${voiceLang === 'ur-PK' ? 'Urdu' : 'English / Roman Urdu'}`
              }
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening to your voice... Speak now...'
                  : "Ask Hassan anything in English or Roman Urdu, tap mic, or say 'Generate image'..."
              }
              disabled={loading}
              className={`flex-1 bg-neutral-900 border focus:border-amber-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                isListening ? 'border-red-500/50 shadow-inner' : 'border-neutral-800'
              }`}
            />

            <button
              type="submit"
              disabled={(!input.trim() && pendingImages.length === 0) || loading}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shrink-0 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-2 px-1">
            <span>Executive Operations Copilot · North Nazimabad Block-I</span>
            <span>🎙️ Voice In · 🔊 Speaker Out · 📷 Visual Recognition</span>
          </div>
        </div>
      </div>

      {/* Enlarged Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Enlarged view"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-neutral-800"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-neutral-900 text-white rounded-full border border-neutral-700 hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
