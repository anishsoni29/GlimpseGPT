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
  BarChart4
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export function SummaryDisplay() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
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
          description: "Summary copied to clipboard successfully",
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
      <div className="space-y-2 mt-4 p-3 border rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Sentiment: {label} {emoji}</span>
          <span className="text-sm font-medium">{percentage}% confidence</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} rounded-full transition-all duration-500 ease-in-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Listen for summary data updates via window storage event and custom event
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'summaryData' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          setSummaryData(data);
          console.log("Summary data updated from storage event", data);
        } catch (e) {
          console.error('Failed to parse summary data', e);
        }
      }
    };
    
    // Custom event handler for direct component communication
    const handleCustomEvent = (event: CustomEvent<SummaryData>) => {
      if (event.detail) {
        setSummaryData(event.detail);
        console.log("Summary data updated from custom event", event.detail);
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
        console.log("Loaded saved summary data", parsedData);
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
      <Card className="p-6 bg-card min-h-[300px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileAudio className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Process a video to see your summary here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePlayPause}
              title={isPlaying ? "Pause TTS" : "Play TTS"}
            >
              {isPlaying ? (
                <PauseCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(
                activeTab === "summary" 
                  ? summaryData.summary_translated || "" 
                  : summaryData.original_text || ""
              )}
              title="Copy to clipboard"
            >
              <Copy className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={downloadSummary}
              title="Download summary"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <TabsContent value="summary" className="space-y-4">
          <div className="whitespace-pre-wrap text-foreground">
            {summaryData.summary_translated}
          </div>
          
          {renderSentimentVisual()}
          
          {summaryData.language && summaryData.language !== 'English' && (
            <div className="text-xs text-muted-foreground mt-2">
              Translated to: {summaryData.language}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="transcript" className="space-y-4">
          <div className="whitespace-pre-wrap text-foreground max-h-[500px] overflow-y-auto">
            {summaryData.original_text}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}