import { create } from "zustand";
import {
  ChatMessage as BaseChatMessage,
  ChatSession as BaseChatSession,
} from "../types";

type ChatOption = "health" | "disease";

export interface ChatMessage extends BaseChatMessage {
  option?: ChatOption;
}

export interface ChatSession extends BaseChatSession {
  title: string;
  messages: ChatMessage[];
}

interface ChatState {
  sessions: ChatSession[];
  // add or replace a session coming from the server
  addServerSession: (session: ChatSession) => void;
  setSessions: (sessions: ChatSession[]) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  appendToken: (sessionId: string, msgId: string, token: string) => void;
  updateMessageText: (sessionId: string, msgId: string, text: string) => void;
  deleteSession: (sessionId: string) => void;
  getActiveSession: (sessionId: string) => ChatSession | undefined;
}

// Note: server sessions are normalized where needed before calling `addServerSession`

const stripToolCallMarkup = (text: string) =>
  text.replace(/<function(?:=[^>]+)?>[\s\S]*?<\/function>/g, "");

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],

  addServerSession: (session) =>
    set((state) => {
      const existing = state.sessions.find((s) => s.id === session.id);
      if (existing) {
        return {
          sessions: state.sessions.map((s) =>
            s.id === session.id ? session : s,
          ),
        };
      }
      return { sessions: [session, ...state.sessions] };
    }),

  setSessions: (sessions) => set({ sessions }),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const title =
          session.messages.length === 0 && message.from === "user"
            ? message.text.trim().slice(0, 28) || "New Chat"
            : session.title;
        return { ...session, title, messages: [...session.messages, message] };
      }),
    })),

  appendToken: (sessionId, msgId, token) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: session.messages.map((message) =>
            message.id === msgId
              ? {
                  ...message,
                  text: stripToolCallMarkup(`${message.text}${token}`),
                }
              : message,
          ),
        };
      }),
    })),

  updateMessageText: (sessionId, msgId, text) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: session.messages.map((message) =>
            message.id === msgId
              ? { ...message, text: stripToolCallMarkup(text) }
              : message,
          ),
        };
      }),
    })),

  deleteSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== sessionId),
    })),

  getActiveSession: (sessionId) =>
    get().sessions.find((session) => session.id === sessionId),
}));
