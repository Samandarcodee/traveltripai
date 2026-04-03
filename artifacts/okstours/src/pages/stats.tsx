import React, { useState } from "react";
import { useGetTimeSeries, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, MessageSquare, Users, CheckSquare } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";

export default function Stats() {
  const [period, setPeriod] = useState<Period>("daily");

  const { data: timeSeries, isLoading: tsLoading } = useGetTimeSeries({ period });
  const { data: dashboard } = useGetDashboardStats();

  const formatDate = (date: string) => {
    if (period === "monthly") {
      const [y, m] = date.split("-");
      return new Date(Number(y), Number(m) - 1).toLocaleDateString("uz-UZ", { month: "short", year: "2-digit" });
    }
    if (period === "weekly") {
      return new Date(date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" });
    }
    return new Date(date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" });
  };

  const chartData = (timeSeries?.data ?? []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Statistika</h1>
        <p className="text-muted-foreground">Kunlik, haftalik va oylik ishlash ko'rsatkichlari.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {period === "daily" ? "So'nggi 30 kun" : period === "weekly" ? "So'nggi 12 hafta" : "So'nggi 12 oy"} — Xabarlar
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeSeries?.totalMessages ?? 0}</div>
            <p className="text-xs text-muted-foreground">Jami xabarlar</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yangi Lidlar</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeSeries?.totalLeads ?? 0}</div>
            <p className="text-xs text-muted-foreground">Jami yangi mijozlar</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bronlar</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{timeSeries?.totalBookings ?? 0}</div>
            <p className="text-xs text-muted-foreground">Tasdiqlangan bronlar</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Xabarlar dinamikasi
            </CardTitle>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="daily">Kunlik</TabsTrigger>
              <TabsTrigger value="weekly">Haftalik</TabsTrigger>
              <TabsTrigger value="monthly">Oylik</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {tsLoading ? (
            <div className="h-64 flex items-center justify-center animate-pulse text-muted-foreground">Yuklanmoqda...</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Xabarlar"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorMessages)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Lidlar va Bronlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tsLoading ? (
            <div className="h-64 flex items-center justify-center animate-pulse text-muted-foreground">Yuklanmoqda...</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="leads" name="Yangi Lidlar" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="bookings" name="Bronlar" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Umumiy Suhbatlar", value: dashboard.totalConversations, sub: `${dashboard.activeConversations} faol` },
            { label: "Jami Lidlar", value: dashboard.totalLeads, sub: `${dashboard.hotLeads} issiq` },
            { label: "Bronlar", value: dashboard.bookedLeads, sub: "tasdiqlangan" },
            { label: "Bugungi Xabarlar", value: dashboard.todayMessages, sub: "barcha kanallar" },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="pt-5">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium text-foreground mt-0.5">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
