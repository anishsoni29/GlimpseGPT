"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  FileAudio, 
  Play, 
  Pause, 
  Download, 
  Activity,
  FileText,
  Languages,
  Forward,
  Rewind,
  Volume,
  VolumeX,
  SkipForward,
  SkipBack,
  Expand,
  ExternalLink,
  AlertCircle,
  Headphones,
  X as Close,
  Speaker,
  Info,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProcessingLogs } from "@/components/processing-logs";
import { getSummary } from "../../backend/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// Type definition for the summary data
interface SummaryData {
  original_text?: string;
  summary_en?: string;
  summary_translated?: string;
  language?: string;
  sentiment?: {
    label: string;
    score: number;
  };
  thumbnail_url?: string;
  title?: string;
  transcript_segments?: {
    text: string;
    start: number;
    end: number;
  }[];
}

// Props definition for SummaryDisplay
interface SummaryDisplayProps {
  logMessages?: string[];
}

// Add a utility to check if speech synthesis is available
const isSpeechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function SummaryDisplay({ logMessages = [] }: SummaryDisplayProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscriptPlaying, setIsTranscriptPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [copied, setCopied] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechSynthesisRef = useRef<typeof window.speechSynthesis | null>(null);

  // Clear interval on unmount or when speech ends
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Initialize speech synthesis if available
  useEffect(() => {
    if (isSpeechSynthesisSupported) {
      speechSynthesisRef.current = window.speechSynthesis;
      
      // Chrome has a bug where speechSynthesis gets paused when not visible
      // Add a periodic resume to keep it active
      const resumeInterval = setInterval(() => {
        if (speechSynthesisRef.current && speechSynthesisRef.current.paused && (isPlaying || isTranscriptPlaying)) {
          speechSynthesisRef.current.resume();
        }
      }, 1000);
      
      // Ensure voices are loaded
      const voicesChangedHandler = () => {
        const voices = speechSynthesisRef.current?.getVoices() || [];
        console.log(`Loaded ${voices.length} voices`);
        setVoicesLoaded(voices.length > 0);
      };
      
      speechSynthesisRef.current.onvoiceschanged = voicesChangedHandler;
      
      // Try to get voices immediately (might already be loaded in some browsers)
      const voices = speechSynthesisRef.current.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
      
      return () => {
        // Cleanup on unmount
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.cancel();
        }
        clearProgressInterval();
        clearInterval(resumeInterval);
      };
    }
  }, [clearProgressInterval, isPlaying, isTranscriptPlaying]);
  
  // Function for copying text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    if (!text) {
      toast({ title: "No text available to copy", variant: "destructive" });
      return;
    }
    
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied to clipboard" });
      },
      () => toast({ title: "Failed to copy", variant: "destructive" })
    );
  }, [toast]);

  // Function to handle text-to-speech for summary
  const handlePlayPause = useCallback(() => {
    if (!summaryData?.summary_translated) {
      toast({ title: "No summary available", variant: "destructive" });
      return;
    }
    
    if (!isSpeechSynthesisSupported || !speechSynthesisRef.current) {
      setAudioError("Text-to-speech is not supported in your browser");
      setShowAudioPlayer(true);
      toast({ 
        title: "Text-to-speech not supported", 
        description: "Your browser doesn't support text-to-speech",
        variant: "destructive" 
      });
      return;
    }
    
    // Reset error state
    setAudioError(null);
    
    if (isPlaying) {
      speechSynthesisRef.current.cancel();
      setIsPlaying(false);
      clearProgressInterval();
      return;
    }
    
      // Show audio player immediately
      setShowAudioPlayer(true);
      
    try {
      // Cancel any existing speech
      speechSynthesisRef.current.cancel();
      clearProgressInterval();
      
      if (isTranscriptPlaying) {
        setIsTranscriptPlaying(false);
      }
      
      const text = summaryData.summary_translated;
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set playback rate
      utterance.rate = playbackRate;
      utterance.volume = isMuted ? 0 : volume;
      
      // Set language if available
      if (summaryData.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN', 'Tamil': 'ta-IN', 'Marathi': 'mr-IN', 'English': 'en-US'
        };
        utterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      // Get available voices and try to set a good one
      const voices = speechSynthesisRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang === utterance.lang && !voice.localService
      ) || voices.find(voice => 
        voice.lang === utterance.lang
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Setup event handlers
      utterance.onstart = () => {
      setIsPlaying(true);
        
        // Estimate duration (approx 5 characters per second at normal rate)
        const textLength = text.length;
        const estimatedDuration = Math.max(5, textLength / (5 * playbackRate));
        setDuration(estimatedDuration);
        
        // Update progress
        let elapsed = 0;
        progressIntervalRef.current = setInterval(() => {
          elapsed += 0.1;
          if (elapsed <= estimatedDuration) {
            setCurrentTime(elapsed);
          } else {
            clearProgressInterval();
          }
        }, 100);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        clearProgressInterval();
        setCurrentTime(0);
      };
      
      utterance.onerror = (event) => {
        setIsPlaying(false);
        clearProgressInterval();
        const errorMessage = event.error || "Unknown error";
        setAudioError(`Text-to-speech error: ${errorMessage}`);
        toast({ 
          title: "Speech playback failed", 
          description: errorMessage,
          variant: "destructive" 
        });
      };
      
      // Store reference to current utterance
      setCurrentUtterance(utterance);
      
      // Start speaking
      speechSynthesisRef.current.speak(utterance);
      
      // Chrome bug fix: if speechSynthesis is paused, resume it
      if (speechSynthesisRef.current.paused) {
        speechSynthesisRef.current.resume();
      }
    } catch (error) {
      console.error("Speech synthesis error:", error);
      setAudioError(`Failed to start speech: ${error instanceof Error ? error.message : String(error)}`);
      toast({ 
        title: "Speech playback failed", 
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive" 
      });
    }
  }, [summaryData, isPlaying, isTranscriptPlaying, playbackRate, volume, isMuted, toast, clearProgressInterval]);

  // Function to play/pause transcript audio
  const toggleTranscriptAudio = useCallback(() => {
    if (!summaryData?.original_text) {
      toast({ title: "No transcript available", variant: "destructive" });
      return;
    }
    
    if (!isSpeechSynthesisSupported || !speechSynthesisRef.current) {
      setAudioError("Text-to-speech is not supported in your browser");
      setShowAudioPlayer(true);
      toast({ 
        title: "Text-to-speech not supported", 
        description: "Your browser doesn't support text-to-speech",
        variant: "destructive" 
      });
      return;
    }
    
    // Reset error state
    setAudioError(null);
    
    if (isTranscriptPlaying) {
      speechSynthesisRef.current.cancel();
      setIsTranscriptPlaying(false);
      clearProgressInterval();
      return;
    }
    
      // Show audio player immediately
      setShowAudioPlayer(true);
      
    try {
      // Cancel any existing speech
      speechSynthesisRef.current.cancel();
      clearProgressInterval();
      
      if (isPlaying) {
        setIsPlaying(false);
      }
      
      const text = summaryData.original_text;
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set playback rate
      utterance.rate = playbackRate;
      utterance.volume = isMuted ? 0 : volume;
      
      // Set language if available
      if (summaryData.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN', 'Tamil': 'ta-IN', 'Marathi': 'mr-IN', 'English': 'en-US'
        };
        utterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      // Get available voices and try to set a good one
      const voices = speechSynthesisRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang === utterance.lang && !voice.localService
      ) || voices.find(voice => 
        voice.lang === utterance.lang
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Setup event handlers
      utterance.onstart = () => {
        setIsTranscriptPlaying(true);
        
        // Estimate duration (approx 5 characters per second at normal rate)
        const textLength = text.length;
        const estimatedDuration = Math.max(5, textLength / (5 * playbackRate));
        setDuration(estimatedDuration);
        
        // Update progress
        let elapsed = 0;
        progressIntervalRef.current = setInterval(() => {
          elapsed += 0.1;
          if (elapsed <= estimatedDuration) {
            setCurrentTime(elapsed);
          } else {
            clearProgressInterval();
          }
        }, 100);
      };
      
      utterance.onend = () => {
        setIsTranscriptPlaying(false);
        clearProgressInterval();
        setCurrentTime(0);
      };
      
      utterance.onerror = (event) => {
        setIsTranscriptPlaying(false);
        clearProgressInterval();
        const errorMessage = event.error || "Unknown error";
        setAudioError(`Text-to-speech error: ${errorMessage}`);
        toast({ 
          title: "Speech playback failed", 
          description: errorMessage,
          variant: "destructive" 
        });
      };
      
      // Store reference to current utterance
      setCurrentUtterance(utterance);
      
      // Start speaking
      speechSynthesisRef.current.speak(utterance);
      
      // Chrome bug fix: if speechSynthesis is paused, resume it
      if (speechSynthesisRef.current.paused) {
        speechSynthesisRef.current.resume();
      }
    } catch (error) {
      console.error("Speech synthesis error:", error);
      setAudioError(`Failed to start speech: ${error instanceof Error ? error.message : String(error)}`);
      toast({ 
        title: "Speech playback failed", 
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive" 
      });
    }
  }, [summaryData, isPlaying, isTranscriptPlaying, playbackRate, volume, isMuted, toast, clearProgressInterval]);

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((newRate: number) => {
    setPlaybackRate(newRate);
    
    if (!isSpeechSynthesisSupported || !speechSynthesisRef.current) return;
    
    // Update rate for current utterance if one is playing
    if (currentUtterance && (isPlaying || isTranscriptPlaying)) {
      try {
        // Need to restart with new rate
        speechSynthesisRef.current.cancel();
        clearProgressInterval();
      
        // Recreate utterance with new rate
        if (isPlaying) {
          const text = summaryData?.summary_translated || "";
          const newUtterance = new SpeechSynthesisUtterance(text);
      newUtterance.rate = newRate;
          newUtterance.volume = isMuted ? 0 : volume;
      
          // Set up event handlers (simplified as this is just for rate change)
          newUtterance.onstart = () => setIsPlaying(true);
          newUtterance.onend = () => {
            setIsPlaying(false);
            clearProgressInterval();
          };
          
          setCurrentUtterance(newUtterance);
          speechSynthesisRef.current.speak(newUtterance);
          
          // Chrome bug fix
          if (speechSynthesisRef.current.paused) {
            speechSynthesisRef.current.resume();
          }
        } else {
          const text = summaryData?.original_text || "";
          const newUtterance = new SpeechSynthesisUtterance(text);
          newUtterance.rate = newRate;
          newUtterance.volume = isMuted ? 0 : volume;
          
          // Set up event handlers (simplified as this is just for rate change)
          newUtterance.onstart = () => setIsTranscriptPlaying(true);
          newUtterance.onend = () => {
            setIsTranscriptPlaying(false);
            clearProgressInterval();
          };
          
      setCurrentUtterance(newUtterance);
          speechSynthesisRef.current.speak(newUtterance);
          
          // Chrome bug fix
          if (speechSynthesisRef.current.paused) {
            speechSynthesisRef.current.resume();
    }
        }
      } catch (error) {
        console.error("Failed to change playback rate:", error);
        setAudioError(`Failed to change playback rate: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [summaryData, isPlaying, isTranscriptPlaying, currentUtterance, volume, isMuted, clearProgressInterval]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    
    if (!isSpeechSynthesisSupported || !speechSynthesisRef.current) return;
    
    // If muted, unmute when adjusting volume
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
    }
    
    // Update volume for current utterance if one is playing
    if (currentUtterance && (isPlaying || isTranscriptPlaying)) {
      try {
        // Apply new volume immediately
      currentUtterance.volume = newVolume;
      } catch (error) {
        console.error("Failed to change volume:", error);
      }
    }
  }, [currentUtterance, isPlaying, isTranscriptPlaying, isMuted]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    
    if (!isSpeechSynthesisSupported || !speechSynthesisRef.current) return;
    
    // Update mute state for current utterance if one is playing
    if (currentUtterance && (isPlaying || isTranscriptPlaying)) {
      try {
        // Apply mute/unmute immediately
        currentUtterance.volume = !isMuted ? 0 : volume;
      } catch (error) {
        console.error("Failed to toggle mute:", error);
      }
    }
  }, [isMuted, currentUtterance, isPlaying, isTranscriptPlaying, volume]);

  // Skip forward/backward
  const skipAudio = useCallback((seconds: number) => {
    // For speech synthesis we can't easily skip
    // So we'll just adjust the progress display
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  // Listen for speech synthesis events
  useEffect(() => {
    // Cancel any ongoing speech when component unmounts
    return () => {
      window.speechSynthesis.cancel();
      if (currentUtterance) {
        clearInterval((currentUtterance as any).progressInterval);
      }
    };
  }, [currentUtterance]);

  // Function to download summary as text file
  const downloadSummary = useCallback(() => {
    if (!summaryData?.summary_translated) {
      toast({ title: "No summary available", variant: "destructive" });
      return;
    }
    
    try {
      const element = document.createElement("a");
      const file = new Blob([summaryData.summary_translated], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = "summary.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast({ title: "Summary downloaded" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  }, [summaryData, toast]);

  // Function to handle summary data loading and debugging
  useEffect(() => {
    // Custom event handler 
    const handleCustomEvent = (event: CustomEvent<SummaryData>) => {
      if (event.detail) setSummaryData(event.detail);
    };

    window.addEventListener('summaryUpdated', handleCustomEvent as EventListener);
    
    // Load existing data from Supabase
    const loadSummaryData = async () => {
      // We need to get the current video ID, which would typically be from app state
      // For this example, we'll assume it's available from URL or state management
      const videoId = window.location.hash.substring(1) || 'current';
      
      // Only try to load from Supabase if the user is authenticated
      if (user) {
        const { data, error } = await getSummary(videoId);
        
        if (error) {
          console.error('Failed to load summary from database', error);
          return;
        }
        
        if (data) {
          setSummaryData(data);
          
          // Debug log for troubleshooting summary display issues
          console.log("[Debug] Summary Data Loaded from Supabase:", {
            hasSummaryEn: !!data?.summary_en,
            summaryEnLength: data?.summary_en?.length || 0,
            hasSummaryTranslated: !!data?.summary_translated,
            summaryTranslatedLength: data?.summary_translated?.length || 0,
            hasOriginalText: !!data?.original_text,
            hasSegments: Array.isArray(data?.transcript_segments) && data?.transcript_segments.length > 0,
            segmentsCount: data?.transcript_segments?.length || 0
          });
        }
      } else {
        // For non-authenticated users, try localStorage
        const savedData = localStorage.getItem('summaryData');
        if (savedData) {
          try {
            setSummaryData(JSON.parse(savedData));
          } catch (e) {
            console.error('Failed to parse saved summary data', e);
          }
        }
      }
    };
    
    loadSummaryData();
    
    return () => {
      window.removeEventListener('summaryUpdated', handleCustomEvent as EventListener);
      if (isPlaying || isTranscriptPlaying) window.speechSynthesis.cancel();
    };
  }, [isPlaying, isTranscriptPlaying, user]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format timestamp for transcript segments
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Function to get the summary content to display
  const getSummaryContent = useCallback(() => {
  if (!summaryData) {
    return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-30" />
          <p>No summary available yet. Please upload a video or audio file.</p>
        </div>
      );
      }

    // Check if summary is actually available
    const hasSummary = summaryData?.summary_translated && summaryData.summary_translated.trim().length > 0;

    if (!hasSummary) {
    return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-30" />
          <p>No summary available for this content.</p>
              </div>
    );
  }

  return (
                  <div className="space-y-4">
        {summaryData.thumbnail_url && (
          <div className="relative rounded-xl overflow-hidden mb-6 aspect-video shadow-md">
            <img 
              src={summaryData.thumbnail_url} 
              alt={summaryData.title || "Video thumbnail"} 
              className="w-full h-full object-cover"
            />
            {summaryData.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-white text-lg font-medium line-clamp-2">{summaryData.title}</h3>
                        </div>
            )}
                  </div>
        )}
        
        <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/20">
          <h3 className="text-xl font-medium text-foreground flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Summary
          </h3>
          <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(summaryData.summary_translated || "")}
                  className="h-8 w-8 rounded-full"
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy summary</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handlePlayPause}
                  className="h-8 w-8 rounded-full"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                </Button>
              </div>
              </div>
              
        {summaryData.sentiment && (
          <div className="mt-6 bg-card/30 border border-border/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-medium">Sentiment Analysis</h3>
                  <p className="text-sm text-muted-foreground capitalize">{summaryData.sentiment.label}</p>
                        </div>
                  </div>
              <div className="text-2xl font-bold">
                {Math.round(summaryData.sentiment.score * 100)}%
                  </div>
            </div>
            
            {/* Sentiment progress bar */}
            <div className="w-full bg-background rounded-full h-2.5 dark:bg-background/30">
              <div 
                className={`h-2.5 rounded-full ${
                  summaryData.sentiment.label === "positive" 
                    ? "bg-green-500" 
                    : summaryData.sentiment.label === "negative" 
                      ? "bg-destructive" 
                      : "bg-primary"
                }`}
                style={{ width: `${Math.round(summaryData.sentiment.score * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="text-foreground leading-relaxed p-5 rounded-xl bg-card/30 border border-border/20 shadow-sm">
          {summaryData?.summary_translated?.split('\n').map((paragraph, index) => (
            <p key={index} className={`${index > 0 ? "mt-4" : ""} leading-relaxed`}>
              {paragraph}
            </p>
          ))}
              </div>
      </div>
    );
  }, [summaryData, isPlaying, handlePlayPause, copyToClipboard]);

  // Function to get the transcript content
  const getTranscriptContent = useCallback(() => {
    if (!summaryData?.original_text) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <FileAudio className="h-12 w-12 mb-4 opacity-30" />
          <p>No transcript available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/20">
          <h3 className="text-xl font-medium text-foreground flex items-center">
            <FileAudio className="h-5 w-5 mr-2 text-primary" />
            Full Transcript
          </h3>
          <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(summaryData.original_text || "")}
              className="h-8 w-8 rounded-full"
                >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy transcript</span>
                </Button>
                <Button 
                  variant="outline" 
              size="icon"
              onClick={toggleTranscriptAudio}
              className="h-8 w-8 rounded-full"
                >
              {isTranscriptPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">{isTranscriptPlaying ? "Pause" : "Play"}</span>
                </Button>
              </div>
        </div>
        
        <div className="text-foreground leading-relaxed p-5 rounded-xl bg-card/30 border border-border/20 shadow-sm text-sm max-h-[400px] overflow-auto">
          {summaryData.transcript_segments && summaryData.transcript_segments.length > 0 ? (
            <div className="space-y-3">
              {summaryData.transcript_segments.map((segment, index) => (
                <div key={index} className="flex flex-col space-y-1 hover:bg-muted/20 p-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-full">
                      {formatTimestamp(segment.start)}
                    </span>
                    <div className="h-px flex-1 bg-border/40"></div>
                  </div>
                  <p className="pl-2 border-l-2 border-primary/20">{segment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {summaryData.original_text.split('\n').map((paragraph, index) => (
                <p key={index} className={index > 0 ? "mt-4" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [summaryData, isTranscriptPlaying, toggleTranscriptAudio, copyToClipboard, formatTimestamp]);

  // Function to get audio player UI
  const getAudioPlayerContent = () => {
    // Return a floating audio player
    return (
      <>
        {showAudioPlayer && (
        <motion.div 
            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 bg-card/95 backdrop-blur-sm rounded-xl shadow-lg p-2 border border-border/40 w-[90vw] max-w-[450px]"
            initial={{ translateY: "100%", opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col space-y-2">
              {/* Player header with close button */}
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="py-1 px-2">
                    {isPlaying ? "Summary" : isTranscriptPlaying ? "Transcript" : "Audio Player"}
                  </Badge>
                  {(isPlaying || isTranscriptPlaying) && (
                    <div className="animate-pulse">
                      <Speaker className="h-4 w-4 text-primary" />
                    </div>
                )}
              </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={() => setShowAudioPlayer(false)}
                >
                  <Close className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Error message if any */}
              {audioError && (
                <div className="bg-destructive/20 text-destructive px-3 py-1 rounded-md text-sm">
                  {audioError}
                </div>
              )}
              
              {/* Progress bar */}
              <div className="px-3 py-1">
                <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Audio controls */}
              <div className="grid grid-cols-2 gap-2 px-2 pb-1">
                <div className="flex items-center space-x-2">
                  {/* Play/Pause */}
                <Button 
                  variant="outline" 
                    size="sm"
                    className="h-8 rounded-lg flex-1"
                    onClick={isTranscriptPlaying ? toggleTranscriptAudio : handlePlayPause}
                >
                    {isPlaying || isTranscriptPlaying ? (
                          <Pause className="h-4 w-4 mr-2" />
                  ) : (
                          <Play className="h-4 w-4 mr-2" />
                  )}
                    {isPlaying || isTranscriptPlaying ? "Pause" : "Play"}
                </Button>
                    
                  {/* Mute/Unmute */}
                <Button 
                  variant="outline" 
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleMuteToggle}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume > 0.5 ? (
                      <Volume className="h-4 w-4" />
                    ) : (
                      <Volume className="h-4 w-4" />
                    )}
                      </Button>
                </div>
                
                {/* Playback Rate */}
                <div className="flex items-center space-x-2">
                  <div className="hidden md:flex items-center space-x-2 flex-1">
                    <Label className="text-xs">Speed</Label>
                    <Select
                      value={playbackRate.toString()}
                      onValueChange={(val) => handlePlaybackRateChange(parseFloat(val))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="1x" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Mobile-friendly rate buttons */}
                  <div className="flex md:hidden space-x-1 flex-1 justify-between">
                      <Button 
                      variant={playbackRate === 0.5 ? "secondary" : "outline"}
                        size="sm" 
                      className="h-8 flex-1 px-2"
                      onClick={() => handlePlaybackRateChange(0.5)}
                    >
                      0.5x
                    </Button>
                    <Button
                      variant={playbackRate === 1 ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 flex-1 px-2"
                      onClick={() => handlePlaybackRateChange(1)}
                    >
                      1x
                    </Button>
                    <Button
                      variant={playbackRate === 1.5 ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 flex-1 px-2"
                      onClick={() => handlePlaybackRateChange(1.5)}
                    >
                      1.5x
                    </Button>
                    <Button
                      variant={playbackRate === 2 ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 flex-1 px-2"
                      onClick={() => handlePlaybackRateChange(2)}
                    >
                      2x
                      </Button>
                  </div>
                    </div>
                  </div>
                  
              {/* Additional controls - simplified volume slider */}
              <div className="px-3 py-1">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleVolumeChange(0.1)}
                            >
                    <Volume className="h-3 w-3" />
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([val]) => handleVolumeChange(val)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleVolumeChange(1)}
                  >
                    <Volume className="h-3 w-3" />
                  </Button>
                </div>
              </div>
                            </div>
                          </motion.div>
        )}
                          
        {/* Floating audio button */}
        {summaryData && !showAudioPlayer && (
                          <motion.div 
            className="fixed bottom-4 right-4 z-50"
            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={() => setShowAudioPlayer(true)}
            >
              <Headphones className="h-5 w-5" />
            </Button>
                            </motion.div>
        )}
      </>
    );
  };

  return (
    <div className="summary-display w-full h-full flex flex-col relative overflow-hidden">
      {/* Fixed position audio player */}
      {getAudioPlayerContent()}
      
      {/* Main content */}
      <Card className="bg-background border-border/20 shadow-md rounded-lg overflow-hidden">
        {!summaryData ? (
          <div className="flex flex-col items-center justify-center p-6 h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-center max-w-xs">
              Upload a video or audio file to see the summary here
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Video header with thumbnail & title */}
            <div className="p-4 flex items-center gap-4">
              {summaryData.thumbnail_url && (
                <div className="relative rounded-lg overflow-hidden w-24 h-24 flex-shrink-0 shadow-sm border border-border/40">
                  <img 
                    src={summaryData.thumbnail_url} 
                    alt={summaryData.title || "Video thumbnail"} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <h2 className="text-lg font-medium text-foreground">
                  {summaryData.title || 'Video: CFfMA_MJ6rE'}
                </h2>
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="py-0.5 px-3 flex items-center gap-1">
                    <Languages className="h-3.5 w-3.5" />
                    {summaryData.language || "English"}
                  </Badge>
                            </div>
                          </div>
                        </div>
            
            {/* Sentiment analysis - positioned outside tabs to match screenshot */}
            {summaryData.sentiment && (
              <div className="mx-4 mb-4 p-4 bg-card/30 border border-border/30 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-medium">Sentiment Analysis</h3>
                      </div>
                  <p className="capitalize text-sm font-medium">{summaryData.sentiment.label}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="w-full bg-background/30 rounded-full h-2 mr-3">
                    <div 
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${Math.round(summaryData.sentiment.score * 100)}%` }}
                    ></div>
                            </div>
                  <span className="text-xl font-bold whitespace-nowrap">
                    {Math.round(summaryData.sentiment.score * 100)}%
                  </span>
                          </div>
                      </div>
            )}
            
            {/* Tabs */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full"
            >
              <div className="border-b border-border/30">
                <TabsList className="grid grid-cols-2 w-full bg-transparent p-0 h-12">
                  <TabsTrigger 
                    value="summary" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 bg-transparent"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transcript" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 bg-transparent"
                  >
                    <FileAudio className="h-5 w-5 mr-2" />
                    Transcript
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="summary" className="m-0 h-[calc(100vh-350px)] relative pb-6">
                {/* Action buttons - moved to top */}
                <div className="border-b border-border/30 bg-background py-3 px-6 flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePlayPause}
                    className="flex items-center gap-2 text-sm h-9"
                  >
                    <Play className="h-4 w-4" />
                    Listen
                  </Button>
                      
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(summaryData?.summary_translated || "")}
                    className="flex items-center gap-2 text-sm h-9"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                    
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadSummary}
                    className="flex items-center gap-2 text-sm h-9"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                
                <div className="prose dark:prose-invert max-w-none text-foreground px-6 pt-6 overflow-y-auto h-[calc(100%-90px)]">
                  {summaryData?.summary_translated ? (
                    summaryData.summary_translated.split('\n').map((paragraph, index) => (
                      <p key={index} className={`${index > 0 ? "mt-4" : ""} text-foreground`}>
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-foreground">This is a sample translated summary.</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="transcript" className="m-0 h-[calc(100vh-350px)] relative pb-6">
                {/* Action buttons - moved to top */}
                <div className="border-b border-border/30 bg-background py-3 px-6 flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleTranscriptAudio}
                    className="flex items-center gap-2 text-sm h-9"
                  >
                    {isTranscriptPlaying ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Listen
                      </>
                    )}
                  </Button>
                
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(summaryData?.original_text || "")}
                    className="flex items-center gap-2 text-sm h-9"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                
                <div className="prose dark:prose-invert max-w-none text-foreground px-6 pt-6 overflow-y-auto h-[calc(100%-90px)]">
                  {summaryData?.transcript_segments && summaryData.transcript_segments.length > 0 ? (
                    <div className="space-y-4">
                      {summaryData.transcript_segments.map((segment, index) => (
                        <div key={index} className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                              {formatTimestamp(segment.start)}
                            </span>
                            <div className="h-px flex-1 bg-border/40"></div>
                          </div>
                          <p className="text-foreground">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-foreground">No transcript available for this video.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Place processing logs below the tabs */}
            {logMessages.length > 0 && (
              <div className="mt-4 mb-4 px-4">
                <ProcessingLogs messages={logMessages} />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}