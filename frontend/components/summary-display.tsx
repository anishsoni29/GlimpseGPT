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
  SkipBack
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

  // Listen for summary data updates
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'summaryData' && event.newValue) {
        try {
          setSummaryData(JSON.parse(event.newValue));
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

  if (!summaryData) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center border">
          <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FileAudio className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Enter a YouTube URL or upload a file to get started
          </p>
        </motion.div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border shadow-md">
        <motion.div 
          className="p-4 flex items-center justify-between border-b bg-muted/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        >
          <div className="flex gap-2 items-center">
            {summaryData.thumbnail_url && (
              <motion.img 
                src={summaryData.thumbnail_url} 
                alt="Video thumbnail"
                className="h-12 w-20 object-cover rounded shadow-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.3, 
                  type: "spring", 
                  stiffness: 300 
                }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              />
            )}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              {summaryData.title && (
                <motion.h3 
                  className="font-semibold text-base truncate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {summaryData.title}
                </motion.h3>
              )}
              {summaryData.language && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Badge variant="outline" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                    {summaryData.language}
                  </Badge>
                </motion.div>
                )}
            </motion.div>
              </div>
        </motion.div>
        
        <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
          <motion.div 
            className="px-4 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary" className="transition-all duration-200 data-[state=active]:bg-primary/20">
                <FileText className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="transcript" className="transition-all duration-200 data-[state=active]:bg-primary/20">
                <FileAudio className="h-4 w-4 mr-2" />
                Transcript
              </TabsTrigger>
            </TabsList>
          </motion.div>
          
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: activeTab === "summary" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeTab === "summary" ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="summary" className="mt-0 space-y-4">
                  <ScrollArea className="h-64 border rounded-md p-4 bg-card/50">
                    {summaryData.summary_translated ? (
                      <p className="leading-relaxed">{summaryData.summary_translated}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No summary available.</p>
                    )}
                  </ScrollArea>
                  
                  <div className="flex justify-between">
                <Button 
                      size="sm" 
                  variant="outline" 
                  onClick={handlePlayPause}
                      className="transition-all duration-200 hover:bg-primary/10"
                >
                  {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                  ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Listen
                        </>
                  )}
                </Button>
                    
                    <div className="space-x-2">
                <Button 
                        size="sm" 
                  variant="outline" 
                        onClick={() => copyToClipboard(summaryData.summary_translated || "")}
                        className="transition-all duration-200 hover:bg-primary/10"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={downloadSummary}
                        className="transition-all duration-200 hover:bg-primary/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  {summaryData.sentiment && (
                    <motion.div 
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20,
                        delay: 0.3
                      }}
                      className={`p-4 rounded-md border shadow-sm
                        ${summaryData.sentiment.label.toLowerCase() === 'positive' 
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30' 
                          : summaryData.sentiment.label.toLowerCase() === 'negative'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
                            : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30'
                        }`}
                    >
                      <motion.div 
                        className="flex justify-between mb-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center">
                          <motion.div
                            initial={{ rotate: -30, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 300, 
                              delay: 0.6
                            }}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                          </motion.div>
                          <motion.span 
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="font-medium"
                          >
                            {summaryData.sentiment.label} Sentiment
                          </motion.span>
                        </div>
                        <motion.span 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="font-medium"
                        >
                          {Math.round(summaryData.sentiment.score * 100)}%
                      </motion.span>
                      </motion.div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(summaryData.sentiment.score * 100)}%` }}
                          transition={{ 
                            delay: 0.9, 
                            duration: 1,
                            type: "spring",
                            stiffness: 50
                          }}
                          className={`h-full ${
                            summaryData.sentiment.label.toLowerCase() === 'positive' 
                              ? 'bg-green-500' 
                              : summaryData.sentiment.label.toLowerCase() === 'negative'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                          }`}
                        />
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
                
                <TabsContent value="transcript" className="mt-0 space-y-4">
                  <ScrollArea className="h-64 border rounded-md p-4 bg-card/50">
                    {summaryData.original_text ? (
                      <p className="leading-relaxed">{summaryData.original_text}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No transcript available.</p>
                    )}
                  </ScrollArea>
                  
                  <div className="flex justify-between">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={toggleTranscriptAudio}
                      className="transition-all duration-200 hover:bg-primary/10"
                    >
                      {isTranscriptPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Audio
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Play Audio
                        </>
                      )}
                </Button>
                    
                <Button 
                      size="sm" 
                  variant="outline" 
                      onClick={() => copyToClipboard(summaryData.original_text || "")}
                      className="transition-all duration-200 hover:bg-primary/10"
                >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Transcript
                </Button>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
            
            {/* Audio Player */}
            <AnimatePresence>
              {showAudioPlayer && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="mt-4 p-3 border rounded-md bg-card/80 backdrop-blur-sm shadow-lg"
                >
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <motion.div 
                        initial={{ x: -5, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm font-medium flex items-center"
                      >
                        <motion.span
                          animate={{ 
                            scale: [1, 1.1, 1],
                            color: ['#6366f1', '#818cf8', '#6366f1'] 
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            repeatType: "reverse" 
                          }}
                          style={{ display: 'inline-block', marginRight: '6px' }}
                        >
                          {isPlaying || isTranscriptPlaying ? "▶️" : "🔊"}
                        </motion.span>
                        Audio Player
                      </motion.div>
                      <motion.div 
                        className="text-xs text-muted-foreground"
                        initial={{ x: 5, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </motion.div>
                      </div>
                    
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ transformOrigin: 'left' }}
                    >
                      <Progress value={(currentTime / duration) * 100} className="h-1 w-full" />
                </motion.div>
                    
                    <div className="flex items-center justify-between">
                      <motion.div 
                        className="flex items-center space-x-1"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <Button
                          variant="ghost" 
                          size="icon" 
                          onClick={() => skipAudio(-10)}
                          className="h-8 w-8"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        
                <motion.div
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Button
                            variant={isPlaying || isTranscriptPlaying ? "secondary" : "outline"}
                            size="icon"
                            onClick={isPlaying ? handlePlayPause : toggleTranscriptAudio}
                            className="h-8 w-8"
                          >
                            {isPlaying || isTranscriptPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                        
                        <Button
                          variant="ghost" 
                          size="icon" 
                          onClick={() => skipAudio(10)}
                          className="h-8 w-8"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                </motion.div>

                <motion.div
                        className="flex items-center space-x-2"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                      >
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleMute}
                          className="h-8 w-8"
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <div className="w-20">
                          <Slider
                            value={[volume * 100]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(values) => handleVolumeChange(values[0] / 100)}
                            className="h-2"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          <span className="text-xs font-medium">Speed:</span>
                          <select
                            value={playbackRate.toString()}
                            onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                            className="text-xs bg-transparent border rounded px-1"
                          >
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1">1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="1.75">1.75x</option>
                            <option value="2">2x</option>
                          </select>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </Tabs>
      </Card>
    </motion.div>
  );
}