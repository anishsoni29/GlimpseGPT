"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  FileAudio, 
  PauseCircle, 
  PlayCircle, 
  Download, 
  BarChart4,
  FileText,
  Languages,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [activeTab, setActiveTab] = useState("summary");
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  
  // Function for copying text to clipboard
  const copyToClipboard = (text: string) => {
    if (!text) {
      toast({
        title: "Error",
        description: "No text available to copy",
        variant: "destructive",
      });
      return;
    }
    
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Text copied successfully",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Error",
          description: "Failed to copy text to clipboard",
          variant: "destructive",
        });
      }
    );
  };

  // Function to handle text-to-speech
  const handlePlayPause = () => {
    if (!summaryData?.summary_translated) {
      toast({
        title: "Error",
        description: "No summary available to play",
        variant: "destructive",
      });
      return;
    }
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(summaryData.summary_translated);
      
      // Set language if available
      if (summaryData.language && summaryData.language !== 'English') {
        const langMap: Record<string, string> = {
          'Hindi': 'hi-IN',
          'Tamil': 'ta-IN',
          'Marathi': 'mr-IN',
          'English': 'en-US'
        };
        utterance.lang = langMap[summaryData.language] || 'en-US';
      }
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = (event) => {
        console.error('TTS error:', event);
        setIsPlaying(false);
        toast({
          title: "Text-to-Speech Error",
          description: "An error occurred while playing the summary",
          variant: "destructive",
        });
      };
    }
  };

  // Function to download summary as text file
  const downloadSummary = () => {
    if (!summaryData?.summary_translated) {
      toast({
        title: "Error",
        description: "No summary available to download",
        variant: "destructive",
      });
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
      
      toast({
        title: "Download Complete",
        description: "Summary has been downloaded as text file",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download the summary",
        variant: "destructive",
      });
    }
  };

  // Function to visualize sentiment
  const renderSentimentVisual = () => {
    if (!summaryData?.sentiment) return null;
    
    const { label, score } = summaryData.sentiment;
    const percentage = Math.round(score * 100);
    
    let color;
    let emoji;
    switch(label.toLowerCase()) {
      case 'positive':
        color = 'bg-green-500';
        emoji = '😊';
        break;
      case 'negative':
        color = 'bg-red-500';
        emoji = '😟';
        break;
      default:
        color = 'bg-blue-500';
        emoji = '😐';
    }
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mt-4 p-4 border rounded-lg bg-card/50"
      >
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <Badge variant={label.toLowerCase() === 'positive' ? 'default' : label.toLowerCase() === 'negative' ? 'destructive' : 'secondary'}>
              {emoji} {label}
            </Badge>
          </span>
          <span className="text-sm font-medium">{percentage}% confidence</span>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full ${color} rounded-full`}
          />
        </div>
      </motion.div>
    );
  };

  // Function to handle summary reload animation
  const triggerReloadAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  // Listen for summary data updates via window storage event and custom event
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'summaryData' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          setSummaryData(data);
          triggerReloadAnimation();
        } catch (e) {
          console.error('Failed to parse summary data', e);
        }
      }
    };
    
    // Custom event handler for direct component communication
    const handleCustomEvent = (event: CustomEvent<SummaryData>) => {
      if (event.detail) {
        setSummaryData(event.detail);
        triggerReloadAnimation();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('summaryUpdated', handleCustomEvent as EventListener);
    
    // Try to load existing data from localStorage
    const savedData = localStorage.getItem('summaryData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setSummaryData(parsedData);
      } catch (e) {
        console.error('Failed to parse saved summary data', e);
      }
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('summaryUpdated', handleCustomEvent as EventListener);
      
      // Cancel any ongoing speech when component unmounts
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  // No content state
  if (!summaryData || !summaryData.summary_translated) {
    return (
      <Card className="p-6 bg-card min-h-[300px] flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          >
            <FileAudio className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          </motion.div>
          <p className="text-muted-foreground">
            Process a video to see your summary here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      animate={isAnimating ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden bg-card">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Summary</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  {summaryData.language || 'English'}
                </Badge>
                {summaryData.sentiment && (
                  <Badge 
                    variant={summaryData.sentiment.label.toLowerCase() === 'positive' ? 'default' : summaryData.sentiment.label.toLowerCase() === 'negative' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {summaryData.sentiment.label}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handlePlayPause}
                className="h-8 w-8 rounded-full"
              >
                {isPlaying ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(summaryData.summary_translated || '')}
                className="h-8 w-8 rounded-full"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={downloadSummary}
                className="h-8 w-8 rounded-full"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="summary" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="transcript" className="flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center gap-1.5">
                <BarChart4 className="h-4 w-4" />
                Sentiment
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4 mt-4">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2 text-pretty">
                  {summaryData.summary_translated?.split('\n').map((paragraph, i) => (
                    <p key={i} className={paragraph.trim() === '' ? 'h-4' : ''}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transcript" className="space-y-4 mt-4">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2 text-pretty">
                  {summaryData.original_text ? (
                    summaryData.original_text.split('\n').map((paragraph, i) => (
                      <p key={i} className={paragraph.trim() === '' ? 'h-4' : ''}>
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No transcript available</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-4 mt-4">
              <div className="p-4 rounded-md border h-[300px] flex flex-col justify-center">
                {summaryData.sentiment ? (
                  <div className="space-y-6">
                    {renderSentimentVisual()}
                    <div className="p-4 rounded-md bg-muted/50">
                      <h4 className="text-sm font-medium mb-2">What this means:</h4>
                      <p className="text-sm text-muted-foreground">
                        {summaryData.sentiment.label === 'Positive' ? 
                          'The content has a primarily positive tone, expressing favorable or optimistic sentiments.' :
                          summaryData.sentiment.label === 'Negative' ?
                            'The content has a primarily negative tone, expressing unfavorable or pessimistic sentiments.' :
                            'The content has a balanced or neutral tone, without strong positive or negative sentiments.'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    No sentiment analysis available
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </motion.div>
  );
}