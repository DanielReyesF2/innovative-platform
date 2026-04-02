import { useState } from 'react';
import { useLocation } from 'wouter';
import { DollarSign, ClipboardList, RotateCcw, Users, Recycle, FileText, BarChart3 } from 'lucide-react';
import type { TeamMember } from '@shared/types/comercial';
import { fmtM } from '@/lib/utils';
import {
  KANBAN_STAGES,
  STAGE_PROBABILITY,
  SERVICIOS_INNOVATIVE,
  ExecutiveAvatar,
  SectionHeader,
  calcularWeightedPipeline,
  calcularWinRate,
  calcularPipelineVelocity,
} from '@/lib/comercial-constants';
import { useComercialData } from './hooks/useComercialData';
import { PipelineTab } from './components/PipelineTab';
import { PresupuestoTab } from './components/PresupuestoTab';
import { RechazadasTab } from './components/RechazadasTab';
import { EjecutivoHub } from './components/EjecutivoHub';
import { LeadForm } from './components/LeadForm';
import { ComercialReports } from './components/ComercialReports';
import { ResumenSemanal } from './components/ResumenSemanal';

export default function ComercialPage() {
  const [, navigate] = useLocation();
  const {
    kanbanProspectos,
    salesTeamData,
    currentUserName,
    userGreeting,
    isLoading,
    isError,
    authUser,
  } = useComercialData();

  const [comercialTab, setComercialTab] = useState<'pipeline' | 'presupuesto' | 'rechazadas' | 'reportes' | 'resumen'>('pipeline');
  const [hubEjecutivo, setHubEjecutivo] = useState<TeamMember | null>(null);
  const [showNuevoLead, setShowNuevoLead] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a8a8]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar datos comerciales</h2>
        <p className="text-sm text-[#6b7280]">Hubo un problema al conectar con el servidor. Intenta recargar la página.</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#00a8a8] rounded-lg hover:bg-[#008f8f]">
          Recargar
        </button>
      </div>
    );
  }

  // If viewing hub, render EjecutivoHub + LeadForm modal
  if (hubEjecutivo) {
    return (
      <>
        <EjecutivoHub
          member={hubEjecutivo}
          onBack={() => setHubEjecutivo(null)}
          onShowNuevoLead={() => setShowNuevoLead(true)}
        />
        {showNuevoLead && (
          <LeadForm
            onClose={() => setShowNuevoLead(false)}
            salesTeam={salesTeamData}
            defaultAssignee={hubEjecutivo?.dbUserId || authUser?.id}
          />
        )}
      </>
    );
  }

  // Derived KPIs
  const presupuestoMesEquipo = salesTeamData.reduce((s, m) => s + (m.presupuestoMensual || 0), 0);
  const propuestasEnviadas = kanbanProspectos.filter(p => p.status === 'propuesta');
  const montoPropuestas = propuestasEnviadas.reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0);
  const levantamientosActivos = kanbanProspectos.filter(p => p.status === 'levantamiento');
  const biodigestores = kanbanProspectos.filter(p => (p.servicios || []).includes('biodigestores'));

  return (
    <div className="bg-[#faf7f2] min-h-full">
      <div className="max-w-[1400px] mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1c2c4a]">{userGreeting}, {currentUserName}</h1>
            <p className="text-sm text-[#6b7280] mt-0.5">Tu presupuesto comercial al momento</p>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Presupuesto Mes */}
          <div className="rounded-xl border border-[#00a8a8]/10 card-modern p-5" style={{ backgroundColor: 'rgba(0,168,168,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Presupuesto {new Date().toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{fmtM(presupuestoMesEquipo)}</div>
                <div className="text-xs text-[#6b7280] mt-1">
                  Cierre: <span className="font-semibold text-[#00a8a8]">{fmtM(montoPropuestas)}</span>
                  {presupuestoMesEquipo > 0 && (
                    <span className={`ml-1.5 font-semibold ${(montoPropuestas / presupuestoMesEquipo) >= 1 ? 'text-[#2E7D32]' : 'text-[#F57C00]'}`}>
                      ({Math.round((montoPropuestas / presupuestoMesEquipo) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#00a8a8]/10 flex items-center justify-center">
                <DollarSign className="text-[#00a8a8]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 2: Levantamientos */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Levantamientos Activos</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{levantamientosActivos.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center">
                <ClipboardList className="text-[#0D47A1]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 3: Propuestas */}
          <div className="rounded-xl border border-[#2E7D32]/10 card-modern p-5" style={{ backgroundColor: 'rgba(46,125,50,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Propuestas Enviadas</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{propuestasEnviadas.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2E7D32]/10 flex items-center justify-center">
                <FileText className="text-[#2E7D32]" size={20} />
              </div>
            </div>
          </div>
          {/* Card 4: Biodigestores */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] card-modern p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b7280] mb-1">Cierre Biodigestores</div>
                <div className="text-2xl font-bold text-[#1c2c4a]">{biodigestores.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center">
                <Recycle className="text-[#F57C00]" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* EQUIPO */}
        <SectionHeader color="#00a8a8" icon={Users} label="Equipo" linkLabel="Ver Dashboard" onLinkClick={() => navigate('/dashboard')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[...salesTeamData].sort((a, b) => {
              if (a.codigo === 'VA') return -1;
              if (b.codigo === 'VA') return 1;
              if (a.codigo === 'AM') return 1;
              if (b.codigo === 'AM') return -1;
              return b.presupuestoAnual2026 - a.presupuestoAnual2026;
            }).map(member => {
            const pct = member.cumplimientoPresupuesto || 0;
            const barColor = pct >= 80 ? '#2E7D32' : pct >= 40 ? '#F57C00' : '#ef4444';
            const memberProspectos = kanbanProspectos.filter(p => p.ejecutivo === member.codigo);
            return (
              <div key={member.codigo} onClick={() => setHubEjecutivo(member)}
                className="bg-white rounded-xl border border-[#e5e7eb] p-4 cursor-pointer hover:shadow-lg hover:border-[#00a8a8]/40 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a8a8] to-[#0D47A1] opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 mb-3">
                  <ExecutiveAvatar codigo={member.codigo} name={member.name} size="lg" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1c2c4a] truncate">{member.name.split(' ').slice(0, 2).join(' ')}</div>
                    <div className="text-[10px] text-[#6b7280]">{member.zona || member.role}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-[#1c2c4a]">{fmtM(member.presupuestoMensual)}<span className="text-xs font-normal text-[#6b7280] ml-0.5">/mes</span></div>
                <div className="flex items-center justify-between mt-1 mb-2">
                  <span className="text-[10px] text-[#6b7280]">Anual: {fmtM(member.presupuestoAnual2026)}</span>
                  <span className="text-[10px] font-semibold" style={{ color: barColor }}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                </div>
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#f3f4f6]">
                  <span className="text-[10px] text-[#6b7280]">{memberProspectos.length} opps</span>
                  <span className="text-[10px] text-[#6b7280]">·</span>
                  <span className="text-[10px] text-[#6b7280]">{fmtM(memberProspectos.filter(p => p.status !== 'cierre_perdido').reduce((s, p) => s + (p.propuesta?.ventaTotal || p.facturacionEstimada || 0), 0))} presupuesto</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* TAB BAR */}
        <div className="mt-5 flex items-center gap-1 bg-white rounded-xl border border-[#e5e7eb] p-1">
          {([
            { id: 'pipeline' as const, label: 'Oportunidades', icon: ClipboardList },
            { id: 'presupuesto' as const, label: 'Presupuesto', icon: DollarSign },
            { id: 'rechazadas' as const, label: 'Rechazadas', icon: RotateCcw, badge: kanbanProspectos.filter(p => p.status === 'cierre_perdido').length },
            { id: 'reportes' as const, label: 'KPIs', icon: BarChart3 },
            { id: 'resumen' as const, label: 'Resumen Semanal', icon: FileText },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setComercialTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${comercialTab === tab.id ? 'bg-[#1c2c4a] text-white shadow-sm' : 'text-[#6b7280] hover:bg-[#f3f4f6]'}`}>
              <tab.icon size={15} />
              {tab.label}
              {'badge' in tab && (tab as { badge: number }).badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${comercialTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>{(tab as { badge: number }).badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {comercialTab === 'pipeline' && <PipelineTab onViewHub={setHubEjecutivo} />}
        {comercialTab === 'presupuesto' && <PresupuestoTab />}
        {comercialTab === 'rechazadas' && <RechazadasTab />}
        {comercialTab === 'reportes' && <div className="mt-5"><ComercialReports kanbanProspectos={kanbanProspectos} salesTeamData={salesTeamData} /></div>}
        {comercialTab === 'resumen' && <ResumenSemanal />}

      </div>

      {showNuevoLead && (
        <LeadForm
          onClose={() => setShowNuevoLead(false)}
          salesTeam={salesTeamData}
          defaultAssignee={authUser?.id}
        />
      )}
    </div>
  );
}
