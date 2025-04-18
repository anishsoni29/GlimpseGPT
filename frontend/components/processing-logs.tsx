'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessingLogsProps {
  messages: string[];
}

export function ProcessingLogs({ messages }: ProcessingLogsProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg border border-border/40 bg-card/80"
        onClick={() => setIsOpen(true)}
      >
        <Terminal className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="relative border border-border/40 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between bg-card p-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Processing Logs</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full"
          onClick={() => setIsOpen(false)}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="h-[200px] p-3 bg-card/50 backdrop-blur-sm overflow-auto" ref={scrollRef}>
        <div className="space-y-1 font-mono text-xs">
          {messages.length > 0 ? (
            messages.map((message, i) => (
              <div key={i} className="flex">
                <span className="text-primary/70 mr-2">&gt;</span>
                <span className="text-muted-foreground">{message}</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic">No processing logs yet</div>
          )}
        </div>
      </div>
    </Card>
  );
} 