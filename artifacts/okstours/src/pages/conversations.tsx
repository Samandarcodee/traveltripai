import React, { useState } from "react";
import { Link } from "wouter";
import { useListConversations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { MessageSquare, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channel-icon";

export default function Conversations() {
  const [status, setStatus] = useState<string>("all");
  const { data: conversations, isLoading } = useListConversations({
    status: status !== "all" ? (status as any) : undefined
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground">Manage and review AI customer interactions.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Loading conversations...</div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No conversations found</h3>
            <p className="text-muted-foreground mt-1">Try changing your filters.</p>
          </div>
        ) : (
          <div className="divide-y overflow-auto">
            {conversations.map((conv) => (
              <Link 
                key={conv.id} 
                href={`/conversations/${conv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group block"
              >
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <ChannelIcon channel={conv.channel} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {conv.customerName || conv.customerPhone || "Anonymous User"}
                      </span>
                      <Badge variant={conv.status === 'active' ? 'default' : conv.status === 'pending' ? 'secondary' : 'outline'} className="text-[10px] h-5 capitalize">
                        {conv.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), "MMM d, h:mm a") : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage || "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
