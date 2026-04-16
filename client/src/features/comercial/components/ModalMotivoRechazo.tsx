import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';
import { fmtCurrency } from '@/lib/utils';
import type { KanbanProspecto } from '@shared/types/comercial';

interface Props {
  prospecto: KanbanProspecto;
  onClose: () => void;
  onSave: (data: { motivoRechazo: number; motivoRechazoDetalle: string; fechaRechazo: string }) => void;
}

export function ModalMotivoRechazo({ prospecto, onClose, onSave }: Props) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [detalle, setDetalle] = useState('');

  const { data: rejectionReasons = [] } = useQuery<{ id: number; reason: string; category: string }[]>({
    queryKey: ['/api/comercial/rejection-reasons'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoSeleccionado) return;
    onSave({
      motivoRechazo: parseInt(motivoSeleccionado),
      motivoRechazoDetalle: detalle,
      fechaRechazo: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-[#1c2c4a]">Motivo de Rechazo</h3>
              <p className="text-sm text-[#6b7280] mt-1">{prospecto?.empresa}</p>
            </div>
            <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a]">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#1c2c4a] mb-2">Motivo de Rechazo *</label>
            <select
              value={motivoSeleccionado}
              onChange={(e) => setMotivoSeleccionado(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]"
              required
            >
              <option value="">Seleccione un motivo...</option>
              {rejectionReasons.map(motivo => (
                <option key={motivo.id} value={String(motivo.id)}>
                  {motivo.reason} ({motivo.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c2c4a] mb-2">Detalles adicionales</label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]"
              rows={4}
              placeholder="Proporcione información adicional sobre el rechazo..."
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Información importante</p>
                <p>
                  El registro del motivo de rechazo es obligatorio y ayudará a mejorar nuestros procesos comerciales.
                  Valor estimado de esta propuesta: {fmtCurrency(prospecto?.facturacionEstimada || prospecto?.propuesta?.ventaTotal || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 border border-[#e5e7eb] text-[#6b7280] rounded-lg hover:bg-[#f3f4f6] font-medium text-sm">
              Cancelar
            </button>
            <button type="submit"
              className="px-6 py-2.5 bg-[#00a8a8] text-white rounded-lg hover:bg-[#008080] font-medium text-sm">
              Guardar Motivo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
