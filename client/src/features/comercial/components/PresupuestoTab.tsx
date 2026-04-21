import { useState, useEffect } from 'react';
import { DollarSign, Edit3, Pencil, X, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { fmtM, fmtCurrency } from '@/lib/utils';
import { ExecutiveAvatar, KANBAN_STAGES } from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest, invalidateByPrefix } from '@/lib/queryClient';

// Recharts label renderer: hide label when value is 0 so bars without data
// stay clean. Formats the rest as "$11.0M" (compact) matching tooltip.
// Recharts passes SVG props where x/y can be string | number, so we coerce.
function BarValueLabel(props: { x?: string | number; y?: string | number; width?: string | number; value?: string | number; fill?: string }) {
  const { x = 0, y = 0, width = 0, value = 0, fill = '#1c2c4a' } = props;
  const numValue = Number(value) || 0;
  if (numValue <= 0) return null;
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numW = Number(width) || 0;
  return (
    <text
      x={numX + numW / 2}
      y={numY - 4}
      textAnchor="middle"
      fill={fill}
      fontSize={9}
      fontWeight={600}
    >
      {fmtM(numValue, 1)}
    </text>
  );
}

export function PresupuestoTab() {
  const {
    kanbanProspectos,
    salesTeamData,
    presupuestoEvolution,
    ventasRealesEditadas,
    setVentasRealesEditadas,
    authUser,
  } = useComercialData();
  const { toast } = useToast();

  const [editingVentaReal, setEditingVentaReal] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetEditValue, setBudgetEditValue] = useState<string>('');
  const [ventaRealMes, setVentaRealMes] = useState(new Date().getMonth() + 1);
  const [ventaRealAño, setVentaRealAño] = useState(new Date().getFullYear());
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const [quarterFilter, setQuarterFilter] = useState<string>(currentQuarter);
  const [cuentasSubTab, setCuentasSubTab] = useState<'ejecutivo' | 'pipeline'>('pipeline');

  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const canEditBudget = authUser?.role === 'admin' || authUser?.role === 'director';

  const MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = MESES_NOMBRE[ventaRealMes - 1];

  return (
    <>
      {/* Presupuesto Chart */}
      <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
            <DollarSign size={16} className="text-[#00a8a8]" />
            Presupuesto Mensual 2026 · Valor Cotización · Venta Real
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#1B5E20] inline-block" /> Presupuesto</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#0D47A1] inline-block" /> Valor Cotización</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#00a8a8] inline-block" /> Venta Real</span>
            </div>
            {canEditBudget && (
              <button
                onClick={() => setShowBudgetModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors"
              >
                <Pencil size={10} /> Editar Objetivos
              </button>
            )}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={presupuestoEvolution} barGap={2} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtM(v, 0)} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value: number, name: string) => [fmtM(value), name]}
              labelStyle={{ fontWeight: 600, color: '#1c2c4a' }}
            />
            <Bar dataKey="presupuesto" name="Presupuesto" fill="#1B5E20" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="presupuesto" content={(p) => <BarValueLabel {...p} fill="#1B5E20" />} />
            </Bar>
            <Bar dataKey="cotizacion" name="Valor Cotización" fill="#0D47A1" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="cotizacion" content={(p) => <BarValueLabel {...p} fill="#0D47A1" />} />
            </Bar>
            <Bar dataKey="real" name="Venta Real" fill="#00a8a8" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="real" content={(p) => <BarValueLabel {...p} fill="#00a8a8" />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Combined: Presupuesto y Cuentas */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-[#00a8a8]" />
            <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Presupuesto y Cuentas</h4>
          </div>
          <div className="flex items-center gap-1 bg-[#f3f4f6] rounded-lg p-0.5">
            <button
              onClick={() => setCuentasSubTab('ejecutivo')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${cuentasSubTab === 'ejecutivo' ? 'bg-white text-[#1c2c4a] shadow-sm' : 'text-[#6b7280] hover:text-[#1c2c4a]'}`}
            >
              Por Ejecutivo
            </button>
            <button
              onClick={() => setCuentasSubTab('pipeline')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${cuentasSubTab === 'pipeline' ? 'bg-white text-[#1c2c4a] shadow-sm' : 'text-[#6b7280] hover:text-[#1c2c4a]'}`}
            >
              Pipeline de Cierre
            </button>
          </div>
        </div>

        {cuentasSubTab === 'ejecutivo' && (
        <div>
        <div className="flex items-center justify-end gap-2 mb-3">
            <select value={ventaRealMes} onChange={(e) => setVentaRealMes(Number(e.target.value))}
              className="text-xs border border-[#e5e7eb] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00a8a8]">
              {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={ventaRealAño} onChange={(e) => setVentaRealAño(Number(e.target.value))}
              className="text-xs border border-[#e5e7eb] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00a8a8]">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Ejecutivo</th>
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Presupuesto {mesNombre}</th>
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Venta Cerrada {mesNombre}</th>
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">%</th>
                <th className="text-center py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase w-20"></th>
              </tr>
            </thead>
            <tbody>
              {salesTeamData.filter(m => m.presupuestoAnual2026 > 0).map(member => {
                const selectedPeriod = `${ventaRealAño}-${String(ventaRealMes).padStart(2, '0')}`;
                const memberBudgetMes = member.presupuestosMensuales?.[selectedPeriod] || 0;
                const editKey = `${member.id}-${ventaRealMes}-${ventaRealAño}`;
                const isEditing = editingVentaReal === editKey;
                const ventaActual = ventasRealesEditadas[editKey] ?? 0;
                const pctVal = memberBudgetMes > 0 ? Math.round((Number(ventaActual) / memberBudgetMes) * 100) : 0;
                const pctColor = pctVal >= 80 ? '#2E7D32' : pctVal >= 40 ? '#F57C00' : '#EF4444';

                return (
                  <tr key={member.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <ExecutiveAvatar codigo={member.codigo} name={member.name} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-[#1c2c4a]">{member.name.split(' ').slice(0, 2).join(' ')}</div>
                          {member.zona && <div className="text-[10px] text-[#9ca3af]">{member.zona}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {editingBudget === editKey ? (
                        <input
                          type="number"
                          autoFocus
                          value={budgetEditValue}
                          onChange={(e) => setBudgetEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const monto = Number(budgetEditValue) || 0;
                              setEditingBudget(null);
                              apiRequest('PATCH', '/api/comercial/sales-metrics', { userId: member.dbUserId, period: selectedPeriod, monthlyBudget: monto })
                                .then(() => {
                                  invalidateByPrefix('/api/comercial/team');
                                  invalidateByPrefix('/api/comercial/sales-metrics');
                                  toast({ title: `Presupuesto actualizado: $${monto.toLocaleString()}` });
                                })
                                .catch(() => toast({ title: 'Error al guardar presupuesto', variant: 'destructive' }));
                            } else if (e.key === 'Escape') {
                              setEditingBudget(null);
                            }
                          }}
                          onBlur={() => {
                            const monto = Number(budgetEditValue) || 0;
                            setEditingBudget(null);
                            if (monto !== memberBudgetMes) {
                              apiRequest('PATCH', '/api/comercial/sales-metrics', { userId: member.dbUserId, period: selectedPeriod, monthlyBudget: monto })
                                .then(() => {
                                  invalidateByPrefix('/api/comercial/team');
                                  invalidateByPrefix('/api/comercial/sales-metrics');
                                  toast({ title: `Presupuesto actualizado: $${monto.toLocaleString()}` });
                                })
                                .catch(() => toast({ title: 'Error al guardar presupuesto', variant: 'destructive' }));
                            }
                          }}
                          className="w-28 px-2 py-1 text-sm text-right border border-[#7C3AED] rounded focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                          placeholder="0"
                        />
                      ) : (
                        <span
                          className={`text-sm text-[#6b7280] ${canEditBudget ? 'cursor-pointer hover:text-[#7C3AED] hover:underline' : ''}`}
                          onClick={() => {
                            if (!canEditBudget) return;
                            setEditingBudget(editKey);
                            setBudgetEditValue(String(memberBudgetMes || ''));
                          }}
                          title={canEditBudget ? 'Click para editar presupuesto' : undefined}
                        >
                          {fmtCurrency(memberBudgetMes)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          autoFocus
                          value={ventasRealesEditadas[editKey] ?? ''}
                          onChange={(e) => setVentasRealesEditadas((prev) => ({ ...prev, [editKey]: parseFloat(e.target.value) || 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const monto = Number(ventasRealesEditadas[editKey] || 0);
                              setVentasRealesEditadas((prev) => ({ ...prev, [editKey]: monto }));
                              setEditingVentaReal(null);
                              apiRequest('POST', '/api/comercial/ventas-reales', { userId: member.dbUserId, mes: ventaRealMes, año: ventaRealAño, monto })
                                .then(() => {
                                  invalidateByPrefix('/api/comercial/ventas-reales');
                                  invalidateByPrefix('/api/comercial/team');
                                  toast({ title: `Venta cerrada guardada: $${monto.toLocaleString()}` });
                                })
                                .catch(() => {
                                  toast({ title: 'Error al guardar', variant: 'destructive' });
                                });
                            } else if (e.key === 'Escape') {
                              setVentasRealesEditadas((prev) => { const n = { ...prev }; delete n[editKey]; return n; });
                              setEditingVentaReal(null);
                            }
                          }}
                          onBlur={() => {
                            const monto = Number(ventasRealesEditadas[editKey] || 0);
                            setVentasRealesEditadas((prev) => ({ ...prev, [editKey]: monto }));
                            setEditingVentaReal(null);
                            if (monto > 0) {
                              apiRequest('POST', '/api/comercial/ventas-reales', { userId: member.dbUserId, mes: ventaRealMes, año: ventaRealAño, monto })
                                .then(() => {
                                  invalidateByPrefix('/api/comercial/ventas-reales');
                                  invalidateByPrefix('/api/comercial/team');
                                  toast({ title: `Venta cerrada guardada: $${monto.toLocaleString()}` });
                                })
                                .catch(() => {
                                  toast({ title: 'Error al guardar', variant: 'destructive' });
                                });
                            }
                          }}
                          className="w-24 px-2 py-1 text-sm text-right border border-[#00a8a8] rounded focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#00a8a8]">{fmtCurrency(ventaActual)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="text-sm font-bold" style={{ color: pctColor }}>{pctVal}%</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingVentaReal(editKey);
                            setVentasRealesEditadas((prev) => ({ ...prev, [editKey]: ventaActual || 0 }));
                          }}
                          className="text-[#00a8a8] hover:bg-[#00a8a8]/10 p-1.5 rounded-lg transition-colors"
                          title="Editar venta cerrada"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const sp = `${ventaRealAño}-${String(ventaRealMes).padStart(2, '0')}`;
                const totalPres = salesTeamData.reduce((s, m) => s + (m.presupuestosMensuales?.[sp] || 0), 0);
                const totalReal = salesTeamData.reduce((s, m) => s + Number(ventasRealesEditadas[`${m.id}-${ventaRealMes}-${ventaRealAño}`] ?? 0), 0);
                const pct = totalPres > 0 ? Math.round((totalReal / totalPres) * 100) : 0;
                const pctColor = pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#EF4444';
                return (
                  <tr className="bg-[#f9fafb]">
                    <td className="py-2.5 px-2 font-semibold text-[#1c2c4a]">Total Equipo</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-[#1c2c4a]">
                      {fmtCurrency(totalPres)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#00a8a8]">
                      {fmtCurrency(totalReal)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold" style={{ color: pctColor }}>{pct}%</td>
                    <td></td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
        <p className="text-[10px] text-[#9ca3af] mt-3 flex items-center gap-1">
          <Edit3 size={10} /> Click en el icono de lápiz para editar la venta cerrada. Presiona Enter para guardar.
        </p>
        </div>
        )}

        {cuentasSubTab === 'pipeline' && (() => {
        const QUARTER_MONTHS: Record<string, number[]> = {
          Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12],
        };
        const allCuentas = kanbanProspectos
          .filter(p => p.estimatedCloseTime && p.status !== 'cierre_perdido')
          .sort((a, b) => (a.estimatedCloseTime || '').localeCompare(b.estimatedCloseTime || ''));
        const cuentas = quarterFilter === 'all'
          ? allCuentas
          : allCuentas.filter(p => {
              const month = parseInt(p.estimatedCloseTime?.split('-')[1] || '0', 10);
              return QUARTER_MONTHS[quarterFilter]?.includes(month);
            });
        const totalCuentasValor = cuentas.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);

        const MESES_MAP: Record<string, string> = {
          '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
          '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
          '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
        };

        const formatMesCierre = (val: string | null) => {
          if (!val) return '—';
          const parts = val.split('-');
          if (parts.length >= 2) {
            return `${MESES_MAP[parts[1]] || parts[1]} ${parts[0]}`;
          }
          return val;
        };

        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value)}
                className="text-xs border border-[#e5e7eb] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              >
                <option value="all">Todos los trimestres</option>
                <option value="Q1">Q1 — Ene, Feb, Mar</option>
                <option value="Q2">Q2 — Abr, May, Jun</option>
                <option value="Q3">Q3 — Jul, Ago, Sep</option>
                <option value="Q4">Q4 — Oct, Nov, Dic</option>
              </select>
              <span className="text-[10px] text-[#6b7280] ml-auto">{cuentas.length} cuentas · {fmtM(totalCuentasValor)} total</span>
            </div>
            {cuentas.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-6">Sin cuentas en este período</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Empresa</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Ejecutivo</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Etapa</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Mes Cierre</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Venta Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map(p => {
                    const stage = KANBAN_STAGES.find(s => s.id === p.status);
                    return (
                      <tr key={p.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                        <td className="py-2 px-2 text-sm font-medium text-[#1c2c4a]">{p.empresa}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <ExecutiveAvatar codigo={p.ejecutivo} name={p.ejecutivo} size="xs" />
                            <span className="text-sm text-[#6b7280]">{p.ejecutivo}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${stage?.color || '#6b7280'}15`, color: stage?.color || '#6b7280' }}>
                            {stage?.label || p.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-sm text-[#6b7280]">{formatMesCierre(p.estimatedCloseTime)}</td>
                        <td className="py-2 px-2 text-right text-sm font-semibold text-[#00a8a8]">
                          {fmtCurrency(p.propuesta?.ventaTotal || p.facturacionEstimada || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f9fafb]">
                    <td colSpan={4} className="py-2 px-2 font-semibold text-[#1c2c4a]">{cuentas.length} cuentas</td>
                    <td className="py-2 px-2 text-right font-bold text-[#00a8a8]">{fmtCurrency(totalCuentasValor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
          </div>
        );
      })()}
      </div>

      {/* Budget Edit Modal */}
      {showBudgetModal && (
        <BudgetEditModal
          salesTeamData={salesTeamData}
          year={new Date().getFullYear()}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
    </>
  );
}

// ─── Budget Edit Modal (1 total per month, auto-split across team) ───

function BudgetEditModal({ salesTeamData, year, onClose }: {
  salesTeamData: { dbUserId: number; name: string; codigo: string; presupuestosMensuales: Record<string, number>; presupuestoAnual2026: number }[];
  year: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const comercialMembers = salesTeamData.filter(m => m.presupuestoAnual2026 > 0 || Object.keys(m.presupuestosMensuales).length > 0);
  const memberCount = comercialMembers.length || 1;

  // Initialize: total per month (sum of all members)
  const [monthValues, setMonthValues] = useState<number[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const period = `${year}-${String(i + 1).padStart(2, '0')}`;
      return comercialMembers.reduce((s, m) => s + (m.presupuestosMensuales[period] || 0), 0);
    });
  });
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // For display we use monthValues, for the raw total string we derive
  const monthTotals = monthValues.map(v => v > 0 ? String(v) : '');

  const setMonthVal = (idx: number, val: number) => {
    setMonthValues(prev => { const n = [...prev]; n[idx] = val; return n; });
  };

  const formatDisplay = (val: number) => val > 0 ? `$${val.toLocaleString('es-MX')}` : '';

  const grandTotal = monthTotals.reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      for (let mes = 0; mes < 12; mes++) {
        const period = `${year}-${String(mes + 1).padStart(2, '0')}`;
        const totalMonth = Number(monthTotals[mes]) || 0;
        const perMember = Math.round(totalMonth / memberCount);
        const remainder = totalMonth - (perMember * memberCount);

        comercialMembers.forEach((m, idx) => {
          // First member gets remainder to avoid rounding loss
          const budget = perMember + (idx === 0 ? remainder : 0);
          const oldVal = m.presupuestosMensuales[period] || 0;
          if (budget !== oldVal) {
            promises.push(
              apiRequest('PATCH', '/api/comercial/sales-metrics', {
                userId: m.dbUserId, period, monthlyBudget: budget,
              })
            );
          }
        });
      }
      await Promise.all(promises);
      invalidateByPrefix('/api/comercial/team');
      invalidateByPrefix('/api/comercial/sales-metrics');
      toast({ title: `Objetivos guardados — se divide entre ${memberCount} ejecutivos` });
      onClose();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
          <div>
            <h3 className="text-base font-semibold text-[#1c2c4a]">Objetivos Mensuales {year}</h3>
            <p className="text-xs text-[#6b7280] mt-0.5">El total de cada mes se divide entre {memberCount} ejecutivos</p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#1c2c4a] p-1"><X size={20} /></button>
        </div>

        {/* Month inputs */}
        <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {MESES.map((mes, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#1c2c4a] w-24">{mes}</span>
              <div className="flex-1">
                {editingMonth === i ? (
                  <input
                    type="number"
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={() => {
                      setMonthVal(i, Number(editText) || 0);
                      setEditingMonth(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setMonthVal(i, Number(editText) || 0); setEditingMonth(null); }
                      if (e.key === 'Escape') setEditingMonth(null);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm text-right border border-[#7C3AED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                  />
                ) : (
                  <div
                    onClick={() => { setEditingMonth(i); setEditText(monthValues[i] > 0 ? String(monthValues[i]) : ''); }}
                    className="w-full px-3 py-2 text-sm text-right border border-[#e5e7eb] rounded-lg cursor-pointer hover:border-[#7C3AED]/50 transition-colors"
                  >
                    {formatDisplay(monthValues[i]) || <span className="text-[#9ca3af]">$0</span>}
                  </div>
                )}
              </div>
              {monthValues[i] > 0 && (
                <span className="text-[10px] text-[#6b7280] w-20 text-right">
                  {fmtM(monthValues[i] / memberCount, 2)}/ej
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5e7eb]">
          <span className="text-sm text-[#6b7280]">Total anual: <span className="font-bold text-[#1c2c4a]">{fmtM(grandTotal, 1)}</span></span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] rounded-lg">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar Objetivos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
