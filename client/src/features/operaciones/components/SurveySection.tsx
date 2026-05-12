import { AlertCircle, Check, ChevronDown, Lock } from "lucide-react";

interface SurveySectionProps {
  title: string;
  sectionNumber: number;
  completionText?: string; // e.g. "4/4" or "2 items"
  completionStatus?: "complete" | "partial" | "empty" | "locked";
  isOpen: boolean;
  onToggle: () => void;
  locked?: boolean;
  children: React.ReactNode;
}

export default function SurveySection({
  title,
  sectionNumber,
  completionText,
  completionStatus = "empty",
  isOpen,
  onToggle,
  locked = false,
  children,
}: SurveySectionProps) {
  const statusIcon = () => {
    if (locked) return <Lock className="h-4 w-4 text-muted-foreground" />;
    switch (completionStatus) {
      case "complete":
        return <Check className="h-4 w-4 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const statusColor = () => {
    if (locked) return "text-muted-foreground";
    switch (completionStatus) {
      case "complete":
        return "text-green-600";
      case "partial":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={locked ? undefined : onToggle}
        className={`flex w-full items-center justify-between p-4 text-left transition-colors ${
          locked ? "bg-muted/50 cursor-not-allowed" : isOpen ? "bg-accent/50" : "hover:bg-accent/30"
        }`}
        disabled={locked}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-0" : "-rotate-90"
            } ${locked ? "opacity-0" : ""}`}
          />
          <span className="font-medium">
            {sectionNumber}. {title}
          </span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${statusColor()}`}>
          {completionText && <span>{completionText}</span>}
          {statusIcon()}
        </div>
      </button>
      {isOpen && !locked && <div className="border-t p-4 space-y-4">{children}</div>}
    </div>
  );
}
