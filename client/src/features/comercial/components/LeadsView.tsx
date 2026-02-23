import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useLeads } from "../api";
import { LeadForm } from "./LeadForm";
import { QualifyLeadDialog } from "./QualifyLeadDialog";

const SOURCE_LABELS: Record<string, string> = {
  referido: "Referido",
  web: "Web",
  linkedin: "LinkedIn",
  evento: "Evento",
  cold_call: "Cold Call",
  otro: "Otro",
};

const SOURCE_COLORS: Record<string, string> = {
  referido: "bg-green-100 text-green-800",
  web: "bg-blue-100 text-blue-800",
  linkedin: "bg-sky-100 text-sky-800",
  evento: "bg-purple-100 text-purple-800",
  cold_call: "bg-orange-100 text-orange-800",
  otro: "bg-gray-100 text-gray-800",
};

export function LeadsView() {
  const { data: leads = [] } = useLeads();
  const [showForm, setShowForm] = useState(false);
  const [qualifyLead, setQualifyLead] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = leads.filter((lead: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.companyName?.toLowerCase().includes(term) ||
      lead.contactName?.toLowerCase().includes(term) ||
      lead.contactPhone?.toLowerCase().includes(term) ||
      lead.contactEmail?.toLowerCase().includes(term)
    );
  });

  return (
    <>
      {/* Header with count and add button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} activo{leads.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lead list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Leads ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>{leads.length === 0 ? "No hay leads. Crea el primero." : "Sin resultados"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((lead: any) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{lead.companyName}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          SOURCE_COLORS[lead.source] || SOURCE_COLORS.otro
                        }`}
                      >
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>{lead.contactName}</span>
                      {lead.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.contactPhone}
                        </span>
                      )}
                      {lead.contactEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.contactEmail}
                        </span>
                      )}
                      {lead.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.createdAt).toLocaleDateString("es-MX")}
                        </span>
                      )}
                    </div>
                    {lead.notes && (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {lead.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-3 shrink-0"
                    onClick={() => setQualifyLead(lead)}
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    Calificar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showForm && <LeadForm onClose={() => setShowForm(false)} />}
      {qualifyLead && (
        <QualifyLeadDialog
          lead={qualifyLead}
          onClose={() => setQualifyLead(null)}
        />
      )}
    </>
  );
}
