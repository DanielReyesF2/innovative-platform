import { useState } from "react";
import { Bot, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NovaChat } from "./NovaChat";

export function NovaFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex flex-col rounded-lg border bg-background shadow-xl transition-all",
            isExpanded
              ? "h-[700px] w-[600px]"
              : "h-[500px] w-[400px]",
            "max-sm:bottom-0 max-sm:right-0 max-sm:h-[calc(100vh-6rem)] max-sm:w-full max-sm:rounded-none"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              Nova AI
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hidden sm:inline-flex"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-hidden">
            <NovaChat mode="widget" />
          </div>
        </div>
      )}

      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          isOpen && "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>
    </>
  );
}
