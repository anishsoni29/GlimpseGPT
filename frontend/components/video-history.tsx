'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, PlayCircle, ExternalLink } from 'lucide-react';
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
    const loadHistory = () => {
      const savedHistory = localStorage.getItem('videoHistory');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
        } catch (error) {
          console.error('Failed to parse video history', error);
        }
      }
    };

    // Initial load
    loadHistory();
    
    // Listen for storage events
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'videoHistory') {
        loadHistory();
      }
    };
    
    // Listen for custom event for immediate refresh
    const handleHistoryUpdated = () => {
      loadHistory();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('videoHistoryUpdated', handleHistoryUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('videoHistoryUpdated', handleHistoryUpdated);
    };
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

  const handleOpenYoutubeVideo = (url: string) => {
    if (url && url.includes('youtube.com') || url.includes('youtu.be')) {
      window.open(url, '_blank');
    }
  };

  if (history.length === 0) {
    return (
      <Card className="p-6 bg-card">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 mb-4"
        >
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Recent Videos</h3>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center h-32 text-muted-foreground"
        >
          No video history available
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
      <Card className="p-6 bg-card">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Clock className="h-5 w-5 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Recent Videos</h3>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </motion.div>
        </motion.div>
        
        <ScrollArea className="h-[280px] pr-4">
          <motion.div className="space-y-3">
            {history.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ 
                  delay: 0.1 * index,
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)" 
                }}
                className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <motion.div 
                  className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0 cursor-pointer group"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleOpenYoutubeVideo(item.url)}
                >
                  {item.thumbnailUrl ? (
                    <>
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.title} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted w-full h-full flex items-center justify-center">
                      <PlayCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                  <motion.div 
                    className="mt-1 flex gap-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 * index + 0.3 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={() => handleReprocess(item)}
                      >
                        Reprocess
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0 }}
                  whileHover={{ opacity: 1, rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => removeFromHistory(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </ScrollArea>
      </Card>
    </motion.div>
  );
} 