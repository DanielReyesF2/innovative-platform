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
} from "lucide-react";
import { useAcceptSurvey, useRejectSurvey, useSurvey } from "../api";
import { useToast } from "@/components/ui/use-toast";

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
  const proposedScheduling = generalInfo.proposedScheduling as {
    proposedDate?: string;
    proposedTime?: string;
    responsibleName?: string;
    notes?: string;
  } | null;

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
          {/* Proposed scheduling from comercial */}
          {proposedScheduling && (
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-cyan-700" />
                <span className="text-sm font-semibold text-cyan-800">Propuesta de Comercial</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                {proposedScheduling.proposedDate && (
                  <div>
                    <span className="text-xs text-cyan-600">Fecha</span>
                    <div className="font-medium text-cyan-900">
                      {new Date(proposedScheduling.proposedDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                )}
                {proposedScheduling.proposedTime && (
                  <div>
                    <span className="text-xs text-cyan-600">Hora</span>
                    <div className="font-medium text-cyan-900">{proposedScheduling.proposedTime}</div>
                  </div>
                )}
                {proposedScheduling.responsibleName && (
                  <div>
                    <span className="text-xs text-cyan-600">Responsable</span>
                    <div className="font-medium text-cyan-900 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {proposedScheduling.responsibleName}
                    </div>
                  </div>
                )}
              </div>
              {proposedScheduling.notes && (
                <div className="mt-2 text-xs text-cyan-700">
                  <span className="font-medium">Notas:</span> {proposedScheduling.notes}
                </div>
              )}
            </div>
          )}

          {/* General Info */}
          <SectionCard title="Datos de la Empresa" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Razon Social" value={generalInfo.razonSocial} />
              <InfoRow label="RFC" value={generalInfo.rfc} />
              <InfoRow label="Direccion" value={generalInfo.direccion} />
              <InfoRow label="Giro" value={generalInfo.giro} />
              <InfoRow label="Num. Empleados" value={generalInfo.numEmpleados} />
              <InfoRow label="Horario" value={generalInfo.horarioOperacion} />
              <InfoRow label="Contacto Operativo" value={generalInfo.contactoOperativo} />
              <InfoRow label="Telefono Operativo" value={generalInfo.telefonoOperativo} />
            </div>
          </SectionCard>

          {/* Waste Types */}
          {surveyData.wasteTypes && surveyData.wasteTypes.length > 0 && (
            <SectionCard title="Tipos de Residuo" icon={<Recycle className="h-4 w-4" />}>
              <div className="space-y-2">
                {surveyData.wasteTypes.map((wt: any, i: number) => (
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

          {/* Current Services */}
          {surveyData.currentServices && (
            <SectionCard title="Servicios Actuales" icon={<Truck className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Proveedor" value={surveyData.currentServices.providerName} />
                <InfoRow label="Contrato Activo" value={surveyData.currentServices.contractActive ? "Si" : "No"} />
                <InfoRow label="Costo Mensual" value={surveyData.currentServices.monthlyCost ? `$${Number(surveyData.currentServices.monthlyCost).toLocaleString("es-MX")}` : undefined} />
                <InfoRow label="Frecuencia" value={surveyData.currentServices.collectionFrequency} />
                <InfoRow label="Tipo Servicio" value={surveyData.currentServices.serviceType} />
                <InfoRow label="Satisfaccion" value={surveyData.currentServices.satisfactionLevel ? `${surveyData.currentServices.satisfactionLevel}/10` : undefined} />
                <InfoRow label="Razon de Cambio" value={surveyData.currentServices.reasonForChange} />
              </div>
            </SectionCard>
          )}

          {/* Infrastructure */}
          {surveyData.infrastructure && (
            <SectionCard title="Infraestructura" icon={<Warehouse className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Area Almacenamiento" value={surveyData.infrastructure.hasStorageArea ? "Si" : "No"} />
                <InfoRow label="Tamano Area" value={surveyData.infrastructure.storageAreaSize} />
                <InfoRow label="Tipo Almacenamiento" value={surveyData.infrastructure.storageType} />
                <InfoRow label="Contenedores" value={surveyData.infrastructure.containerCount?.toString()} />
                <InfoRow label="Compactadora" value={surveyData.infrastructure.hasCompactor ? "Si" : "No"} />
                <InfoRow label="Bodega" value={surveyData.infrastructure.hasWarehouse ? "Si" : "No"} />
                <InfoRow label="Acceso Vehicular" value={surveyData.infrastructure.vehicleAccess} />
                <InfoRow label="Restricciones" value={surveyData.infrastructure.scheduleRestrictions} />
                <InfoRow label="Espacio Disponible" value={surveyData.infrastructure.availableSpace} />
              </div>
            </SectionCard>
          )}

          {/* Needs */}
          {surveyData.needs && (
            <SectionCard title="Necesidades" icon={<Target className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Separacion" value={surveyData.needs.needsSeparation ? "Si" : "No"} />
                <InfoRow label="Valorizacion" value={surveyData.needs.needsValorization ? "Si" : "No"} />
                <InfoRow label="Trazabilidad" value={surveyData.needs.needsTraceability ? "Si" : "No"} />
                <InfoRow label="Reportes Mensuales" value={surveyData.needs.needsMonthlyReporting ? "Si" : "No"} />
                <InfoRow label="Certificaciones" value={Array.isArray(surveyData.needs.certifications) ? surveyData.needs.certifications.join(", ") : surveyData.needs.certifications} />
                <InfoRow label="Presupuesto" value={surveyData.needs.availableBudget ? `$${Number(surveyData.needs.availableBudget).toLocaleString("es-MX")}` : undefined} />
                <InfoRow label="Urgencia" value={surveyData.needs.urgency} />
                <InfoRow label="Tomador de Decision" value={surveyData.needs.decisionMaker} />
                <InfoRow label="Metas Ambientales" value={surveyData.needs.environmentalGoals} />
              </div>
            </SectionCard>
          )}

          {/* Estimated values */}
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
                if (proposedScheduling?.proposedDate && !scheduledDate) {
                  setScheduledDate(proposedScheduling.proposedDate);
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
