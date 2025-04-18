'use client';

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

const statusVariants = cva(
  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2",
  {
    variants: {
      variant: {
        default: "bg-background/50 text-foreground",
        success: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/40",
        error: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/40",
        warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/40",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40",
        loading: "bg-primary/5 text-foreground/80 border border-border/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  isVisible?: boolean;
  message?: string;
  icon?: React.ReactNode;
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, variant, isVisible = true, message, icon, children, ...props }, ref) => {
    const getDefaultIcon = () => {
      switch (variant) {
        case "success":
          return <CheckCircle className="h-4 w-4" />;
        case "error":
          return <XCircle className="h-4 w-4" />;
        case "warning":
          return <AlertCircle className="h-4 w-4" />;
        case "info":
          return <AlertCircle className="h-4 w-4" />;
        case "loading":
          return <Loader2 className="h-4 w-4 animate-spin" />;
        default:
          return null;
      }
    };

    if (!isVisible) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(statusVariants({ variant }), className)}
        {...props}
      >
        {icon || getDefaultIcon()}
        <span>{message || children}</span>
      </div>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";

export { StatusIndicator }; 