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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

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

export function SummaryDisplay() {
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  
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
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      // Don't hide the audio player when pausing
    } else {
      // Show audio player immediately
      setShowAudioPlayer(true);
      
      const utterance = new SpeechSynthesisUtterance(summaryData.summary_translated);
      
      // Set playback rate
      utterance.rate = playbackRate;
      utterance.volume = volume;
      
      // Set language if available
      if (summaryData.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN', 'Tamil': 'ta-IN', 'Marathi': 'mr-IN', 'English': 'en-US'
        };
        utterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      // Setup event handlers
      utterance.onstart = () => {
      setIsPlaying(true);
        
        // Estimate duration (approx 5 characters per second at normal rate)
        const textLength = summaryData.summary_translated?.length || 0;
        setDuration(textLength / (5 * playbackRate));
        
        // Update progress
        let elapsed = 0;
        const progressInterval = setInterval(() => {
          elapsed += 0.1;
          if (elapsed <= (textLength / (5 * playbackRate))) {
            setCurrentTime(elapsed);
          } else {
            clearInterval(progressInterval);
          }
        }, 100);
        
        // Store the interval ID
        (utterance as any).progressInterval = progressInterval;
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        clearInterval((utterance as any).progressInterval);
        setCurrentTime(0);
        // Don't hide audio player on end
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
        clearInterval((utterance as any).progressInterval);
        toast({ title: "Text-to-speech error", variant: "destructive" });
        // Keep audio player visible even on error
      };
      
      // Store reference to current utterance
      setCurrentUtterance(utterance);
      
      window.speechSynthesis.speak(utterance);
    }
  }, [summaryData, isPlaying, playbackRate, volume, toast]);

  // Function to play/pause transcript audio
  const toggleTranscriptAudio = useCallback(() => {
    if (!summaryData?.original_text) {
      toast({ title: "No transcript available", variant: "destructive" });
      return;
    }
    
    if (isTranscriptPlaying) {
      window.speechSynthesis.cancel();
      setIsTranscriptPlaying(false);
      // Don't hide audio player when pausing
    } else {
      // Show audio player immediately
      setShowAudioPlayer(true);
      
      const utterance = new SpeechSynthesisUtterance(summaryData.original_text);
      
      // Set playback rate and volume
      utterance.rate = playbackRate;
      utterance.volume = volume;
      
      // Set language if available
      if (summaryData.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN', 'Tamil': 'ta-IN', 'Marathi': 'mr-IN', 'English': 'en-US'
        };
        utterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      // Setup event handlers
      utterance.onstart = () => {
        setIsTranscriptPlaying(true);
        
        // Estimate duration (approx 5 characters per second at normal rate)
        const textLength = summaryData.original_text?.length || 0;
        setDuration(textLength / (5 * playbackRate));
        
        // Update progress
        let elapsed = 0;
        const progressInterval = setInterval(() => {
          elapsed += 0.1;
          if (elapsed <= (textLength / (5 * playbackRate))) {
            setCurrentTime(elapsed);
          } else {
            clearInterval(progressInterval);
          }
        }, 100);
        
        // Store the interval ID
        (utterance as any).progressInterval = progressInterval;
      };
      
      utterance.onend = () => {
        setIsTranscriptPlaying(false);
        clearInterval((utterance as any).progressInterval);
        setCurrentTime(0);
        // Don't hide audio player on end
      };
      
      utterance.onerror = () => {
        setIsTranscriptPlaying(false);
        clearInterval((utterance as any).progressInterval);
        toast({ title: "Speech playback error", variant: "destructive" });
        // Keep audio player visible even on error
      };
      
      // Store reference to current utterance
      setCurrentUtterance(utterance);
      
      window.speechSynthesis.speak(utterance);
    }
  }, [summaryData, isTranscriptPlaying, playbackRate, volume, toast]);

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((newRate: number) => {
    setPlaybackRate(newRate);
    
    // Update rate for current utterance if one is playing
    if (currentUtterance && (isPlaying || isTranscriptPlaying)) {
      window.speechSynthesis.cancel();
      
      // Create a new utterance with the updated rate
      const newUtterance = new SpeechSynthesisUtterance(
        isPlaying ? summaryData?.summary_translated || "" : summaryData?.original_text || ""
      );
      
      newUtterance.rate = newRate;
      newUtterance.volume = volume;
      
      // Set language if available
      if (summaryData?.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN', 'Tamil': 'ta-IN', 'Marathi': 'mr-IN', 'English': 'en-US'
        };
        newUtterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      // Setup event handlers
      newUtterance.onstart = currentUtterance.onstart;
      newUtterance.onend = currentUtterance.onend;
      newUtterance.onerror = currentUtterance.onerror;
      
      // Store reference to new utterance
      setCurrentUtterance(newUtterance);
      
      window.speechSynthesis.speak(newUtterance);
    }
  }, [currentUtterance, isPlaying, isTranscriptPlaying, summaryData, volume]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    // Update volume for current utterance if one is playing
    if (currentUtterance) {
      currentUtterance.volume = newVolume;
    }
  }, [currentUtterance]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(0.5);
      if (currentUtterance) currentUtterance.volume = 0.5;
    } else {
      setIsMuted(true);
      setVolume(0);
      if (currentUtterance) currentUtterance.volume = 0;
    }
  }, [isMuted, currentUtterance]);

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
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'summaryData' && event.newValue) {
        try {
          const parsedData = JSON.parse(event.newValue);
          setSummaryData(parsedData);
          
          // Debug log for troubleshooting summary display issues
          console.log("[Debug] Summary Data Loaded:", {
            hasSummaryEn: !!parsedData?.summary_en,
            summaryEnLength: parsedData?.summary_en?.length || 0,
            hasSummaryTranslated: !!parsedData?.summary_translated,
            summaryTranslatedLength: parsedData?.summary_translated?.length || 0,
            hasOriginalText: !!parsedData?.original_text,
            hasSegments: Array.isArray(parsedData?.transcript_segments) && parsedData?.transcript_segments.length > 0,
            segmentsCount: parsedData?.transcript_segments?.length || 0
          });
          
          // Add a visible error to trigger if summary is missing but metadata is present
          if (parsedData?.thumbnail_url && (!parsedData?.summary_translated || parsedData.summary_translated.trim() === '')) {
            console.error("[Error] Thumbnail exists but summary is missing");
            // Dispatch a custom event for the processing logs
            window.dispatchEvent(new CustomEvent('processingLog', { 
              detail: "Error: Thumbnail loaded but summary is missing. Check API response." 
            }));
          }
        } catch (e) {
          console.error('Failed to parse summary data', e);
        }
      }
    };
    
    // Custom event handler 
    const handleCustomEvent = (event: CustomEvent<SummaryData>) => {
      if (event.detail) setSummaryData(event.detail);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('summaryUpdated', handleCustomEvent as EventListener);
    
    // Load existing data from localStorage
    const savedData = localStorage.getItem('summaryData');
    if (savedData) {
      try {
        setSummaryData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved summary data', e);
      }
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('summaryUpdated', handleCustomEvent as EventListener);
      if (isPlaying || isTranscriptPlaying) window.speechSynthesis.cancel();
    };
  }, [isPlaying, isTranscriptPlaying]);

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
  
  // Toggle fullscreen for transcript
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(!isFullScreen);
  }, [isFullScreen]);

  // Exit fullscreen when ESC key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

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

    // Check if summary is actually available or not
    const hasSummary = summaryData?.summary_translated && summaryData.summary_translated.trim().length > 0;

    return (
                  <div className="space-y-4">
            {summaryData.thumbnail_url && (
          <div className="relative rounded-lg overflow-hidden mb-4 aspect-video">
            <img 
                src={summaryData.thumbnail_url} 
              alt={summaryData.title || "Video thumbnail"} 
              className="w-full h-full object-cover"
            />
              {summaryData.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white font-medium line-clamp-2">{summaryData.title}</h3>
              </div>
            )}
              </div>
        )}
        
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-medium text-foreground">Summary</h3>
          <div className="flex items-center space-x-2">
            {hasSummary && (
              <>
                <Button 
                  variant="ghost"
                  size="icon"
                        onClick={() => copyToClipboard(summaryData.summary_translated || "")}
                  className="h-8 w-8"
                      >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy summary</span>
                      </Button>
                      <Button 
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayPause}
                  className="h-8 w-8"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                      </Button>
              </>
            )}
                    </div>
                  </div>
                  
                  {summaryData.sentiment && (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={
              summaryData.sentiment.label === "positive" ? "success" :
              summaryData.sentiment.label === "negative" ? "destructive" : "default"
            } className="capitalize">
              {summaryData.sentiment.label} 
              <span className="ml-1 opacity-70">
                            {Math.round(summaryData.sentiment.score * 100)}%
              </span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {summaryData.language || "English"}
            </span>
                        </div>
        )}
        
        {hasSummary ? (
          <div className="text-foreground leading-relaxed p-4 rounded-lg bg-card/30 border border-border/10 shadow-sm">
            {summaryData?.summary_translated?.split('\n').map((paragraph, index) => (
              <p key={index} className={index > 0 ? "mt-4" : ""}>
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-muted-foreground bg-card/30 border border-border/10 rounded-lg">
            <AlertCircle className="h-8 w-8 mb-2 text-amber-500" />
            <p className="text-center font-medium mb-1">Summary Not Available</p>
            <p className="text-center text-sm max-w-md">
              The summary could not be generated. This might be due to processing error or lack of speech content in the video.
              You can try again or check the transcript tab.
            </p>
          </div>
        )}
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
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-medium text-foreground">Full Transcript</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(summaryData.original_text || "")}
              className="h-8 w-8"
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy transcript</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTranscriptAudio}
              className="h-8 w-8"
            >
              {isTranscriptPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">{isTranscriptPlaying ? "Pause" : "Play"}</span>
            </Button>
                            </div>
                          </div>
                
        <div className="text-foreground leading-relaxed p-4 rounded-lg bg-card/30 border border-border/10 shadow-sm text-sm max-h-[400px] overflow-auto">
          {summaryData.transcript_segments && summaryData.transcript_segments.length > 0 ? (
                      <div className="space-y-2">
              {summaryData.transcript_segments.map((segment, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                              {formatTimestamp(segment.start)}
                    </span>
                    <div className="h-px flex-1 bg-border/40"></div>
                            </div>
                  <p>{segment.text}</p>
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

  // Function to get the audio player content
  const getAudioPlayerContent = useCallback(() => {
    if (!showAudioPlayer) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:w-[500px] md:-translate-x-1/2 bg-background rounded-lg shadow-lg border border-border z-50"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">
              {isPlaying ? "Playing Summary" : isTranscriptPlaying ? "Playing Transcript" : "Audio Controls"}
            </h4>
                    <Button 
              variant="ghost"
              size="icon"
              onClick={() => setShowAudioPlayer(false)}
              className="h-6 w-6"
            >
              <span className="sr-only">Close player</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
                    </Button>
                  </div>
          
          <div className="mb-2">
            <Progress value={(currentTime / duration) * 100} className="h-1" />
                      </div>
                    
                    <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                        <Button
                          variant="ghost" 
                          size="icon" 
                onClick={() => {
                  if (isPlaying) {
                    handlePlayPause();
                  } else if (isTranscriptPlaying) {
                    toggleTranscriptAudio();
                  }
                }}
                            className="h-8 w-8"
                          >
                            {isPlaying || isTranscriptPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                <span className="sr-only">{isPlaying || isTranscriptPlaying ? "Pause" : "Play"}</span>
                          </Button>
                        
                        <Button
                          variant="ghost" 
                          size="icon" 
                onClick={() => setIsMuted(!isMuted)}
                          className="h-8 w-8"
                        >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
                <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
                        </Button>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlaybackRateChange(0.5)}
                className={`h-6 px-2 text-xs ${playbackRate === 0.5 ? "bg-muted" : ""}`}
              >
                0.5x
              </Button>
                        <Button 
                          variant="ghost" 
                size="sm"
                onClick={() => handlePlaybackRateChange(1)}
                className={`h-6 px-2 text-xs ${playbackRate === 1 ? "bg-muted" : ""}`}
              >
                1x
                        </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlaybackRateChange(1.5)}
                className={`h-6 px-2 text-xs ${playbackRate === 1.5 ? "bg-muted" : ""}`}
              >
                1.5x
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlaybackRateChange(2)}
                className={`h-6 px-2 text-xs ${playbackRate === 2 ? "bg-muted" : ""}`}
              >
                2x
              </Button>
                        </div>
                    </div>
                  </div>
                </motion.div>
    );
  }, [
    showAudioPlayer, isPlaying, isTranscriptPlaying, currentTime, duration, 
    isMuted, playbackRate, handlePlayPause, toggleTranscriptAudio, 
    handlePlaybackRateChange, formatTime
  ]);

  return (
    <>
      <AnimatePresence>
        {getAudioPlayerContent()}
            </AnimatePresence>

      <Card className="bg-card/60 backdrop-blur-sm border border-border/40 overflow-hidden" ref={fullScreenRef}>
        {!summaryData ? (
          <div className="flex flex-col items-center justify-center p-6 h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-center max-w-xs">
              Upload a video or audio file to see the summary here
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end p-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setIsFullScreen(!isFullScreen)}
              >
                <Expand className="h-4 w-4" />
                <span className="sr-only">Toggle fullscreen</span>
              </Button>
            </div>
            <Tabs 
              defaultValue={activeTab} 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="p-4"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>
              <ScrollArea className={`mt-4 ${isFullScreen ? 'h-[calc(100vh-200px)]' : 'max-h-[600px]'}`}>
                <TabsContent value="summary" className="mt-0 p-2">
                  {getSummaryContent()}
                </TabsContent>
                <TabsContent value="transcript" className="mt-0 p-2">
                  {getTranscriptContent()}
                </TabsContent>
              </ScrollArea>
          </Tabs>
          </>
        )}
      </Card>
    </>
  );
}