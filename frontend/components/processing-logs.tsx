'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Info, Terminal, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProcessingLogProps {
  messages?: string[];
}

interface LogEntry {
  message: string;
  timestamp: Date;
  type: 'info' | 'error' | 'warning' | 'success';
}

export function ProcessingLogs({ messages = [] }: ProcessingLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Process incoming messages and determine log type
  useEffect(() => {
    const processedLogs = messages.map(message => {
      let logType: 'info' | 'error' | 'warning' | 'success' = 'info';
      
      // Determine log type based on message content
      if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        logType = 'error';
      } else if (message.toLowerCase().includes('warning')) {
        logType = 'warning';
      } else if (message.toLowerCase().includes('complete') || message.toLowerCase().includes('success')) {
        logType = 'success';
      }
      
      return {
        message,
        timestamp: new Date(),
        type: logType
      };
    });
    
    setLogs(processedLogs);
  }, [messages]);
  
  // Auto-scroll to bottom when new logs come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  if (logs.length === 0) return null;
  
  return (
    <Card className="bg-card/50 border border-border/50 overflow-hidden transition-all">
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Processing Logs</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{logs.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
          {expanded ? <X className="h-4 w-4" /> : <div className="h-4 w-4 flex flex-col justify-center">⋯</div>}
        </Button>
      </div>
      
      {expanded ? (
        <ScrollArea className="h-48" ref={scrollRef}>
          <div className="p-3 space-y-2 text-sm">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="mt-0.5">
                  {log.type === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {log.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {log.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {log.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                  <div className={`text-sm ${
                    log.type === 'error' ? 'text-destructive' : 
                    log.type === 'warning' ? 'text-amber-500' : 
                    log.type === 'success' ? 'text-green-500' : 
                    'text-foreground'
                  }`}>
                    {log.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="p-3 text-xs text-muted-foreground">
          {logs[logs.length - 1].message}
        </div>
      )}
    </Card>
  );
} 