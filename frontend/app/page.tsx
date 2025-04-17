'use client';

import { VideoUpload } from '@/components/video-upload';
import { LanguageSelector } from '@/components/language-selector';
import { SummaryDisplay } from '@/components/summary-display';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConnectionTest } from '@/components/connection-test';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <section className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Video Summarizer
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl mt-4 max-w-2xl mx-auto">
                Transform your videos into concise, multilingual summaries with sentiment analysis and text-to-speech
              </p>
              
              {/* Backend connection test */}
              <div className="mt-4">
                <ConnectionTest />
              </div>
            </motion.div>
          </section>
          
          <div className="grid gap-6">
            <VideoUpload />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LanguageSelector />
            </div>
            <SummaryDisplay />
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}