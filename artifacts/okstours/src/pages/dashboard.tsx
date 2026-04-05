import React from "react";
import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Activity, Flame, CheckSquare, TrendingUp } from "lucide-react";
import { ChannelIcon } from "@/components/channel-icon";
import { Link } from "wouter";
import { format } from "date-fns";

const activityIcons: Record<string, React.ReactNode> = {
  new_lead: <Users className="h-3.5 w-3.5 text-blue-500" />,
  new_message: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
  booking: <CheckSquare className="h-3.5 w-3.5 text-purple-500" />,
  status_change: <TrendingUp className="h-3.5 w-3.5 text-amber-500" />,
  follow_up: <Flame className="h-3.5 w-3.5 text-orange-500" />,
  operator_reply: <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />,
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  if (statsLoading || activityLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Umumiy Ko'rinish</h1>
        <p className="text-muted-foreground">Bugungi operatsiyalar bir nazar bilan.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faol Suhbatlar</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.activeConversations ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jami {stats?.totalConversations ?? 0} suhbatdan
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jami Lidlar</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.bookedLeads ?? 0} ta bron qilindi
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issiq Lidlar</CardTitle>
            <Flame className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-red-500">{stats?.hotLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Darhol e'tibor talab qiladi
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bugungi Xabarlar</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.todayMessages ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Barcha kanallar bo'yicha
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">So'nggi Faoliyat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-muted rounded-full h-7 w-7 flex items-center justify-center shrink-0">
                    {activityIcons[item.type] ?? <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(item.createdAt), "d MMM, HH:mm")}
                    </p>
                  </div>
                  {item.conversationId && (
                    <Link href={`/conversations/${item.conversationId}`}>
                      <span className="text-xs text-primary hover:underline shrink-0">Ko'rish</span>
                    </Link>
                  )}
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Hali faoliyat yo'q
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kanal Taqsimoti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.channelBreakdown?.map((ch) => (
                <div key={ch.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={ch.channel} />
                    <span className="text-sm font-medium capitalize">{ch.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 bg-muted rounded-full w-16 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (ch.count / (stats.totalConversations || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-5 text-right">{ch.count}</span>
                  </div>
                </div>
              ))}
              {(!stats?.channelBreakdown || stats.channelBreakdown.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Kanal ma'lumotlari yo'q
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Iliq lidlar</span>
                <span className="font-semibold text-orange-500">{stats?.warmLeads ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sovuq lidlar</span>
                <span className="font-semibold text-blue-500">{stats?.coldLeads ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bron qilingan</span>
                <span className="font-semibold text-green-500">{stats?.bookedLeads ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
