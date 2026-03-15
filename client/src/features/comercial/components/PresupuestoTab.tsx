import { useState } from 'react';
import { DollarSign, Edit3, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExecutiveAvatar } from '@/lib/comercial-constants';
import { useComercialData } from '../hooks/useComercialData';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function PresupuestoTab() {
  const {
    kanbanProspectos,
    salesTeamData,
    presupuestoEvolution,
    ventasRealesEditadas,
    setVentasRealesEditadas,
  } = useComercialData();

  const [editingVentaReal, setEditingVentaReal] = useState<string | null>(null);
  const [ventaRealMes, setVentaRealMes] = useState(new Date().getMonth() + 1);
  const [ventaRealAño, setVentaRealAño] = useState(new Date().getFullYear());

  const MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = MESES_NOMBRE[ventaRealMes - 1];

  const presupuestoTotal = salesTeamData.reduce((s, m) => s + (m.presupuestoAnual2026 || 0), 0);
  const ventasReales = salesTeamData.reduce((s, m) => s + (m.ventasReales || 0), 0);
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
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#e5e7eb] inline-block" /> Presupuesto</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#00a8a8] inline-block" /> Real</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={presupuestoEvolution} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value: number) => [`$${(value / 1000000).toFixed(1)}M`, '']}
              labelStyle={{ fontWeight: 600, color: '#1c2c4a' }}
            />
            <Bar dataKey="presupuesto" name="Presupuesto" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="real" name="Real" fill="#00a8a8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 pt-3 border-t border-[#e5e7eb] grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto Anual</div>
            <div className="text-sm font-bold text-[#1c2c4a]">${(presupuestoTotal / 1000000).toFixed(0)}M</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Ventas Reales</div>
            <div className="text-sm font-bold text-[#00a8a8]">${(ventasReales / 1000000).toFixed(1)}M</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">% Avance</div>
            <div className={`text-sm font-bold ${presupuestoTotal > 0 && (ventasReales / presupuestoTotal) >= 0.5 ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}>
              {presupuestoTotal > 0 ? Math.round(ventasReales / presupuestoTotal * 100) : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#6b7280]">Presupuesto {new Date().toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</div>
            <div className="text-sm font-bold text-[#1c2c4a]">${(presupuestoMesEquipo / 1000000).toFixed(1)}M</div>
          </div>
        </div>
      </div>

      {/* Editable Sales Table */}
      <div className="mt-4 bg-white rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 size={14} className="text-[#00a8a8]" />
            <h4 className="text-xs font-semibold text-[#1c2c4a] uppercase tracking-wide">Ventas Reales por Ejecutivo</h4>
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
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">Venta Real {mesNombre}</th>
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase">%</th>
                <th className="text-center py-2 px-2 text-[10px] font-semibold text-[#6b7280] uppercase w-20"></th>
              </tr>
            </thead>
            <tbody>
              {salesTeamData.filter(m => m.presupuestoMensual > 0).map(member => {
                const editKey = `${member.id}-${ventaRealMes}-${ventaRealAño}`;
                const isEditing = editingVentaReal === editKey;
                const ventaActual = ventasRealesEditadas[editKey] ?? member.ventasReales;
                const pctVal = member.presupuestoMensual > 0 ? Math.round((Number(ventaActual) / member.presupuestoMensual) * 100) : 0;
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
                      <span className="text-sm text-[#6b7280]">${(member.presupuestoMensual / 1000000).toFixed(2)}M</span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          autoFocus
                          value={ventasRealesEditadas[editKey] ?? ''}
                          onChange={(e) => setVentasRealesEditadas((prev: any) => ({ ...prev, [editKey]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const monto = Number(ventasRealesEditadas[editKey] || 0);
                              setVentasRealesEditadas((prev: any) => ({ ...prev, [editKey]: monto }));
                              setEditingVentaReal(null);
                              apiRequest('POST', '/api/comercial/ventas-reales', { userId: member.dbUserId, mes: ventaRealMes, año: ventaRealAño, monto })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/ventas-reales'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
                                });
                            } else if (e.key === 'Escape') {
                              setVentasRealesEditadas((prev: any) => { const n = { ...prev }; delete n[editKey]; return n; });
                              setEditingVentaReal(null);
                            }
                          }}
                          onBlur={() => {
                            const monto = Number(ventasRealesEditadas[editKey] || 0);
                            setVentasRealesEditadas((prev: any) => ({ ...prev, [editKey]: monto }));
                            setEditingVentaReal(null);
                            if (monto > 0) {
                              apiRequest('POST', '/api/comercial/ventas-reales', { userId: member.dbUserId, mes: ventaRealMes, año: ventaRealAño, monto })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/ventas-reales'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/comercial/team'] });
                                });
                            }
                          }}
                          className="w-24 px-2 py-1 text-sm text-right border border-[#00a8a8] rounded focus:outline-none focus:ring-1 focus:ring-[#00a8a8]"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#00a8a8]">${(Number(ventaActual) / 1000000).toFixed(2)}M</span>
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
                            setVentasRealesEditadas((prev: any) => ({ ...prev, [editKey]: ventaActual || '' }));
                          }}
                          className="text-[#00a8a8] hover:bg-[#00a8a8]/10 p-1.5 rounded-lg transition-colors"
                          title="Editar venta real"
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
              <tr className="bg-[#f9fafb]">
                <td className="py-2.5 px-2 font-semibold text-[#1c2c4a]">Total Equipo</td>
                <td className="py-2.5 px-2 text-right font-semibold text-[#1c2c4a]">
                  ${(salesTeamData.reduce((s, m) => s + m.presupuestoMensual, 0) / 1000000).toFixed(2)}M
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-[#00a8a8]">
                  ${(salesTeamData.reduce((s, m) => s + Number(ventasRealesEditadas[`${m.id}-${ventaRealMes}-${ventaRealAño}`] ?? m.ventasReales), 0) / 1000000).toFixed(2)}M
                </td>
                <td className="py-2.5 px-2 text-right font-bold" style={{
                  color: (() => {
                    const totalPres = salesTeamData.reduce((s, m) => s + m.presupuestoMensual, 0);
                    const totalReal = salesTeamData.reduce((s, m) => s + Number(ventasRealesEditadas[`${m.id}-${ventaRealMes}-${ventaRealAño}`] ?? m.ventasReales), 0);
                    const p = totalPres > 0 ? Math.round((totalReal / totalPres) * 100) : 0;
                    return p >= 80 ? '#2E7D32' : p >= 40 ? '#F57C00' : '#EF4444';
                  })()
                }}>
                  {(() => {
                    const totalPres = salesTeamData.reduce((s, m) => s + m.presupuestoMensual, 0);
                    const totalReal = salesTeamData.reduce((s, m) => s + Number(ventasRealesEditadas[`${m.id}-${ventaRealMes}-${ventaRealAño}`] ?? m.ventasReales), 0);
                    return totalPres > 0 ? Math.round((totalReal / totalPres) * 100) : 0;
                  })()}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[10px] text-[#9ca3af] mt-3 flex items-center gap-1">
          <Edit3 size={10} /> Click en el icono de lápiz para editar la venta real. Presiona Enter para guardar.
        </p>
      </div>

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
