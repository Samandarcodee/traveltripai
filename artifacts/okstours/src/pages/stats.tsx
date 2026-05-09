import React, { useState } from "react";
import { useGetTimeSeries, useGetDashboardStats, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, MessageSquare, Users, CheckSquare, Percent, Target } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалиф.",
  booked: "Бронь",
  lost: "Потерян",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#64748b",
  contacted: "#f59e0b",
  qualified: "#a855f7",
  booked: "#22c55e",
  lost: "#ef4444",
};

const SEGMENT_COLORS = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "#3b82f6",
};

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function Stats() {
  const [period, setPeriod] = useState<Period>("daily");

  const { data: timeSeries, isLoading: tsLoading } = useGetTimeSeries({ period });
  const { data: dashboard } = useGetDashboardStats();
  const { data: leads } = useListLeads({});
  const leadsList = Array.isArray(leads) ? leads : [];

  const formatDate = (date: string) => {
    if (period === "monthly") {
      const [y, m] = date.split("-");
      return new Date(Number(y), Number(m) - 1).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
    }
    return new Date(date).toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
  };

  const chartData = (timeSeries?.data ?? []).map((d) => ({ ...d, date: formatDate(d.date) }));

  const conversionRate = dashboard && (dashboard.totalLeads ?? 0) > 0
    ? Math.round(((dashboard.bookedLeads ?? 0) / (dashboard.totalLeads ?? 1)) * 100)
    : 0;

  const segmentData = [
    { name: "Горячий", value: dashboard?.hotLeads ?? 0, color: SEGMENT_COLORS.hot },
    { name: "Тёплый", value: dashboard?.warmLeads ?? 0, color: SEGMENT_COLORS.warm },
    { name: "Холодный", value: dashboard?.coldLeads ?? 0, color: SEGMENT_COLORS.cold },
  ].filter((s) => s.value > 0);

  const statusCounts: Record<string, number> = {};
  leadsList.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([key, count]) => ({
    name: STATUS_LABELS[key] ?? key,
    count,
    fill: STATUS_COLORS[key] ?? "#64748b",
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Статистика</h1>
        <p className="text-muted-foreground">Ежедневные, еженедельные и ежемесячные показатели работы.</p>
      </div>

      {/* ── TOP KPI CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {period === "daily" ? "30 дней" : period === "weekly" ? "12 недель" : "12 мес."} — Сообщений
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{timeSeries?.totalMessages ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Всего сообщений</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Новые лиды</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{timeSeries?.totalLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Всего новых клиентов</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Брони</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{timeSeries?.totalBookings ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Подтверждённые брони</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Конверсия</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-primary">{conversionRate}%</div>
            <div className="mt-1.5 w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${conversionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.bookedLeads ?? 0} из {dashboard?.totalLeads ?? 0} лидов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── CHARTS ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Динамика сообщений
            </CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="daily">Ежедневно</TabsTrigger>
                <TabsTrigger value="weekly">Еженедельно</TabsTrigger>
                <TabsTrigger value="monthly">Ежемесячно</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="h-52 flex items-center justify-center animate-pulse text-muted-foreground">Загрузка...</div>
            ) : chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <RechartTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="messages" name="Сообщения"
                    stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorMessages)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Percent className="h-4 w-4 text-primary" />
              Сегменты лидов
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Нет данных</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={segmentData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      labelLine={false} label={renderCustomLabel}>
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-1">
                  {segmentData.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── LEADS BAR + STATUS FUNNEL ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Лиды и брони
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="h-52 flex items-center justify-center animate-pulse text-muted-foreground">Загрузка...</div>
            ) : chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <RechartTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="leads" name="Новые лиды" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar dataKey="bookings" name="Брони" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              Воронка статусов
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">Нет данных</div>
            ) : (
              <div className="space-y-2.5 mt-1">
                {statusData.map((s) => {
                  const maxCount = Math.max(...statusData.map((d) => d.count), 1);
                  return (
                    <div key={s.name} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-semibold">{s.count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(s.count / maxCount) * 100}%`,
                            background: s.fill,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {dashboard && (
              <div className="mt-5 pt-4 border-t space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Всего диалогов</span>
                  <span className="font-semibold">{dashboard.totalConversations}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Активных</span>
                  <span className="font-semibold text-primary">{dashboard.activeConversations}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Конверсия</span>
                  <span className="font-semibold text-green-600">{conversionRate}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
