'use client';

import { VideoUpload } from '@/components/video-upload';
import { LanguageSelector } from '@/components/language-selector';
import { SummaryDisplay } from '@/components/summary-display';
import { VideoHistory } from '@/components/video-history';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConnectionTest } from '@/components/connection-test';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          <section className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Video Summarizer
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl mt-3 max-w-2xl mx-auto">
                Transform your videos into concise, multilingual summaries with sentiment analysis
              </p>
              
              {/* Backend connection test (small and subtle) */}
              <div className="mt-3">
                <ConnectionTest />
              </div>
            </motion.div>
          </section>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <VideoUpload />
              <SummaryDisplay />
            </div>
            
            <div className="space-y-6">
              <LanguageSelector />
              <VideoHistory />
            </div>
          </div>
          
          <Separator className="my-8" />
          
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">Quick Summaries</h3>
              <p className="text-muted-foreground">Get the key points from any video in seconds</p>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">Multiple Languages</h3>
              <p className="text-muted-foreground">Support for English, Hindi, Tamil, and Marathi</p>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">Sentiment Analysis</h3>
              <p className="text-muted-foreground">Understand the emotional tone of your content</p>
            </div>
          </section>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}