import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import ChatBotPage from "../components/ChatBot/ChatBotPage";

type ChatPageParams = {
  sessionId?: string;
};

const ChatPage = () => {
  const { sessionId } = useParams<ChatPageParams>();
  const navigate = useNavigate();
  const createSessionWithId = useChatStore((state) => state.addServerSession);
  const setSessions = useChatStore((state) => state.setSessions);
  const sessions = useChatStore((state) => state.sessions);
  useEffect(() => {
    document.title = "MedVision - Chat";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Load all user sessions from backend on mount (server is source of truth)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("medvision_token") || "";
        const res = await fetch("http://localhost:3000/groq/sessions", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("Failed to fetch sessions", res.status);
          return;
        }

        const data = await res.json();
        if (!Array.isArray(data)) return;

        const normalized = data.map((s: any) => ({
          id: String(s.id),
          title: s.title || "New Chat",
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          messages: Array.isArray(s.messages)
            ? s.messages.map((m: any) => ({
                id: String(m.id),
                from: m.role === "bot" ? "bot" : "user",
                text: String(m.content || ""),
                timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
              }))
            : [],
        }));

        setSessions(normalized as any);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    })();
  }, [setSessions]);

  useEffect(() => {
    // If there's a sessionId in URL, fetch canonical session from backend and add it to store.
    if (!sessionId) return;

    (async () => {
      try {
        const token = localStorage.getItem("medvision_token") || "";
        const res = await fetch(
          `http://localhost:3000/groq/session/${sessionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          // session not found on server
          navigate(`/chat`, { replace: true });
          return;
        }

        const data = await res.json();

        // normalize server session to frontend shape
        const normalized = {
          id: String(data.id),
          title: data.title || "New Chat",
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          messages: Array.isArray(data.messages)
            ? data.messages.map((m: any) => ({
                id: String(m.id),
                from: m.role === "bot" ? "bot" : "user",
                text: String(m.content || ""),
                timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
              }))
            : [],
        };

        createSessionWithId(normalized as any);
      } catch (err) {
        console.error("Failed to fetch session:", err);
        navigate(`/chat`, { replace: true });
      }
    })();
  }, [sessionId, sessions, createSessionWithId, navigate]);

  return <ChatBotPage sessionId={sessionId} />;
};

export default ChatPage;
