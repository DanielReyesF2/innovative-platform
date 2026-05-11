import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Building2,
  Recycle,
  Truck,
  Warehouse,
  Target,
  Calendar,
  User,
  MapPin,
  Phone,
  Users,
  HardHat,
  ShieldCheck,
  Car,
  Clock,
} from "lucide-react";
import { useAcceptSurvey, useRejectSurvey, useSurvey } from "../api";
import { useToast } from "@/components/ui/use-toast";
import { EPP_OPTIONS, ACCESS_REQUIREMENTS_OPTIONS } from "@/lib/comercial-constants";

interface ReviewSurveyModalProps {
  survey: any;
  onClose: () => void;
  users?: any[];
}

export function ReviewSurveyModal({ survey, onClose, users = [] }: ReviewSurveyModalProps) {
  const [action, setAction] = useState<"none" | "accept" | "reject">("none");
  const [scheduledDate, setScheduledDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [schedulingNotes, setSchedulingNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const acceptMutation = useAcceptSurvey();
  const rejectMutation = useRejectSurvey();
  const { data: fullSurvey } = useSurvey(survey.id);
  const { toast } = useToast();

  const surveyData = fullSurvey || survey;
  const generalInfo = (surveyData.generalInfo as any) || {};
  const scheduling = generalInfo.proposedScheduling as Record<string, any> | null;

  const handleAccept = async () => {
    if (!scheduledDate || !assignedToId) {
      toast({ title: "Fecha y operador son requeridos", variant: "destructive" });
      return;
    }
    try {
      await acceptMutation.mutateAsync({
        id: survey.id,
        scheduledDate,
        assignedToId: Number(assignedToId),
        schedulingNotes: schedulingNotes || undefined,
      });
      toast({ title: "Levantamiento aceptado y agendado" });
      onClose();
    } catch {
      toast({ title: "Error al aceptar", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Motivo de rechazo requerido", variant: "destructive" });
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        id: survey.id,
        rejectionReason,
      });
      toast({ title: "Solicitud rechazada" });
      onClose();
    } catch {
      toast({ title: "Error al rechazar", variant: "destructive" });
    }
  };

  // Resolve EPP / access requirement IDs to labels
  const eppLabels = (scheduling?.epp as string[] | undefined)
    ?.map((id: string) => EPP_OPTIONS.find((e) => e.id === id)?.label || id)
    ?? [];
  const accessLabels = (scheduling?.accessRequirements as string[] | undefined)
    ?.map((id: string) => ACCESS_REQUIREMENTS_OPTIONS.find((r) => r.id === id)?.label || id)
    ?? [];

  // Waste types from scheduling (what comercial captured)
  const schedulingWaste = (generalInfo.wasteTypes as any[] | undefined) || [];
  // Waste types from relational table (if populated)
  const relationalWaste = (surveyData.wasteTypes as any[] | undefined) || [];
  const wasteToShow = relationalWaste.length > 0 ? relationalWaste : schedulingWaste;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">{survey.clientName}</h2>
            <p className="text-sm text-muted-foreground">
              Solicitud de levantamiento
              {survey.createdAt && ` · ${new Date(survey.createdAt).toLocaleDateString("es-MX")}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* ═══ Scheduling proposal from comercial ═══ */}
          {scheduling && (
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-700" />
                <span className="text-sm font-semibold text-cyan-800">Propuesta de Comercial</span>
              </div>

              {/* Date, time, delivery date */}
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                {scheduling.proposedDate && (
                  <div>
                    <span className="text-xs text-cyan-600">Fecha propuesta</span>
                    <div className="font-medium text-cyan-900">
                      {new Date(scheduling.proposedDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                )}
                {scheduling.proposedTime && (
                  <div>
                    <span className="text-xs text-cyan-600">Hora</span>
                    <div className="font-medium text-cyan-900">{scheduling.proposedTime}</div>
                  </div>
                )}
                {scheduling.deliveryDate && (
                  <div>
                    <span className="text-xs text-cyan-600">Entrega de Ops</span>
                    <div className="font-medium text-cyan-900">
                      {new Date(scheduling.deliveryDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                )}
              </div>

              {scheduling.notes && (
                <div className="text-xs text-cyan-700">
                  <span className="font-medium">Notas:</span> {scheduling.notes}
                </div>
              )}
            </div>
          )}

          {/* ═══ Datos de la Empresa ═══ */}
          <SectionCard title="Datos de la Empresa" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Razón Social" value={generalInfo.razonSocial} />
              <InfoRow label="RFC" value={generalInfo.rfc} />
              <InfoRow label="Dirección" value={generalInfo.direccion} />
              <InfoRow label="Giro" value={generalInfo.giro} />
              <InfoRow label="Num. Empleados" value={generalInfo.numEmpleados} />
              <InfoRow label="Horario" value={generalInfo.horarioOperacion} />
            </div>
          </SectionCard>

          {/* ═══ Contacto en sitio ═══ */}
          {scheduling && (scheduling.contactName || scheduling.contactPhone) && (
            <SectionCard title="Contacto en Sitio" icon={<Phone className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoRow label="Nombre" value={scheduling.contactName} />
                <InfoRow label="Puesto" value={scheduling.contactRole} />
                <InfoRow label="Teléfono" value={scheduling.contactPhone} />
                <InfoRow label="Correo" value={scheduling.contactEmail} />
              </div>
            </SectionCard>
          )}

          {/* ═══ Dirección del sitio ═══ */}
          {scheduling?.siteAddress && (
            <SectionCard title="Dirección del Sitio" icon={<MapPin className="h-4 w-4" />}>
              <p className="text-sm">{scheduling.siteAddress}</p>
            </SectionCard>
          )}

          {/* ═══ Participantes ═══ */}
          {scheduling?.responsibleNames && scheduling.responsibleNames.length > 0 && (
            <SectionCard title="Equipo Asignado" icon={<Users className="h-4 w-4" />}>
              <div className="space-y-2">
                {scheduling.participantsByArea && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ParticipantArea
                      label="Comercial"
                      color="#00a8a8"
                      names={scheduling.responsibleNames}
                      ids={scheduling.participantsByArea.comercial}
                      allIds={scheduling.responsibleIds}
                    />
                    <ParticipantArea
                      label="Operaciones"
                      color="#0D47A1"
                      names={scheduling.responsibleNames}
                      ids={scheduling.participantsByArea.operaciones}
                      allIds={scheduling.responsibleIds}
                    />
                    <ParticipantArea
                      label="Subproductos"
                      color="#F57C00"
                      names={scheduling.responsibleNames}
                      ids={scheduling.participantsByArea.subproductos}
                      allIds={scheduling.responsibleIds}
                    />
                  </div>
                )}
                {!scheduling.participantsByArea && (
                  <div className="flex flex-wrap gap-1.5">
                    {scheduling.responsibleNames.map((name: string, i: number) => (
                      <span key={i} className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-medium text-[#1c2c4a]">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══ Requisitos operacionales ═══ */}
          {(eppLabels.length > 0 || accessLabels.length > 0 || scheduling?.vehiclePlates) && (
            <SectionCard title="Requisitos Operacionales" icon={<ShieldCheck className="h-4 w-4" />}>
              <div className="space-y-3">
                {eppLabels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <HardHat className="h-3.5 w-3.5 text-[#F57C00]" />
                      <span className="text-xs font-semibold text-[#1c2c4a]">EPP Necesario</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {eppLabels.map((label: string, i: number) => (
                        <span key={i} className="rounded-full bg-[#F57C00]/10 px-2.5 py-1 text-xs font-medium text-[#F57C00]">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {accessLabels.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#7C3AED]" />
                      <span className="text-xs font-semibold text-[#1c2c4a]">Requisitos de Acceso</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {accessLabels.map((label: string, i: number) => (
                        <span key={i} className="rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-xs font-medium text-[#7C3AED]">
                          {label}
                        </span>
                      ))}
                    </div>
                    {scheduling?.accessRequirementsOther && (
                      <p className="mt-1 text-xs text-muted-foreground">Otros: {scheduling.accessRequirementsOther}</p>
                    )}
                  </div>
                )}
                {scheduling?.vehiclePlates && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Car className="h-3.5 w-3.5 text-[#6b7280]" />
                      <span className="text-xs font-semibold text-[#1c2c4a]">Placas de Vehículos</span>
                    </div>
                    <p className="text-sm">{scheduling.vehiclePlates}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══ Waste Types ═══ */}
          {wasteToShow.length > 0 && (
            <SectionCard title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />}>
              <div className="space-y-2">
                {wasteToShow.map((wt: any, i: number) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    <span className="font-medium">{wt.wasteType}</span>
                    {wt.quantity && <span className="ml-2 text-muted-foreground">{wt.quantity}</span>}
                    {wt.percentage && <span className="ml-2 text-muted-foreground">{wt.percentage}%</span>}
                    {wt.currentDestination && (
                      <span className="ml-2 text-muted-foreground">→ {wt.currentDestination}</span>
                    )}
                    {wt.monthlyCost && (
                      <span className="ml-2 text-muted-foreground">
                        ${Number(wt.monthlyCost).toLocaleString("es-MX")}/mes
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ═══ Current Services ═══ */}
          {surveyData.currentServices && (
            <SectionCard title="Servicios Actuales" icon={<Truck className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Proveedor" value={surveyData.currentServices.providerName} />
                <InfoRow label="Contrato Activo" value={surveyData.currentServices.contractActive ? "Sí" : "No"} />
                <InfoRow label="Costo Mensual" value={surveyData.currentServices.monthlyCost ? `$${Number(surveyData.currentServices.monthlyCost).toLocaleString("es-MX")}` : undefined} />
                <InfoRow label="Frecuencia" value={surveyData.currentServices.collectionFrequency} />
                <InfoRow label="Tipo Servicio" value={surveyData.currentServices.serviceType} />
                <InfoRow label="Satisfacción" value={surveyData.currentServices.satisfactionLevel ? `${surveyData.currentServices.satisfactionLevel}/10` : undefined} />
                <InfoRow label="Razón de Cambio" value={surveyData.currentServices.reasonForChange} />
              </div>
            </SectionCard>
          )}

          {/* ═══ Infrastructure ═══ */}
          {surveyData.infrastructure && (
            <SectionCard title="Infraestructura" icon={<Warehouse className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Área Almacenamiento" value={surveyData.infrastructure.hasStorageArea ? "Sí" : "No"} />
                <InfoRow label="Tamaño Área" value={surveyData.infrastructure.storageAreaSize} />
                <InfoRow label="Tipo Almacenamiento" value={surveyData.infrastructure.storageType} />
                <InfoRow label="Contenedores" value={surveyData.infrastructure.containerCount?.toString()} />
                <InfoRow label="Compactadora" value={surveyData.infrastructure.hasCompactor ? "Sí" : "No"} />
                <InfoRow label="Bodega" value={surveyData.infrastructure.hasWarehouse ? "Sí" : "No"} />
                <InfoRow label="Acceso Vehicular" value={surveyData.infrastructure.vehicleAccess} />
                <InfoRow label="Restricciones" value={surveyData.infrastructure.scheduleRestrictions} />
                <InfoRow label="Espacio Disponible" value={surveyData.infrastructure.availableSpace} />
              </div>
            </SectionCard>
          )}

          {/* ═══ Needs ═══ */}
          {surveyData.needs && (
            <SectionCard title="Necesidades" icon={<Target className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Separación" value={surveyData.needs.needsSeparation ? "Sí" : "No"} />
                <InfoRow label="Valorización" value={surveyData.needs.needsValorization ? "Sí" : "No"} />
                <InfoRow label="Trazabilidad" value={surveyData.needs.needsTraceability ? "Sí" : "No"} />
                <InfoRow label="Reportes Mensuales" value={surveyData.needs.needsMonthlyReporting ? "Sí" : "No"} />
                <InfoRow label="Certificaciones" value={Array.isArray(surveyData.needs.certifications) ? surveyData.needs.certifications.join(", ") : surveyData.needs.certifications} />
                <InfoRow label="Presupuesto" value={surveyData.needs.availableBudget ? `$${Number(surveyData.needs.availableBudget).toLocaleString("es-MX")}` : undefined} />
                <InfoRow label="Urgencia" value={surveyData.needs.urgency} />
                <InfoRow label="Tomador de Decisión" value={surveyData.needs.decisionMaker} />
                <InfoRow label="Metas Ambientales" value={surveyData.needs.environmentalGoals} />
              </div>
            </SectionCard>
          )}

          {/* ═══ Estimated values ═══ */}
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Volumen Estimado" value={survey.estimatedVolume} />
            <InfoRow label="Valor Estimado" value={survey.estimatedValue ? `$${Number(survey.estimatedValue).toLocaleString("es-MX")}` : undefined} />
          </div>
        </div>

        {/* Action footer */}
        <div className="border-t px-6 py-4">
          {action === "none" && (
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setAction("reject")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button onClick={() => {
                if (scheduling?.proposedDate && !scheduledDate) {
                  setScheduledDate(scheduling.proposedDate);
                }
                setAction("accept");
              }}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aceptar y Agendar
              </Button>
            </div>
          )}

          {action === "accept" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Agendar Levantamiento</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Fecha del Levantamiento *</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Operador Asignado *</Label>
                  {users.length > 0 ? (
                    <select
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="number"
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      placeholder="ID del operador"
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Notas para el equipo</Label>
                  <textarea
                    value={schedulingNotes}
                    onChange={(e) => setSchedulingNotes(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Instrucciones para el equipo de operaciones..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAction("none")}>
                  Cancelar
                </Button>
                <Button onClick={handleAccept} disabled={acceptMutation.isPending}>
                  {acceptMutation.isPending ? "Agendando..." : "Confirmar y Agendar"}
                </Button>
              </div>
            </div>
          )}

          {action === "reject" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Rechazar Solicitud</h3>
              <div>
                <Label className="text-xs">Motivo de rechazo *</Label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Explique el motivo del rechazo..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAction("none")}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Rechazando..." : "Confirmar Rechazo"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: participant area display ────────────────────

function ParticipantArea({
  label,
  color,
  names,
  ids,
  allIds,
}: {
  label: string;
  color: string;
  names: string[];
  ids: number[];
  allIds: number[];
}) {
  if (!ids || ids.length === 0) return null;
  const areaNames = ids.map((id: number) => {
    const idx = allIds.indexOf(id);
    return idx >= 0 ? names[idx] : `ID ${id}`;
  });
  return (
    <div>
      <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {areaNames.map((name: string, i: number) => (
          <span
            key={i}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {name.split(" ").slice(0, 2).join(" ")}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Helper: section card ────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
