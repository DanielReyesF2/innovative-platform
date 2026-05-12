import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

interface Props {
  data: string | null;
  onSave: (observations: string) => void;
  disabled?: boolean;
}

export default function ObservacionesSection({ data, onSave, disabled }: Props) {
  const [text, setText] = useState(data || "");

  useEffect(() => {
    setText(data || "");
  }, [data]);

  const handleChange = (value: string) => {
    setText(value);
    onSave(value);
  };

  return (
    <div className="space-y-2">
      <Label>Observaciones generales del levantamiento</Label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={6}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Observaciones, notas adicionales, recomendaciones..."
      />
    </div>
  );
}
