"use client";

import * as React from "react";
import { Check, Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Match the languages supported by the backend
const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi" },
  { value: "Tamil", label: "Tamil" },
  { value: "Marathi", label: "Marathi" },
];

interface LanguageSelectorProps {
  onChange?: (language: string) => void;
}

export function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const [language, setLanguage] = React.useState("English");

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    if (onChange) {
      onChange(value);
    }
    // You could also store the selected language in localStorage
    localStorage.setItem('preferredLanguage', value);
  };

  // Load preferred language from localStorage on component mount
  React.useEffect(() => {
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage) {
      setLanguage(storedLanguage);
    }
  }, []);

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Languages className="h-5 w-5 text-muted-foreground" />
          <Label htmlFor="language" className="text-base font-medium">
            Summary Language
          </Label>
        </div>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger id="language" className="bg-background">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}