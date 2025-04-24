'use client';

import { VideoUpload } from '@/components/video-upload';
import { VideoHistory } from '@/components/video-history';
import { SummaryDisplay } from '@/components/summary-display';
import { LanguageSelector } from '@/components/language-selector';
import { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProcessingLogs } from '@/components/processing-logs';
import { NavBar } from '@/components/nav-bar';

export default function Home() {
  const [showProcessor, setShowProcessor] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Listen for processing logs
  useEffect(() => {
    const handleProcessingLog = (event: CustomEvent<string>) => {
      if (event.detail) {
        const newMessage = event.detail;
        let logType: 'info' | 'error' | 'warning' | 'success' = 'info';
        
        // Determine log type based on message content
        if (newMessage.toLowerCase().includes('error') || newMessage.toLowerCase().includes('failed')) {
          logType = 'error';
        } else if (newMessage.toLowerCase().includes('warning')) {
          logType = 'warning';
        } else if (newMessage.toLowerCase().includes('complete') || newMessage.toLowerCase().includes('success')) {
          logType = 'success';
        }
        
        setLogMessages(prev => [...prev, newMessage].slice(-50)); // Keep last 50 messages
        
        // Update processing status based on log messages
        if (newMessage.toLowerCase().includes('start') || 
            newMessage.toLowerCase().includes('downloading') ||
            newMessage.toLowerCase().includes('processing')) {
          setIsProcessing(true);
          setProcessingError(null);
        }
        
        if (newMessage.toLowerCase().includes('complete')) {
          setIsProcessing(false);
        }
        
        if (logType === 'error') {
          setIsProcessing(false);
          setProcessingError(newMessage);
        }
      }
    };
    
    window.addEventListener('processingLog', handleProcessingLog as EventListener);
    
    return () => {
      window.removeEventListener('processingLog', handleProcessingLog as EventListener);
    };
  }, []);

  // Listen for summary data to show processor
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'summaryData' && event.newValue) {
        setShowProcessor(true);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check if there's already summary data
    const savedData = localStorage.getItem('summaryData');
    if (savedData) {
      setShowProcessor(true);
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* NavBar */}
      <NavBar />
      
      {/* Hero Section */}
      <section className="py-8 md:py-12 lg:py-16 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none dark:opacity-[0.04]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-30" />
        <div className="container flex flex-col items-center text-center relative z-10 gap-4 md:gap-8 max-w-screen-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-border/40 bg-muted/40 backdrop-blur-sm mb-2">
            <span className="text-xs font-medium">Transform videos into summaries</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
            Glimpse<span className="text-foreground">GPT</span>
          </h1>
          <p className="max-w-[42rem] text-muted-foreground text-lg sm:text-xl leading-normal">
            Transform your videos into concise, multilingual summaries with
            sentiment analysis in seconds
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <LanguageSelector />
            {/* <a href="#demo" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
              Try it now
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-move-down">
                <path d="M8 18L12 22L16 18" />
                <path d="M12 2V22" />
              </svg>
            </a> */}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 py-6 md:py-12" id="demo">
        <div className="container max-w-screen-2xl grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Video Upload and History */}
          <div className="md:col-span-5 lg:col-span-4 xl:col-span-3 space-y-6">
            <VideoUpload />
            <VideoHistory />
          </div>
          
          {/* Center/Right Column: Summary Display */}
          <div className="md:col-span-7 lg:col-span-8 xl:col-span-9 space-y-6">
            {processingError && !isProcessing && (
              <div className="w-full bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="mr-3 text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-destructive text-sm">Processing Error</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {processingError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <SummaryDisplay logMessages={logMessages} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-6">
        <div className="container max-w-screen-2xl flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GlimpseGPT. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}