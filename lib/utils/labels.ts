/**
 * Status and Segment Labels & Colors
 * Centralized source of truth for all status/segment visual representations
 */

// Lead Status Configuration
export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  booked: "Забронировано",
  lost: "Потерян",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-purple-100 text-purple-700",
  booked: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

// Conversation Status Configuration
export const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  active: "Активный",
  pending: "Ожидание",
  closed: "Закрыт",
};

export const CONVERSATION_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  closed: "bg-slate-100 text-slate-700",
};

// Lead Segment Configuration
export const SEGMENT_LABELS: Record<string, string> = {
  hot: "Горячий",
  warm: "Тёплый",
  cold: "Холодный",
};

export const SEGMENT_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};

export const SEGMENT_BADGE_COLORS: Record<string, string> = {
  hot: "bg-red-500 text-white",
  warm: "bg-amber-500 text-white",
  cold: "bg-blue-500 text-white",
};

// Task Status Configuration
export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "В ожидании",
  in_progress: "В процессе",
  completed: "Завершено",
  cancelled: "Отменено",
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// Activity Type Labels
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  lead_created: "Лид создан",
  lead_updated: "Лид обновлен",
  message_sent: "Сообщение отправлено",
  message_received: "Сообщение получено",
  conversation_closed: "Разговор закрыт",
  task_created: "Задача создана",
  task_completed: "Задача завершена",
};

// Helper functions
export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] || status;
}

export function getLeadStatusColor(status: string): string {
  return LEAD_STATUS_COLORS[status] || LEAD_STATUS_COLORS["new"];
}

export function getConversationStatusLabel(status: string): string {
  return CONVERSATION_STATUS_LABELS[status] || status;
}

export function getConversationStatusColor(status: string): string {
  return CONVERSATION_STATUS_COLORS[status] || CONVERSATION_STATUS_COLORS["active"];
}

export function getSegmentLabel(segment: string): string {
  return SEGMENT_LABELS[segment] || segment;
}

export function getSegmentColor(segment: string): string {
  return SEGMENT_COLORS[segment] || SEGMENT_COLORS["cold"];
}

export function getSegmentBadgeColor(segment: string): string {
  return SEGMENT_BADGE_COLORS[segment] || SEGMENT_BADGE_COLORS["cold"];
}

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] || status;
}

export function getTaskStatusColor(status: string): string {
  return TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS["pending"];
}

export function getActivityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] || type;
}
