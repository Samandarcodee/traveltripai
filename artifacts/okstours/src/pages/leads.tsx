import React, { useState } from "react";
import { Link } from "wouter";
import { useListLeads } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Users, Filter, Plus, Search, Phone, Mail, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Leads() {
  const [segment, setSegment] = useState<string>("all");
  const { data: leads, isLoading } = useListLeads({
    segment: segment !== "all" ? (segment as any) : undefined
  });

  const getSegmentColor = (seg: string) => {
    switch (seg) {
      case 'hot': return "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800";
      case 'warm': return "bg-orange-500/10 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-800";
      case 'cold': return "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage prospective clients and bookings.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Loading leads...</div>
        ) : !leads || leads.length === 0 ? (
          <div className="p-12 bg-card border rounded-lg flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No leads found</h3>
            <p className="text-muted-foreground mt-1">Try changing your filters or add a new lead.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block group">
                <div className="bg-card border hover:border-primary/50 hover:shadow-md transition-all p-5 rounded-xl h-full flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {lead.name || "Unknown Lead"}
                    </h3>
                    <Badge variant="outline" className={`ml-2 capitalize ${getSegmentColor(lead.segment)}`}>
                      {lead.segment}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mt-auto">
                    {lead.destination && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span className="truncate">{lead.destination}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize text-[10px] font-medium tracking-wide">
                      {lead.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                      {format(new Date(lead.createdAt), "MMM d")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
