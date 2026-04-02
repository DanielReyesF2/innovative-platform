import { X, TrendingUp, DollarSign, Target, ArrowRight } from 'lucide-react';
import { fmtK } from '@/lib/utils';
import { ExecutiveAvatar } from '@/lib/comercial-constants';
import type { TeamMember } from '@shared/types/comercial';

interface Props {
  member: TeamMember;
  onClose: () => void;
  onViewHub: () => void;
}

export function TeamMemberModal({ member, onClose, onViewHub }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
        <div className="bg-[#00a8a8] p-6 text-white rounded-t-lg">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <ExecutiveAvatar codigo={member.codigo} name={member.name} size="2xl" className="border-2 border-white/30" />
              <div>
                <h2 className="text-2xl font-semibold">{member.name}</h2>
                <p className="text-[#00b3b3] font-medium text-sm mt-1">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onViewHub}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ver Hub <ArrowRight size={14} />
              </button>
              <button onClick={onClose} className="text-white hover:text-[#00b3b3]">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Eficiencia Global</div>
              <div className="text-3xl font-semibold text-[#1c2c4a]">{member.eficienciaGlobal}%</div>
            </div>
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Tasa Conversión</div>
              <div className="text-3xl font-semibold text-[#1c2c4a]">{member.tasaConversion}%</div>
            </div>
            <div className="bg-[#f3f4f6] rounded-lg p-5 border border-[#e5e7eb] text-center">
              <div className="text-sm text-[#6b7280] font-medium mb-2">Cumplimiento Ppto.</div>
              <div className="text-2xl font-semibold text-[#1c2c4a]">{member.cumplimientoPresupuesto}%</div>
            </div>
          </div>

          <div className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <TrendingUp size={20} /> Presupuesto Detallado
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{member.leads}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Leads Activos</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{member.levantamientos}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Levantamientos</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#1c2c4a]">{member.propuestasEnviadas}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Propuestas</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-2xl font-semibold text-[#00a8a8]">{member.cierres}</div>
                <div className="text-xs text-[#6b7280] font-medium mt-1">Cierres</div>
              </div>
            </div>
          </div>

          <div className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <DollarSign size={20} /> Análisis Presupuestal
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-[#6b7280] font-medium mb-2">Presupuesto Mensual</div>
                <div className="text-2xl font-semibold text-[#1c2c4a]">
                  {fmtK(member.presupuestoMensual)}
                </div>
              </div>
              <div>
                <div className="text-sm text-[#6b7280] font-medium mb-2">Ventas Reales</div>
                <div className="text-2xl font-semibold text-[#1c2c4a]">
                  {fmtK(member.ventasReales)}
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border border-[#e5e7eb]">
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1c2c4a]">Cumplimiento:</span>
                <span className={`text-xl font-semibold ${member.cumplimientoPresupuesto >= 100 ? 'text-[#00a8a8]' : 'text-orange-600'}`}>
                  {member.cumplimientoPresupuesto}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#f3f4f6] rounded-lg p-6 border border-[#e5e7eb]">
            <h3 className="text-lg font-semibold text-[#1c2c4a] mb-4 flex items-center gap-2">
              <Target size={20} /> KPIs de Desempeño
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Tiempo Respuesta</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{member.tiempoRespuesta}</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Satisfacción Cliente</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{member.satisfaccionCliente}/5.0</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-[#e5e7eb]">
                <div className="text-xs text-[#6b7280] font-medium mb-2">Actividades/Semana</div>
                <div className="text-xl font-semibold text-[#1c2c4a]">{member.activitiesSemanal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
