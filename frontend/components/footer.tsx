'use client';

import { Github, Twitter, Youtube, Mail, Heart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t bg-card/50 mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Glimpse</h3>
            <p className="text-sm text-muted-foreground">
              Transform videos into concise, multilingual summaries with advanced sentiment analysis.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Connect</h3>
            <div className="flex space-x-4">
              <motion.a
                href="#"
                whileHover={{ y: -3 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github size={20} />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ y: -3 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter size={20} />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ y: -3 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Youtube size={20} />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ y: -3 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail size={20} />
              </motion.a>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Glimpse. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center">
            Made with <Heart size={14} className="text-red-500 mx-1" /> by the Glimpse Team
          </p>
        </div>
      </div>
    </footer>
  );
}