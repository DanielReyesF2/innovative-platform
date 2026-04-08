import { useState } from 'react';
import { Lock, Unlock, CheckCircle2, ArrowRight } from 'lucide-react';
import { STAGE_GATES, KANBAN_STAGES, SERVICIOS_INNOVATIVE } from '@/lib/comercial-constants';
import type { GateMissingField } from '@/lib/comercial-constants';
import { useUpdateProspect } from '../api';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PendingMove } from '@shared/types/comercial';

interface Props {
  pendingMove: PendingMove;
  isHub?: boolean;
  onForce: () => void;
  onCancel: () => void;
}

export function StageGateModal({ pendingMove, isHub, onForce, onCancel }: Props) {
  const stages = KANBAN_STAGES;
  const stageLabel = stages.find(s => s.id === pendingMove.toStage)?.label || pendingMove.toStage;
  const gate = STAGE_GATES[pendingMove.toStage];
  const missingFields = gate?.missingFields(pendingMove.prospecto) || [];
  const canCompleteInline = missingFields.length > 0;

  const [formValues, setFormValues] = useState<Record<string, string | string[]>>(() => {
    const initial: Record<string, string | string[]> = {};
    for (const field of missingFields) {
      initial[field.key] = field.type === 'services' ? [] : '';
    }
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateProspect = useUpdateProspect();
  const { toast } = useToast();

  const set = (key: string, val: string) => setFormValues(prev => ({ ...prev, [key]: val }));

  const toggleService = (svcId: string) => {
    setFormValues(prev => {
      const currentServices = Array.isArray(prev.services) ? prev.services : [];
      const updated = currentServices.includes(svcId)
        ? currentServices.filter((s: string) => s !== svcId)
        : [...currentServices, svcId];
      return { ...prev, services: updated };
    });
  };

  const isFormValid = missingFields.every(field => {
    const val = formValues[field.key];
    if (field.type === 'services') return val && val.length > 0;
    return val && String(val).trim() !== '';
  });

  const handleCompleteAndAdvance = async () => {
    if (!isFormValid) return;
    setIsSaving(true);
    try {
      // Save missing fields AND advance stage in a single mutation to avoid race conditions
      await updateProspect.mutateAsync({
        id: pendingMove.prospecto.id,
        ...formValues,
        stage: pendingMove.toStage,
      });
      toast({ title: `Avanzado a ${stageLabel}` });
      onCancel();
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const fromStageLabel = stages.find(s => s.id === pendingMove.fromStage)?.label || pendingMove.fromStage;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 m-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${canCompleteInline ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <Lock className={canCompleteInline ? 'text-blue-600' : 'text-orange-600'} size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1c2c4a]">
              {canCompleteInline ? 'Completar para avanzar' : 'Candado de Calificación'}
            </h3>
            <p className="text-sm text-[#6b7280]">
              {canCompleteInline
                ? 'Completa los datos y avanza en un solo paso'
                : `No se puede mover a "${stageLabel}"`
              }
            </p>
          </div>
        </div>

        {/* Stage transition indicator */}
        {canCompleteInline && (
          <div className="flex items-center gap-2 text-sm text-[#6b7280] mb-4">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {fromStageLabel}
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {stageLabel}
            </span>
          </div>
        )}

        {/* Requirement message — shown when gate has no inline form */}
        {!canCompleteInline && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800 font-medium mb-2">
              {gate?.requirement}
            </p>
            <p className="text-sm text-orange-700">
              {gate?.message(pendingMove.prospecto)}
            </p>
          </div>
        )}

        {/* Inline form for missing fields */}
        {canCompleteInline && (
          <div className="space-y-3 mb-4">
            {missingFields.map(field => (
              <div key={field.key}>
                {field.type === 'services' ? (
                  <div>
                    <Label className="text-xs font-medium text-[#1c2c4a]">{field.label}</Label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SERVICIOS_INNOVATIVE.map(svc => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            formValues.services?.includes(svc.id)
                              ? 'bg-[#00a8a8] text-white'
                              : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                          }`}
                        >
                          {svc.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs font-medium text-[#1c2c4a]">{field.label}</Label>
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={e => set(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1"
                      autoFocus={missingFields[0].key === field.key}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Company info */}
        <div className="bg-[#f3f4f6] rounded-lg p-3 mb-4">
          <div className="text-sm font-semibold text-[#1c2c4a]">{pendingMove.prospecto.empresa}</div>
          <div className="text-xs text-[#6b7280]">{pendingMove.prospecto.industria} • {pendingMove.prospecto.ejecutivo}</div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {canCompleteInline && (
            <button
              onClick={handleCompleteAndAdvance}
              disabled={!isFormValid || isSaving}
              className="w-full px-4 py-2.5 bg-[#0067B0] hover:bg-[#005a9e] disabled:bg-[#93c5fd] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              {isSaving ? 'Guardando...' : `Completar y avanzar a ${stageLabel}`}
            </button>
          )}

          <div className={`flex gap-3 ${canCompleteInline ? 'pt-1' : ''}`}>
            <button
              onClick={onForce}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                canCompleteInline
                  ? 'text-orange-600 hover:bg-orange-50 border border-orange-200'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <Unlock size={14} />
              Forzar Movimiento
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1c2c4a] rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
