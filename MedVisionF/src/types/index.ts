export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN" | "RECEPTIONIST";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  specialty?: string;
  token?: string; // JWT token from backend
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: "APPOINTMENT" | "CHAT" | "REMINDER" | "INFO" | "WARNING" | "BOOKING";
}

export interface ChatMessage {
  id: string;
  from: "bot" | "user";
  text: string;
  image?: string; // base64 data URL for attached images
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export type ChatOption = "appointment" | "symptoms" | "disease" | null;
export type Theme = "light" | "dark";
