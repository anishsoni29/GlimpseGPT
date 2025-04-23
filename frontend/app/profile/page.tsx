'use client';

import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { User, Lock, Mail, Calendar, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-6 border border-border/40 bg-card shadow-lg rounded-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-primary to-violet-500 flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {user?.email || 'Guest User'}
            </h2>
            <p className="text-muted-foreground">Premium Member</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/20">
                <Mail className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/20">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Member Since</p>
                  <p className="text-muted-foreground">
                    {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="w-full gap-2 hover:bg-primary/5 transition-colors border-border/20"
                onClick={() => {/* Add settings navigation */}}
              >
                <Settings className="h-4 w-4 text-foreground" />
                <span className="text-foreground">Account Settings</span>
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 hover:bg-red-500/10 transition-colors text-red-500 border-border/20"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}