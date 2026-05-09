import React from "react";
import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Activity, Flame, CheckSquare, TrendingUp, Target } from "lucide-react";
import { ChannelIcon } from "@/components/channel-icon";
import { Link } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DashboardSkeleton } from "@/components/page-skeleton";

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
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Общий обзор</h1>
        <p className="text-muted-foreground">Операции за сегодня с первого взгляда.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Активные диалоги</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.activeConversations ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Из {stats?.totalConversations ?? 0} всего
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Всего лидов</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.bookedLeads ?? 0} забронировано
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Горячие лиды</CardTitle>
            <Flame className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-red-500">{stats?.hotLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Требует немедленного внимания
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Сообщения за сегодня</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.todayMessages ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              По всем каналам
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Последняя активность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(activity) ? activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 bg-muted rounded-full h-7 w-7 flex items-center justify-center shrink-0">
                    {activityIcons[item.type] ?? <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(item.createdAt), "d MMM, HH:mm", { locale: ru })}
                    </p>
                  </div>
                  {item.conversationId && (
                    <Link href={`/conversations/${item.conversationId}`}>
                      <span className="text-xs text-primary hover:underline shrink-0">Открыть</span>
                    </Link>
                  )}
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Активности пока нет
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Распределение по каналам</CardTitle>
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
                  Нет данных по каналам
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Тёплые лиды</span>
                <span className="font-semibold text-orange-500">{stats?.warmLeads ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Холодные лиды</span>
                <span className="font-semibold text-blue-500">{stats?.coldLeads ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Забронировано</span>
                <span className="font-semibold text-green-500">{stats?.bookedLeads ?? 0}</span>
              </div>
            </div>

            {stats && (stats.totalLeads ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="w-3 h-3" />
                    <span>Конверсия в бронь</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {Math.round(((stats.bookedLeads ?? 0) / (stats.totalLeads ?? 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round(((stats.bookedLeads ?? 0) / (stats.totalLeads ?? 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {stats.bookedLeads ?? 0} из {stats.totalLeads ?? 0} лидов стали клиентами
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
