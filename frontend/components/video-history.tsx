'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface HistoryItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  timestamp: number;
  language: string;
}

export function VideoHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('videoHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
      } catch (error) {
        console.error('Failed to parse video history', error);
      }
    }
  }, []);

  const handleReprocess = (item: HistoryItem) => {
    // Create and dispatch a custom event to trigger reprocessing in the VideoUpload component
    const event = new CustomEvent('reprocessVideo', { 
      detail: { url: item.url, language: item.language }
    });
    window.dispatchEvent(event);

    toast({
      title: 'Reprocessing Video',
      description: `Reprocessing "${item.title}"`,
    });
  };

  const removeFromHistory = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('videoHistory', JSON.stringify(updatedHistory));
    
    toast({
      title: 'Removed from History',
      description: 'Video removed from your history',
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('videoHistory');
    
    toast({
      title: 'History Cleared',
      description: 'Your video history has been cleared',
    });
  };

  if (history.length === 0) {
    return (
      <Card className="p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Recent Videos</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No video history available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Recent Videos</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={clearHistory}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>
      
      <ScrollArea className="h-[280px] pr-4">
        <div className="space-y-3">
          {history.map((item) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <div className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0">
                {item.thumbnailUrl ? (
                  <img 
                    src={item.thumbnailUrl} 
                    alt={item.title} 
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="bg-muted w-full h-full flex items-center justify-center">
                    <PlayCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleDateString()}
                </p>
                <div className="mt-1 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => handleReprocess(item)}
                  >
                    Reprocess
                  </Button>
                </div>
              </div>
              
              <Button
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFromHistory(item.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
} 