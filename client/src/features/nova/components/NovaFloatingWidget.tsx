import { useState } from "react";
import { Bot, X, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NovaFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col rounded-lg border bg-background shadow-xl w-[380px] max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:rounded-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              Nova AI
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Coming soon content */}
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              Funcionalidad Premium
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Nova AI es un asistente inteligente que analiza tus datos comerciales, genera reportes y responde preguntas en tiempo real.
            </p>
            <a
              href="mailto:daniel@econova.com.mx?subject=Interesado%20en%20Nova%20AI%20para%20Innovative"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contactar a EcoNova
            </a>
            <p className="text-[11px] text-muted-foreground mt-4">
              daniel@econova.com.mx
            </p>
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
