import { Check, Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

type SaveFn<T> = (value: T) => Promise<void>;

// ─── Shared state hook ────────────────────────────────────────────────
function useInlineEdit<T>(initialValue: T, onSave: SaveFn<T>, equals: (a: T, b: T) => boolean = Object.is) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [saving, setSaving] = useState(false);
  const committedRef = useRef<T>(initialValue);

  useEffect(() => {
    if (!editing) {
      committedRef.current = initialValue;
      setValue(initialValue);
    }
  }, [initialValue, editing]);

  const start = useCallback(() => {
    setValue(committedRef.current);
    setEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setValue(committedRef.current);
    setEditing(false);
  }, []);

  const save = useCallback(
    async (next?: T) => {
      const target = next !== undefined ? next : value;
      if (equals(target, committedRef.current)) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        await onSave(target);
        committedRef.current = target;
        setValue(target);
      } catch {
        // Revert AND tell the user — a silent revert looked like a successful save (H6).
        setValue(committedRef.current);
        toast({
          title: "No se pudo guardar el cambio",
          description: "Revisa tu conexión e intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
        setEditing(false);
      }
    },
    [value, onSave, equals, toast],
  );

  return { editing, value, setValue, saving, start, cancel, save };
}

// ─── Display wrapper (shared button/hover look for read mode) ─────────
function DisplayButton({
  onClick,
  saving,
  children,
  className = "",
  showPencil = true,
}: {
  onClick: () => void;
  saving: boolean;
  children: React.ReactNode;
  className?: string;
  showPencil?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 text-left transition-colors hover:bg-[#f3f4f6] ${className}`}
    >
      {children}
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin text-[#9ca3af]" />
      ) : showPencil ? (
        <Pencil className="h-3 w-3 text-[#9ca3af] opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : null}
    </button>
  );
}

// ─── InlineText ───────────────────────────────────────────────────────
interface InlineTextProps {
  value: string;
  onSave: SaveFn<string>;
  placeholder?: string;
  emptyLabel?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  type?: "text" | "email" | "tel";
}

export function InlineText({
  value,
  onSave,
  placeholder,
  emptyLabel,
  multiline,
  className = "",
  displayClassName = "",
  type = "text",
}: InlineTextProps) {
  const {
    editing,
    value: v,
    setValue,
    saving,
    start,
    cancel,
    save,
  } = useInlineEdit<string>(value || "", async (next) => {
    await onSave(next.trim());
  });

  if (editing) {
    if (multiline) {
      return (
        <textarea
          value={v}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save()}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          rows={3}
          className={`w-full rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30 ${className}`}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        type={type}
        value={v}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        placeholder={placeholder}
        className={`rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30 ${className}`}
      />
    );
  }

  return (
    <DisplayButton onClick={start} saving={saving} className={displayClassName}>
      {v ? (
        <span className="truncate">{v}</span>
      ) : (
        <span className="italic text-[#9ca3af]">{emptyLabel || placeholder || "—"}</span>
      )}
    </DisplayButton>
  );
}

// ─── InlineNumber ─────────────────────────────────────────────────────
interface InlineNumberProps {
  value: number | null | undefined;
  onSave: SaveFn<number | null>;
  placeholder?: string;
  emptyLabel?: string;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
  displayClassName?: string;
  formatter?: (n: number) => string;
}

export function InlineNumber({
  value,
  onSave,
  placeholder,
  emptyLabel,
  min,
  max,
  suffix,
  className = "",
  displayClassName = "",
  formatter,
}: InlineNumberProps) {
  const initial = value == null ? "" : String(value);
  const {
    editing,
    value: v,
    setValue,
    saving,
    start,
    cancel,
    save,
  } = useInlineEdit<string>(initial, async (next) => {
    const trimmed = next.trim();
    if (trimmed === "") {
      await onSave(null);
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num)) {
      await onSave(null);
      return;
    }
    await onSave(num);
  });

  if (editing) {
    return (
      <input
        type="number"
        value={v}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        min={min}
        max={max}
        placeholder={placeholder}
        className={`w-24 rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30 ${className}`}
      />
    );
  }

  const display =
    value == null ? (
      <span className="italic text-[#9ca3af]">{emptyLabel || placeholder || "—"}</span>
    ) : (
      <span>
        {formatter ? formatter(value) : value}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );

  return (
    <DisplayButton onClick={start} saving={saving} className={displayClassName}>
      {display}
    </DisplayButton>
  );
}

// ─── InlineSelect ─────────────────────────────────────────────────────
interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: { value: T; label: string; badgeClass?: string }[];
  onSave: SaveFn<T>;
  emptyLabel?: string;
  displayClassName?: string;
}

export function InlineSelect<T extends string>({
  value,
  options,
  onSave,
  emptyLabel,
  displayClassName = "",
}: InlineSelectProps<T>) {
  const {
    editing,
    value: v,
    saving,
    start,
    cancel,
    save,
  } = useInlineEdit<T | "">((value ?? "") as T | "", async (next) => {
    if (next) await onSave(next as T);
  });

  if (editing) {
    return (
      <select
        value={v}
        onChange={(e) => save(e.target.value as T)}
        onBlur={() => cancel()}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        className="rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  const selected = options.find((o) => o.value === value);
  const display = selected ? (
    selected.badgeClass ? (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.badgeClass}`}>{selected.label}</span>
    ) : (
      <span>{selected.label}</span>
    )
  ) : (
    <span className="italic text-[#9ca3af]">{emptyLabel || "—"}</span>
  );

  return (
    <DisplayButton onClick={start} saving={saving} className={displayClassName}>
      {display}
    </DisplayButton>
  );
}

// ─── InlineDate ──────────────────────────────────────────────────────
// value format: "YYYY-MM-DD"
interface InlineDateProps {
  value: string | null | undefined;
  onSave: SaveFn<string | null>;
  emptyLabel?: string;
  displayClassName?: string;
}

export function InlineDate({ value, onSave, emptyLabel, displayClassName = "" }: InlineDateProps) {
  const {
    editing,
    value: v,
    setValue,
    saving,
    start,
    cancel,
    save,
  } = useInlineEdit<string>(value || "", async (next) => {
    await onSave(next || null);
  });

  if (editing) {
    return (
      <input
        type="date"
        value={v}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        className="rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30"
      />
    );
  }

  const formatted = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <DisplayButton onClick={start} saving={saving} className={displayClassName}>
      {formatted ? <span>{formatted}</span> : <span className="italic text-[#9ca3af]">{emptyLabel || "—"}</span>}
    </DisplayButton>
  );
}

// ─── InlineMonth ──────────────────────────────────────────────────────
// value format: "YYYY-MM"
interface InlineMonthProps {
  value: string | null | undefined;
  onSave: SaveFn<string | null>;
  emptyLabel?: string;
  displayClassName?: string;
}

const MESES_MAP: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
};

export function InlineMonth({ value, onSave, emptyLabel, displayClassName = "" }: InlineMonthProps) {
  const {
    editing,
    value: v,
    setValue,
    saving,
    start,
    cancel,
    save,
  } = useInlineEdit<string>(value || "", async (next) => {
    await onSave(next || null);
  });

  if (editing) {
    return (
      <input
        type="month"
        value={v}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        className="rounded-md border border-[#00a8a8] bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#00a8a8]/30"
      />
    );
  }

  const formatted = (() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length >= 2) return `${MESES_MAP[parts[1]] || parts[1]} ${parts[0]}`;
    return value;
  })();

  return (
    <DisplayButton onClick={start} saving={saving} className={displayClassName}>
      {formatted ? <span>{formatted}</span> : <span className="italic text-[#9ca3af]">{emptyLabel || "—"}</span>}
    </DisplayButton>
  );
}

// ─── InlineChips (multi-select) ───────────────────────────────────────
interface InlineChipsProps<T extends string> {
  value: T[];
  options: { value: T; label: string }[];
  onSave: SaveFn<T[]>;
  emptyLabel?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function InlineChips<T extends string>({
  value,
  options,
  onSave,
  emptyLabel,
  activeClassName = "bg-[#00a8a8] text-white",
  inactiveClassName = "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]",
}: InlineChipsProps<T>) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localValue, setLocalValue] = useState<T[]>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const toggle = async (v: T) => {
    const next = localValue.includes(v) ? localValue.filter((x) => x !== v) : [...localValue, v];
    setLocalValue(next);
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      // Revert AND notify — silent revert hid failed saves (H6).
      setLocalValue(value);
      toast({
        title: "No se pudo guardar el cambio",
        description: "Revisa tu conexión e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {options.map((opt) => {
        const active = localValue.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={saving}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${active ? activeClassName : inactiveClassName} ${saving ? "opacity-60" : ""}`}
          >
            {active && <Check className="inline h-3 w-3 mr-1" />}
            {opt.label}
          </button>
        );
      })}
      {localValue.length === 0 && emptyLabel && <span className="text-xs italic text-[#9ca3af]">{emptyLabel}</span>}
    </div>
  );
}
