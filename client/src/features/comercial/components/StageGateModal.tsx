import { Lock, Unlock } from 'lucide-react';
import { STAGE_GATES, KANBAN_STAGES, HUB_KANBAN_STAGES } from '@/lib/comercial-constants';

interface Props {
  pendingMove: { prospecto: any; fromStage: string; toStage: string };
  isHub?: boolean;
  onForce: () => void;
  onCancel: () => void;
}

export function StageGateModal({ pendingMove, isHub, onForce, onCancel }: Props) {
  const stages = isHub ? HUB_KANBAN_STAGES : KANBAN_STAGES;
  const stageLabel = stages.find(s => s.id === pendingMove.toStage)?.label || pendingMove.toStage;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Lock className="text-orange-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1c2c4a]">Candado de Calificación</h3>
            <p className="text-sm text-[#6b7280]">No se puede mover a "{stageLabel}"</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-orange-800 font-medium mb-2">
            {STAGE_GATES[pendingMove.toStage]?.requirement}
          </p>
          <p className="text-sm text-orange-700">
            {STAGE_GATES[pendingMove.toStage]?.message(pendingMove.prospecto)}
          </p>
        </div>

        <div className="bg-[#f3f4f6] rounded-lg p-3 mb-4">
          <div className="text-sm font-semibold text-[#1c2c4a]">{pendingMove.prospecto.empresa}</div>
          <div className="text-xs text-[#6b7280]">{pendingMove.prospecto.industria} • {pendingMove.prospecto.ejecutivo}</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onForce}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
  );
}
