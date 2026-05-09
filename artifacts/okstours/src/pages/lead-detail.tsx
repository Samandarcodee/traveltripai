import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetLead, useUpdateLead, useBookLead, useListLeadTasks, useCreateLeadTask, useUpdateTask, useDeleteTask } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft, Save, MapPin, DollarSign, MessageSquare, User, Phone,
  Mail, CheckCircle2, Plane, Calendar, Luggage, Users, CreditCard,
  Tag, Gift, Globe, Building2, Hash, Edit3, X, Plus, Trash2, Clock,
  CheckSquare, Square, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const segmentColors: Record<string, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusLabels: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  booked: "Забронировано",
  lost: "Потерян",
};

type FieldRowProps = {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  editing?: boolean;
  editEl?: React.ReactNode;
};

function FieldRow({ icon, label, value, editing, editEl }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </span>
      {editing && editEl ? (
        editEl
      ) : (
        <p className="text-sm font-medium">{value || <span className="text-muted-foreground/50 text-xs italic">—</span>}</p>
      )}
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGetLead(id, { query: { enabled: !!id } });
  const updateMutation = useUpdateLead();
  const bookMutation = useBookLead();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [bookOpen, setBookOpen] = useState(false);
  const [travelDate, setTravelDate] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const { data: tasks, refetch: refetchTasks } = useListLeadTasks(id, { query: { enabled: !!id } });
  const tasksList = Array.isArray(tasks) ? tasks : [];
  const createTaskMutation = useCreateLeadTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" as "low" | "medium" | "high" });
  const [addingTask, setAddingTask] = useState(false);

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) return;
    createTaskMutation.mutate(
      { leadId: id, data: { title: taskForm.title, description: taskForm.description || null, dueDate: taskForm.dueDate || null, priority: taskForm.priority } },
      {
        onSuccess: () => {
          refetchTasks();
          setTaskForm({ title: "", description: "", dueDate: "", priority: "medium" });
          setAddingTask(false);
          toast({ title: "Задача создана" });
        },
      }
    );
  };

  const handleToggleTask = (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "open" : "completed";
    updateTaskMutation.mutate(
      { id: taskId, data: { status: newStatus } },
      { onSuccess: () => refetchTasks() }
    );
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(
      { id: taskId },
      { onSuccess: () => refetchTasks() }
    );
  };

  React.useEffect(() => {
    if (lead && Object.keys(formData).length === 0) {
      setFormData({
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        status: lead.status,
        segment: lead.segment,
        destination: lead.destination || "",
        budget: lead.budget || "",
        interest: lead.interest || "",
        notes: lead.notes || "",
        airline: lead.airline || "",
        flightNumber: lead.flightNumber || "",
        bookingNumber: lead.bookingNumber || "",
        departureDate: lead.departureDate || "",
        arrivalDate: lead.arrivalDate || "",
        luggage: lead.luggage || "",
        handLuggage: lead.handLuggage || "",
        tariff: lead.tariff || "",
        passengersCount: lead.passengersCount || "",
        serviceClass: lead.serviceClass || "",
        paymentStatus: lead.paymentStatus || "",
        ageCategory: lead.ageCategory || "",
        leadSource: lead.leadSource || "",
        birthday: lead.birthday || "",
        assignedTo: lead.assignedTo || "",
      });
    }
  }, [lead]);

  const setField = (key: string, val: string) => setFormData((prev: Record<string, any>) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const toSend: Record<string, any> = { ...formData };
    Object.keys(toSend).forEach((k) => {
      if (toSend[k] === "") toSend[k] = null;
    });
    updateMutation.mutate(
      { id, data: toSend as any },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/leads/${id}`], data);
          setIsEditing(false);
          toast({ title: "Сохранено", description: "Лид успешно обновлён." });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при сохранении.", variant: "destructive" });
        },
      }
    );
  };

  const handleBook = () => {
    bookMutation.mutate(
      { id, data: { travelDate: travelDate || null, notes: bookNotes || null } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/leads/${id}`], data);
          setBookOpen(false);
          toast({
            title: "Бронь подтверждена!",
            description: `Бронь ${lead?.name ?? "Клиент"} успешно подтверждена.`,
          });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при подтверждении брони.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Загрузка...</div>;
  if (!lead) return <div className="p-8 text-center">Лид не найден</div>;

  const f = formData;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Назад к лидам
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {lead.conversationId && (
            <Link href={`/conversations/${lead.conversationId}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Чат
              </Button>
            </Link>
          )}
          {lead.status !== "booked" && lead.status !== "lost" && (
            <Dialog open={bookOpen} onOpenChange={setBookOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs">
                  <Plane className="w-3.5 h-3.5" /> Подтвердить бронь
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Подтверждение брони</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    При подтверждении брони <strong>{lead.name ?? "Клиент"}</strong>, AI агент автоматически отправит подтверждение.
                  </p>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Дата поездки (необязательно)</label>
                    <Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Примечание (необязательно)</label>
                    <Textarea
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="Номер рейса, отель..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setBookOpen(false)}>Отмена</Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={handleBook} disabled={bookMutation.isPending}>
                      <CheckCircle2 className="w-4 h-4" />
                      {bookMutation.isPending ? "..." : "Подтвердить"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs gap-1">
                <X className="w-3 h-3" /> Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="text-xs gap-1">
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-xs gap-1">
              <Edit3 className="w-3.5 h-3.5" /> Редактировать
            </Button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2">
          {isEditing ? (
            <Input value={f.name} onChange={(e) => setField("name", e.target.value)} className="text-xl font-bold h-10 max-w-xs" />
          ) : (
            lead.name || "Неизвестный лид"
          )}
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isEditing ? (
            <Select value={f.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новый</SelectItem>
                <SelectItem value="contacted">Связались</SelectItem>
                <SelectItem value="qualified">Квалифицирован</SelectItem>
                <SelectItem value="booked">Забронировано</SelectItem>
                <SelectItem value="lost">Потерян</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={lead.status === "booked" ? "bg-green-100 text-green-700 border-green-200" : ""}>
              {statusLabels[lead.status] ?? lead.status}
            </Badge>
          )}
          {isEditing ? (
            <Select value={f.segment} onValueChange={(v) => setField("segment", v)}>
              <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Горячий</SelectItem>
                <SelectItem value="warm">Тёплый</SelectItem>
                <SelectItem value="cold">Холодный</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className={`${segmentColors[lead.segment] ?? ""}`}>
              {lead.segment === "hot" ? "Горячий" : lead.segment === "warm" ? "Тёплый" : "Холодный"}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Добавлен {format(new Date(lead.createdAt), "d MMM yyyy", { locale: ru })}
          </span>
        </div>
      </div>

      <Tabs defaultValue="main" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="main">Основное</TabsTrigger>
          <TabsTrigger value="flight">Авиабилет</TabsTrigger>
          <TabsTrigger value="contact">Контакт</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            Задачи
            {tasks && tasks.filter(t => t.status === "open").length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {tasks.filter(t => t.status === "open").length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="mt-0 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Данные о путешествии</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <FieldRow
                icon={<MapPin className="w-3 h-3" />}
                label="Направление"
                value={lead.destination}
                editing={isEditing}
                editEl={<Input value={f.destination} onChange={(e) => setField("destination", e.target.value)} className="h-8 text-sm" placeholder="Дубай, Турция..." />}
              />
              <FieldRow
                icon={<DollarSign className="w-3 h-3" />}
                label="Бюджет"
                value={lead.budget}
                editing={isEditing}
                editEl={<Input value={f.budget} onChange={(e) => setField("budget", e.target.value)} className="h-8 text-sm" placeholder="$1000" />}
              />
              <FieldRow
                icon={<Tag className="w-3 h-3" />}
                label="Интерес"
                value={lead.interest}
                editing={isEditing}
                editEl={<Input value={f.interest} onChange={(e) => setField("interest", e.target.value)} className="h-8 text-sm" placeholder="Тур, авиабилет..." />}
              />
              <FieldRow
                icon={<Globe className="w-3 h-3" />}
                label="Источник"
                value={lead.leadSource}
                editing={isEditing}
                editEl={
                  <Select value={f.leadSource || "none"} onValueChange={(v) => setField("leadSource", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="web">Веб сайт</SelectItem>
                      <SelectItem value="phone">Телефон</SelectItem>
                      <SelectItem value="referral">Рекомендация</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow
                icon={<User className="w-3 h-3" />}
                label="Ответственный оператор"
                value={lead.assignedTo}
                editing={isEditing}
                editEl={<Input value={f.assignedTo} onChange={(e) => setField("assignedTo", e.target.value)} className="h-8 text-sm" placeholder="Имя фамилия" />}
              />
              <FieldRow
                icon={<Gift className="w-3 h-3" />}
                label="Дата рождения"
                value={lead.birthday}
                editing={isEditing}
                editEl={<Input type="date" value={f.birthday} onChange={(e) => setField("birthday", e.target.value)} className="h-8 text-sm" />}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Внутреннее примечание</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={f.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="min-h-[110px] text-sm"
                  placeholder="Дополнительная информация о клиенте..."
                />
              ) : (
                <div className="bg-muted/40 p-3 rounded-md text-sm whitespace-pre-wrap min-h-[80px] text-muted-foreground">
                  {lead.notes || "Примечаний пока нет."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flight" className="mt-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" /> Данные авиабилета
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <FieldRow
                icon={<Building2 className="w-3 h-3" />}
                label="Авиакомпания"
                value={lead.airline}
                editing={isEditing}
                editEl={<Input value={f.airline} onChange={(e) => setField("airline", e.target.value)} className="h-8 text-sm" placeholder="Uzbekistan Airways" />}
              />
              <FieldRow
                icon={<Hash className="w-3 h-3" />}
                label="Номер рейса"
                value={lead.flightNumber}
                editing={isEditing}
                editEl={<Input value={f.flightNumber} onChange={(e) => setField("flightNumber", e.target.value)} className="h-8 text-sm" placeholder="HY-701" />}
              />
              <FieldRow
                icon={<Hash className="w-3 h-3" />}
                label="Номер брони"
                value={lead.bookingNumber}
                editing={isEditing}
                editEl={<Input value={f.bookingNumber} onChange={(e) => setField("bookingNumber", e.target.value)} className="h-8 text-sm" placeholder="ABCD12" />}
              />
              <FieldRow
                icon={<Calendar className="w-3 h-3" />}
                label="Дата вылета"
                value={lead.departureDate}
                editing={isEditing}
                editEl={<Input value={f.departureDate} onChange={(e) => setField("departureDate", e.target.value)} className="h-8 text-sm" placeholder="2025-05-10 10:00" />}
              />
              <FieldRow
                icon={<Calendar className="w-3 h-3" />}
                label="Дата прилёта"
                value={lead.arrivalDate}
                editing={isEditing}
                editEl={<Input value={f.arrivalDate} onChange={(e) => setField("arrivalDate", e.target.value)} className="h-8 text-sm" placeholder="2025-05-20 18:00" />}
              />
              <FieldRow
                icon={<Users className="w-3 h-3" />}
                label="Кол-во пассажиров"
                value={lead.passengersCount}
                editing={isEditing}
                editEl={<Input type="number" min={1} value={f.passengersCount} onChange={(e) => setField("passengersCount", e.target.value)} className="h-8 text-sm" placeholder="2" />}
              />
              <FieldRow
                icon={<Luggage className="w-3 h-3" />}
                label="Багаж"
                value={lead.luggage}
                editing={isEditing}
                editEl={<Input value={f.luggage} onChange={(e) => setField("luggage", e.target.value)} className="h-8 text-sm" placeholder="23 кг" />}
              />
              <FieldRow
                icon={<Luggage className="w-3 h-3" />}
                label="Ручная кладь"
                value={lead.handLuggage}
                editing={isEditing}
                editEl={<Input value={f.handLuggage} onChange={(e) => setField("handLuggage", e.target.value)} className="h-8 text-sm" placeholder="8 кг" />}
              />
              <FieldRow
                icon={<Tag className="w-3 h-3" />}
                label="Тариф"
                value={lead.tariff}
                editing={isEditing}
                editEl={
                  <Select value={f.tariff || "none"} onValueChange={(v) => setField("tariff", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="comfort">Comfort</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First Class</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow
                icon={<Tag className="w-3 h-3" />}
                label="Класс обслуживания"
                value={lead.serviceClass}
                editing={isEditing}
                editEl={
                  <Select value={f.serviceClass || "none"} onValueChange={(v) => setField("serviceClass", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="economy">Economy (Y)</SelectItem>
                      <SelectItem value="business">Business (C)</SelectItem>
                      <SelectItem value="first">First (F)</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow
                icon={<CreditCard className="w-3 h-3" />}
                label="Статус оплаты"
                value={lead.paymentStatus}
                editing={isEditing}
                editEl={
                  <Select value={f.paymentStatus || "none"} onValueChange={(v) => setField("paymentStatus", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="pending">Не оплачено</SelectItem>
                      <SelectItem value="partial">Частично оплачено</SelectItem>
                      <SelectItem value="paid">Оплачено</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow
                icon={<Users className="w-3 h-3" />}
                label="Возрастная категория"
                value={lead.ageCategory}
                editing={isEditing}
                editEl={
                  <Select value={f.ageCategory || "none"} onValueChange={(v) => setField("ageCategory", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="adult">Взрослый</SelectItem>
                      <SelectItem value="child">Ребёнок (2-12)</SelectItem>
                      <SelectItem value="infant">Младенец (0-2)</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Список задач</h3>
              <p className="text-xs text-muted-foreground">
                {tasksList.filter(t => t.status === "open").length} открытых, {tasksList.filter(t => t.status === "completed").length} выполнено
              </p>
            </div>
            {!addingTask && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setAddingTask(true)}>
                <Plus className="h-3.5 w-3.5" /> Добавить задачу
              </Button>
            )}
          </div>

          {addingTask && (
            <Card className="shadow-sm border-primary/30">
              <CardContent className="py-4 space-y-3">
                <Input
                  autoFocus
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Название задачи..."
                  className="h-9"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Срок</label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Приоритет</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  </div>
                </div>
                <Input
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Примечание (необязательно)..."
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setAddingTask(false)}>
                    Отмена
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleCreateTask} disabled={!taskForm.title.trim() || createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "..." : "Сохранить"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(!tasks || tasks.length === 0) && !addingTask ? (
            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Задач пока нет</p>
              <p className="text-xs mt-1">Добавьте задачу для отслеживания</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasksList.map((task) => {
                const isDone = task.status === "completed";
                const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date();
                const priorityConfig = {
                  high: { label: "Высокий", color: "text-red-500", bg: "bg-red-50 border-red-100" },
                  medium: { label: "Средний", color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
                  low: { label: "Низкий", color: "text-blue-400", bg: "bg-blue-50 border-blue-100" },
                };
                const pc = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isDone ? "opacity-50 bg-muted/30" : "bg-card hover:border-primary/30"
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="mt-0.5 shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="h-4 w-4 text-green-500" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${pc.bg} ${pc.color}`}>
                          {pc.label}
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                            {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {format(new Date(task.dueDate), "d MMM yyyy", { locale: ru })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contact" className="mt-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Контактные данные</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow
                icon={<User className="w-3 h-3" />}
                label="Имя"
                value={lead.name}
                editing={isEditing}
                editEl={<Input value={f.name} onChange={(e) => setField("name", e.target.value)} className="h-8 text-sm" />}
              />
              <FieldRow
                icon={<Phone className="w-3 h-3" />}
                label="Телефон"
                value={lead.phone}
                editing={isEditing}
                editEl={<Input value={f.phone} onChange={(e) => setField("phone", e.target.value)} className="h-8 text-sm" placeholder="+998901234567" />}
              />
              <FieldRow
                icon={<Mail className="w-3 h-3" />}
                label="Email"
                value={lead.email}
                editing={isEditing}
                editEl={<Input value={f.email} onChange={(e) => setField("email", e.target.value)} className="h-8 text-sm" placeholder="email@gmail.com" />}
              />
              <FieldRow
                icon={<Gift className="w-3 h-3" />}
                label="Дата рождения"
                value={lead.birthday}
                editing={isEditing}
                editEl={<Input type="date" value={f.birthday} onChange={(e) => setField("birthday", e.target.value)} className="h-8 text-sm" />}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
