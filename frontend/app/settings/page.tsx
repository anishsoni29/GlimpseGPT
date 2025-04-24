'use client';

import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Settings, Moon, Sun, Monitor, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/language-selector';

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Appearance
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                onClick={() => setTheme('system')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                System
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              Language Preferences
            </h2>
            <LanguageSelector />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-destructive">
              Danger Zone
            </h2>
            <div className="space-y-2">
              <Button variant="destructive">
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}