"use client";

import { useEffect, useState } from "react";
import { 
  Globe, 
  Check,
  ChevronDown,
  Languages
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
  { code: "English", name: "English", flag: "🇺🇸" },
  { code: "Hindi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "Tamil", name: "தமிழ்", flag: "🇮🇳" },
  { code: "Marathi", name: "मराठी", flag: "🇮🇳" },
];

export function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isOpen, setIsOpen] = useState(false);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    localStorage.setItem('preferredLanguage', value);
    
    // Notify other components about the language change
    window.dispatchEvent(new Event('languageChange'));
  };

  return (
    <div className="relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="backdrop-blur-xl bg-black/30 p-6 rounded-xl border border-white/10 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5 }}
            className="rounded-full bg-indigo-500/20 p-2"
          >
            <Languages className="h-5 w-5 text-indigo-400" />
          </motion.div>
          <span className="text-lg font-semibold text-white">Translation Language</span>
        </div>
        
        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger 
            className="w-full bg-black/40 border-white/10 text-white backdrop-blur-md transition-all hover:bg-black/60 focus:ring-indigo-500/50"
            onClick={() => setIsOpen(!isOpen)}
          >
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-xl">{languages.find(l => l.code === selectedLanguage)?.flag}</span>
                <span>{languages.find(l => l.code === selectedLanguage)?.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
            <SelectGroup>
              {languages.map((language) => (
                <SelectItem 
                  key={language.code} 
                  value={language.code}
                  className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                >
                  <motion.div 
                    initial={{ opacity: 0.5, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xl">{language.flag}</span>
                    <span>{language.name}</span>
                  </motion.div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <p className="text-white/60 text-sm mt-4">
          Choose the language for your summaries and analysis
        </p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex justify-end"
        >
          <a 
            href="#demo" 
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <span>Try it now</span>
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
            </motion.div>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}