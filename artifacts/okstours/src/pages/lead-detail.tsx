import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetLead, useUpdateLead } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Save, MapPin, DollarSign, Calendar, MessageSquare, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function LeadDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGetLead(id, { 
    query: { enabled: !!id } 
  });
  
  const updateMutation = useUpdateLead();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  React.useEffect(() => {
    if (lead && !formData) {
      setFormData({
        status: lead.status,
        segment: lead.segment,
        notes: lead.notes || "",
      });
    }
  }, [lead]);

  const handleSave = () => {
    updateMutation.mutate(
      { id, data: formData },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/leads/${id}`], data);
          setIsEditing(false);
          toast({ title: "Lead updated", description: "The lead has been successfully updated." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading lead...</div>;
  if (!lead) return <div className="p-8 text-center">Lead not found</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Leads
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Lead
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{lead.name || "Unknown Lead"}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {isEditing ? (
              <Select value={formData?.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className="capitalize">{lead.status}</Badge>
            )}

            {isEditing ? (
              <Select value={formData?.segment} onValueChange={(v) => setFormData({...formData, segment: v})}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="capitalize">{lead.segment}</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Added {format(new Date(lead.createdAt), "PPP")}
            </span>
          </div>
        </div>
        
        {lead.conversationId && (
          <Link href={`/conversations/${lead.conversationId}`}>
            <Button variant="secondary">
              <MessageSquare className="w-4 h-4 mr-2" /> View Chat
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="md:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg">Trip Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Destination</span>
                <p className="font-medium">{lead.destination || "Not specified"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><DollarSign className="w-3 h-3"/> Budget</span>
                <p className="font-medium">{lead.budget || "Not specified"}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Interest</span>
                <p className="font-medium">{lead.interest || "Not specified"}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2 mt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Internal Notes</span>
              {isEditing ? (
                <Textarea 
                  value={formData?.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[120px]"
                  placeholder="Add notes about this lead..."
                />
              ) : (
                <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap min-h-[120px]">
                  {lead.notes || "No notes added yet."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Name</span>
                <span className="font-medium">{lead.name || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Phone</span>
                <span className="font-medium">{lead.phone || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="font-medium">{lead.email || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
