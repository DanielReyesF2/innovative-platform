import { Clock, CalendarCheck, Flame, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { fmtM } from '@/lib/utils';
import { HUB_KANBAN_STAGES } from '@/lib/comercial-constants';

// ═══════ TYPES ═══════

interface Insight {
  id: string;
  icon: 'stagnant' | 'followup' | 'hot' | 'momentum' | 'warning' | 'ok';
  text: string;
  /** Lower = more urgent (shown first) */
  priority: number;
}

// ═══════ PURE FUNCTION — computes insights from real kanban data ═══════

export function calcularInsights(prospectos: any[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Only active prospects (not cierre_ganado / cierre_perdido)
  const activos = prospectos.filter(p =>
    !['cierre_ganado', 'cierre_perdido'].includes(p.status)
  );

  // ── 1. STAGNANT: prospects stuck in same stage > 7 days ──
  const stagnant = activos
    .filter(p => {
      if (!p.updatedAt) return false;
      const updated = new Date(p.updatedAt);
      const diffDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 7;
    })
    .map(p => {
      const diffDays = Math.floor((now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, stagnantDays: diffDays };
    })
    .sort((a, b) => b.stagnantDays - a.stagnantDays);

  if (stagnant.length > 0) {
    const worst = stagnant[0];
    const stageName = HUB_KANBAN_STAGES.find(s => s.id === worst.status)?.label || worst.status;
    insights.push({
      id: 'stagnant',
      icon: 'stagnant',
      text: `${worst.empresa} — ${worst.stagnantDays}d en ${stageName}`,
      priority: 1,
    });
  }

  // ── 2. FOLLOW-UPS: due today or overdue ──
  const followUpsDue = activos.filter(p => {
    if (!p.fechaSeguimiento) return false;
    return p.fechaSeguimiento <= todayStr;
  });

  const overdue = followUpsDue.filter(p => p.fechaSeguimiento < todayStr);
  const dueToday = followUpsDue.filter(p => p.fechaSeguimiento === todayStr);

  if (overdue.length > 0) {
    const worstOverdue = overdue[0];
    insights.push({
      id: 'overdue',
      icon: 'warning',
      text: overdue.length === 1
        ? `Seguimiento vencido: ${worstOverdue.empresa}`
        : `${overdue.length} seguimientos vencidos`,
      priority: 0, // Most urgent
    });
  } else if (dueToday.length > 0) {
    insights.push({
      id: 'followup-today',
      icon: 'followup',
      text: dueToday.length === 1
        ? `Seguimiento para hoy: ${dueToday[0].empresa}`
        : `${dueToday.length} seguimientos para hoy`,
      priority: 2,
    });
  }

  // ── 3. HOT DEAL: highest value in most advanced stage ──
  const advancedStages = ['negociacion', 'propuesta'];
  const hotDeals = activos
    .filter(p => advancedStages.includes(p.status))
    .filter(p => (p.propuesta?.ventaTotal || p.facturacionEstimada || 0) > 0)
    .sort((a, b) => {
      // Sort by stage advancement first, then by value
      const stageOrder = advancedStages.indexOf(a.status) - advancedStages.indexOf(b.status);
      if (stageOrder !== 0) return stageOrder;
      const valA = a.propuesta?.ventaTotal || a.facturacionEstimada || 0;
      const valB = b.propuesta?.ventaTotal || b.facturacionEstimada || 0;
      return valB - valA;
    });

  if (hotDeals.length > 0) {
    const hot = hotDeals[0];
    const valor = hot.propuesta?.ventaTotal || hot.facturacionEstimada || 0;
    const stageName = HUB_KANBAN_STAGES.find(s => s.id === hot.status)?.label || hot.status;
    insights.push({
      id: 'hot-deal',
      icon: 'hot',
      text: `${hot.empresa} — ${stageName}, ${fmtM(valor)}`,
      priority: 3,
    });
  }

  // ── 4. ALL CLEAR ──
  if (insights.length === 0 && activos.length > 0) {
    insights.push({
      id: 'all-clear',
      icon: 'ok',
      text: 'Tu pipeline se ve bien hoy',
      priority: 10,
    });
  }

  // Sort by priority (lower = more urgent = first)
  insights.sort((a, b) => a.priority - b.priority);

  // Max 3 insights
  return insights.slice(0, 3);
}

// ═══════ ICON MAP ═══════

const INSIGHT_ICONS: Record<string, { Icon: any; color: string }> = {
  stagnant: { Icon: Clock, color: '#F97316' },
  followup: { Icon: CalendarCheck, color: '#3B82F6' },
  hot:      { Icon: Flame, color: '#EF4444' },
  momentum: { Icon: TrendingUp, color: '#22C55E' },
  warning:  { Icon: AlertTriangle, color: '#EF4444' },
  ok:       { Icon: CheckCircle, color: '#22C55E' },
};

// ═══════ COMPONENT ═══════

interface InsightsBannerProps {
  greeting: string;
  memberName: string;
  prospectos: any[];
  presupuestoMensual?: number;
  ventasReales?: number;
  cumplimiento?: number;
}

export function InsightsBanner({ greeting, memberName, prospectos, presupuestoMensual, ventasReales, cumplimiento }: InsightsBannerProps) {
  const insights = calcularInsights(prospectos);
  const firstName = memberName.split(' ')[0];

  // Nothing to show if no prospects at all
  if (prospectos.length === 0) return null;

  const presupColor = (cumplimiento ?? 0) >= 70 ? '#2E7D32' : (cumplimiento ?? 0) >= 40 ? '#F57C00' : '#DC2626';

  return (
    <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
      {/* Greeting + budget summary */}
      <p className="text-sm text-[#6b7280]">
        {greeting}, {firstName}
        {presupuestoMensual != null && presupuestoMensual > 0 && (
          <span> · Tu meta este mes es <span className="font-semibold text-[#4b5563]">{fmtM(presupuestoMensual, 2)}</span>, llevas cerrado <span className="font-semibold" style={{ color: presupColor }}>{fmtM(ventasReales ?? 0, 2)}</span></span>
        )}
      </p>
      {/* Insights */}
      {insights.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5">
          {insights.map(insight => {
            const { Icon, color } = INSIGHT_ICONS[insight.icon] || INSIGHT_ICONS.ok;
            return (
              <div key={insight.id} className="flex items-center gap-1.5">
                <Icon size={13} className="flex-shrink-0" style={{ color }} />
                <span className="text-[13px] text-[#4b5563]">{insight.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
