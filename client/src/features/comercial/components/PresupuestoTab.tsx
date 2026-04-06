import { useState } from 'react';
import { DollarSign, Edit3, Package, CalendarDays, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtM, fmtCurrency } from '@/lib/utils';
import { ExecutiveAvatar, KANBAN_STAGES } from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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
  const [quarterFilter, setQuarterFilter] = useState<string>('all');

  const canEditBudget = authUser?.role === 'admin' || authUser?.role === 'director';

  const MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = MESES_NOMBRE[ventaRealMes - 1];

  const presupuestoTotal = salesTeamData.reduce((s, m) => s + (m.presupuestoAnual2026 || 0), 0);
  const ventasCerradasAnual = salesTeamData.reduce((s, m) => s + (m.ventasRealesAnual || 0), 0);
  const presupuestoMesEquipo = salesTeamData.reduce((s, m) => s + (m.presupuestoMensual || 0), 0);

  // Material tracking
  const materialData = kanbanProspectos
    .filter(p => p.propuesta?.carton || p.propuesta?.playo)
    .map(p => ({ carton: p.propuesta?.carton || 0, playo: p.propuesta?.playo || 0 }));
  const totalCarton = materialData.reduce((s, m) => s + m.carton, 0);
  const totalPlayo = materialData.reduce((s, m) => s + m.playo, 0);

  return (
    <>
      {/* Presupuesto Chart */}
      <div className="mt-6 bg-white rounded-xl border border-[#e5e7eb] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
            <DollarSign size={16} className="text-[#00a8a8]" />
            Presupuesto Mensual 2026 vs Real
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-[#6b7280]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#1B5E20] inline-block" /> Presupuesto</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#00a8a8] inline-block" /> Real</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={presupuestoEvolution} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtM(v, 0)} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value: number) => [fmtM(value), '']}
              labelStyle={{ fontWeight: 600, color: '#1c2c4a' }}
            />
            <Bar dataKey="presupuesto" name="Presupuesto" fill="#1B5E20" radius={[3, 3, 0, 0]} />
            <Bar dataKey="real" name="Real" fill="#00a8a8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-[#e5e7eb] grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto Anual</div>
            <div className="text-sm font-bold text-[#1c2c4a]">{fmtM(presupuestoTotal, 0)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Venta Cerrada Anual</div>
            <div className="text-sm font-bold text-[#00a8a8]">{fmtM(ventasCerradasAnual)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">% Avance</div>
            <div className={`text-sm font-bold ${presupuestoTotal > 0 && (ventasCerradasAnual / presupuestoTotal) >= 0.5 ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}>
              {presupuestoTotal > 0 ? Math.round(ventasCerradasAnual / presupuestoTotal * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto {new Date().toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</div>
            <div className="text-sm font-bold text-[#1c2c4a]">{fmtM(presupuestoMesEquipo)}</div>
          </div>
        </div>
      </div>

      {/* Editable Sales Table */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 size={14} className="text-[#00a8a8]" />
            <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Ventas Cerradas por Ejecutivo</h4>
          </div>
          <div className="flex items-center gap-2">
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
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/sales-metrics'] });
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
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/sales-metrics'] });
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
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/ventas-reales'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
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
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/ventas-reales'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
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

      {/* Cuentas del Mes */}
      {(() => {
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

        if (allCuentas.length === 0) return null;

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
          <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={14} className="text-[#7C3AED]" />
              <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Cuentas del Mes</h4>
              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value)}
                className="text-xs border border-[#e5e7eb] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] ml-2"
              >
                <option value="all">Todos</option>
                <option value="Q1">Q1 (Ene-Mar)</option>
                <option value="Q2">Q2 (Abr-Jun)</option>
                <option value="Q3">Q3 (Jul-Sep)</option>
                <option value="Q4">Q4 (Oct-Dic)</option>
              </select>
              <span className="text-[10px] text-[#6b7280] ml-auto">{cuentas.length} cuentas · {fmtM(totalCuentasValor)} total</span>
            </div>
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
          </div>
        );
      })()}

      {/* Material Volume */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package size={14} className="text-[#F59E0B]" />
          <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Volumen por Material</h4>
          <span className="text-[10px] text-[#6b7280] ml-auto">{materialData.length} prospectos</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-[#F59E0B]/5 rounded-lg px-3 py-2.5 border border-[#F59E0B]/15">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <Package className="text-[#F59E0B]" size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#6b7280]">Cartón</div>
              <div className="text-base font-bold text-[#1c2c4a]">{totalCarton >= 1000 ? `${(totalCarton / 1000).toFixed(0)}k` : totalCarton.toLocaleString()} <span className="text-[10px] font-normal text-[#6b7280]">kg</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#3B82F6]/5 rounded-lg px-3 py-2.5 border border-[#3B82F6]/15">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
              <Package className="text-[#3B82F6]" size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#6b7280]">Playo</div>
              <div className="text-base font-bold text-[#1c2c4a]">{totalPlayo >= 1000 ? `${(totalPlayo / 1000).toFixed(0)}k` : totalPlayo.toLocaleString()} <span className="text-[10px] font-normal text-[#6b7280]">kg</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
