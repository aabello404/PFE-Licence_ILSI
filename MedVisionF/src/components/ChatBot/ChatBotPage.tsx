import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  BotIcon,
  PlusIcon,
  SendIcon,
  ImageUploadIcon,
  CloseIcon,
  StethoscopeIcon,
  MicroscopeIcon,
  ChevronLeftIcon,
  MenuIcon,
} from "../Icons";
import ChatMessage, { renderMarkdown } from "./ChatMessage";
import styles from "./ChatBotPage.module.css";

type ChatOption = "health" | "disease";

interface ExtendedChatMessage {
  id: string;
  from: "user" | "bot";
  text: string;
  image?: string;
  option?: ChatOption;
  timestamp: Date;
}

const generateId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

interface ChatBotPageProps {
  sessionId?: string;
}

const ChatBotPage: React.FC<ChatBotPageProps> = ({ sessionId }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const sessions = useChatStore((state) => state.sessions);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendToken = useChatStore((state) => state.appendToken);
  const updateMessageText = useChatStore((state) => state.updateMessageText);
  const addServerSession = useChatStore((state) => state.addServerSession);

  const [selectedOption, setSelectedOption] = useState<ChatOption | null>(null);
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const stored = localStorage.getItem("medbot_sidebar");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return window.innerWidth >= 768;
  });
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Disease detection states
  const [diseaseModel, setDiseaseModel] = useState<"lc25000" | "aptos" | null>(null);
  const [diseaseImage, setDiseaseImage] = useState<File | null>(null);
  const [diseaseImagePreview, setDiseaseImagePreview] = useState<string | null>(null);
  const [doctorQuestion, setDoctorQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    ai_result: {
      model: "lc25000" | "aptos";
      prediction: string;
      confidence: number;
      all_probs: Record<string, number>;
    };
    interpretation: string;
    doctor_message: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diseaseFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const activeSession = useMemo(
    () => sessions.find((session) => session.id === sessionId),
    [sessions, sessionId],
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("medbot_sidebar", String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, isTyping]);

  const session = activeSession;
  const messages = session?.messages ?? [];
  const isWelcomeMode = messages.length === 0;
  const canSend =
    Boolean(selectedOption) &&
    (selectedOption === "health"
      ? inputText.trim().length > 0
      : inputText.trim().length > 0 || Boolean(imagePreview));

  const placeholderText =
    selectedOption === "disease"
      ? "Describe the case details. Image is optional but helpful."
      : "Describe your symptoms or appointment request...";

  const handleNewChat = () => {
    (async () => {
      try {
        const token =
          user?.token ?? localStorage.getItem("medvision_token") ?? "";
        const res = await fetch("http://localhost:3000/groq/session/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: "New Chat" }),
        });

        if (!res.ok) throw new Error(`status ${res.status}`);
        const created = await res.json();
        const sid = String(
          created?.id ?? created?.sessionId ?? created?.session?.id,
        );
        if (!sid) throw new Error("no id returned");

        // navigate to canonical server session id
        navigate(`/chat/${sid}`);
      } catch (err) {
        console.error("Failed to create server session:", err);
        // fallback: navigate to base chat (no id)
        navigate(`/chat`);
      }
    })();
  };

  const handleOptionSelect = (option: ChatOption) => {
    setSelectedOption(option);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const resizeTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const maxHeight = 24 * 6;
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
  };

  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInputText(event.target.value);
    resizeTextarea();
  };

  const handleTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!canSend || !selectedOption) return;
    const trimmedText = inputText.trim();
    if (selectedOption === "health" && trimmedText.length === 0) return;
    if (
      selectedOption === "disease" &&
      trimmedText.length === 0 &&
      !imagePreview
    )
      return;
    const userMessage: ExtendedChatMessage = {
      id: `user-${generateId()}`,
      from: "user",
      text: trimmedText,
      image: imagePreview || undefined,
      option: selectedOption,
      timestamp: new Date(),
    };

    let serverSessionId: number | null = null;
    let finalSessionId: string;

    // If there is an existing session id in the URL and it maps to a session,
    // use it. Otherwise try to create a server session and fall back to a
    // short local id if the network call fails.
    if (session) {
      finalSessionId = sessionId!;
    } else {
      try {
        const token =
          user?.token ?? localStorage.getItem("medvision_token") ?? "";
        const res = await fetch("http://localhost:3000/groq/session/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: "New Chat" }),
        });

        if (!res.ok) {
          throw new Error(`Failed to create session: ${res.status}`);
        }

        const created = await res.json();
        serverSessionId = created?.id ?? null;
        if (serverSessionId == null) {
          throw new Error("Server returned no session id");
        }

        finalSessionId = String(serverSessionId);

        // Update URL to canonical server session id
        navigate(`/chat/${finalSessionId}`, { replace: true });

        // Add server session to local store (server is source of truth)
        addServerSession({
          id: finalSessionId,
          title: "New Chat",
          createdAt: new Date(),
          messages: [],
        });
      } catch (err) {
        console.error("Failed to create server session:", err);
        // fallback: do not create a local-only persistent session; create a transient in-memory session
        finalSessionId = `local-${Date.now()}`;
        addServerSession({
          id: finalSessionId,
          title: "New Chat",
          createdAt: new Date(),
          messages: [],
        });
      }
    }

    // Add user message locally
    addMessage(finalSessionId, userMessage);
    setInputText("");
    setImagePreview(null);
    setIsSending(true);
    setIsTyping(true);
    resizeTextarea();

    const botMessageId = `bot-${generateId()}`;
    addMessage(finalSessionId, {
      id: botMessageId,
      from: "bot",
      text: "",
      timestamp: new Date(),
    });

    try {
      const token =
        user?.token ?? localStorage.getItem("medvision_token") ?? "";

      // Send to backend groq chat/send endpoint; session id expected as number
      const payload = {
        sessionId: Number(finalSessionId),
        message: trimmedText,
        context: {
          userId: user?.id ?? "",
          userRole: user?.role ?? "PATIENT",
          intent: selectedOption,
        },
      } as any;

      const response = await fetch("http://localhost:3000/groq/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;

          const rawData = line.slice(5).trim();
          if (rawData === "[DONE]") continue;

          try {
            const parsed = JSON.parse(rawData) as { content?: string };
            if (parsed.content) {
              appendToken(finalSessionId, botMessageId, parsed.content);
            }
          } catch (err) {
            // ignore parsing errors
          }
        }
      }
    } catch (error) {
      updateMessageText(
        finalSessionId,
        botMessageId,
        "Sorry, I couldn't reach the server. Please try again.",
      );
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleDiseaseImageSelect = (file: File) => {
    setDiseaseImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDiseaseImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    setAnalysisError(null);
  };

  const handleDiseaseAnalyze = async () => {
    if (!diseaseModel || !diseaseImage) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 1. POST to AI Inference Server (/ai/predict) via Vite proxy
      const formData = new FormData();
      formData.append("image", diseaseImage);
      formData.append("model", diseaseModel);

      const aiResponse = await fetch("/ai/predict", {
        method: "POST",
        body: formData,
      });

      if (!aiResponse.ok) {
        const errData = await aiResponse.json().catch(() => ({}));
        throw new Error(errData.error || `AI inference server error: status ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();

      // 2. POST to Groq Backend (/health/detect-disease) via Vite proxy
      const groqResponse = await fetch("/health/detect-disease", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("medvision_token")}`,
        },
        body: JSON.stringify({
          ai_result: {
            model: diseaseModel,
            prediction: aiResult.prediction,
            confidence: aiResult.confidence,
            all_probs: aiResult.all_probs,
          },
          doctor_message: doctorQuestion,
        }),
      });

      if (!groqResponse.ok) {
        const errData = await groqResponse.json().catch(() => ({}));
        throw new Error(errData.error || `Interpretation server error: status ${groqResponse.status}`);
      }

      const groqResult = await groqResponse.json();

      setAnalysisResult({
        ai_result: {
          model: diseaseModel,
          prediction: aiResult.prediction,
          confidence: aiResult.confidence,
          all_probs: aiResult.all_probs,
        },
        interpretation: groqResult.interpretation,
        doctor_message: doctorQuestion,
      });
    } catch (err: any) {
      console.error("Disease detection failed:", err);
      setAnalysisError(err.message || "An unexpected error occurred during diagnostic analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Do not block the UI when there's no server session yet — allow composing

  // a message and create the session when sending.

  const inputZone = (
    <div className={styles.inputZone}>
      <div className={styles.optionRow}>
        <button
          type="button"
          className={`${styles.optionButton} ${selectedOption === "health" ? styles.optionSelected : ""}`}
          onClick={() => handleOptionSelect("health")}
        >
          <StethoscopeIcon size={18} />
          <span>Symptoms / Appointment</span>
        </button>
        {user?.role === "DOCTOR" && (
          <button
            type="button"
            className={`${styles.optionButton} ${selectedOption === "disease" ? styles.optionSelected : ""}`}
            onClick={() => handleOptionSelect("disease")}
          >
            <MicroscopeIcon size={18} />
            <span>Detect Disease</span>
          </button>
        )}
      </div>

      <div className={styles.textareaRow}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          className={styles.textarea}
          placeholder={placeholderText}
          rows={1}
          disabled={isSending}
        />
      </div>

      <div className={styles.actionRow}>
        <div className={styles.attachGroup}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={handleImageClick}
            aria-label="Upload image"
            disabled={isSending}
          >
            <ImageUploadIcon size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            onChange={handleImageChange}
          />
          {imagePreview && (
            <div className={styles.thumbnailContainer}>
              <img
                src={imagePreview}
                alt="Preview"
                className={styles.thumbnailImage}
              />
              <button
                type="button"
                className={styles.thumbnailRemove}
                onClick={removeImage}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!canSend || isSending}
        >
          <span>Send</span>
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {isMobile && isSidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed}`}
      >
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarOpen ? (
            <ChevronLeftIcon size={18} className={styles.toggleIcon} />
          ) : (
            <MenuIcon size={18} className={styles.toggleIconCollapsed} />
          )}
        </button>

        <button
          type="button"
          className={styles.newChatButton}
          onClick={handleNewChat}
        >
          <PlusIcon size={18} />
          <span>New Chat</span>
        </button>

        <div className={styles.sidebarSessions}>
          {sessions.map((sessionItem) => {
            const isActive = sessionItem.id === sessionId;
            const itemTitle =
              sessionItem.title.length > 28
                ? `${sessionItem.title.slice(0, 28)}…`
                : sessionItem.title;
            const itemPreviewText =
              sessionItem.messages.length > 0
                ? `${sessionItem.messages[0].text.slice(0, 28)}${sessionItem.messages[0].text.length > 28 ? "…" : ""}`
                : "New chat";

            return (
              <Link
                key={sessionItem.id}
                to={`/chat/${sessionItem.id}`}
                className={`${styles.sessionLink} ${isActive ? styles.activeSession : ""}`}
                title={sessionItem.title}
                onClick={() => {
                  if (isMobile) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <div className={styles.sessionAvatar}>
                  {sessionItem.title.charAt(0).toUpperCase()}
                </div>
                <div className={styles.sessionDetails}>
                  <div className={styles.sessionTitle}>{itemTitle}</div>
                  <div className={styles.sessionPreview}>{itemPreviewText}</div>
                  <div className={styles.sessionTime}>
                    {formatDistanceToNow(sessionItem.createdAt, {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <section className={styles.chatArea}>
        <div
          className={`${styles.chatContent} ${selectedOption === "disease" ? "" : isWelcomeMode ? styles.welcomeMode : styles.activeMode}`}
        >
          {selectedOption === "disease" ? (
            <div className={styles.diseaseContainer}>
              {/* Option Row */}
              <div className={styles.optionRow} style={{ marginBottom: "24px" }}>
                <button
                  type="button"
                  className={styles.optionButton}
                  onClick={() => handleOptionSelect("health")}
                >
                  <StethoscopeIcon size={18} />
                  <span>Symptoms / Appointment</span>
                </button>
                {user?.role === "DOCTOR" && (
                  <button
                    type="button"
                    className={`${styles.optionButton} ${styles.optionSelected}`}
                    onClick={() => handleOptionSelect("disease")}
                  >
                    <MicroscopeIcon size={18} />
                    <span>Detect Disease</span>
                  </button>
                )}
              </div>


              {analysisResult ? (
                /* State 2: Results Display */
                <div className={styles.resultsWrapper}>
                  <div className={styles.resultsGrid}>
                    {/* Left Panel: AI model output */}
                    <div className={styles.resultsPanelLeft}>
                      <h3 className={styles.panelTitle}>AI Classification Output</h3>
                      <div className={styles.resultModelBadge}>
                        Model: {analysisResult.ai_result.model.toUpperCase()}
                      </div>
                      
                      <div className={styles.predictionHighlight}>
                        <div className={styles.predictionLabel}>{analysisResult.ai_result.prediction}</div>
                        <div className={styles.confidenceBadge}>
                          {analysisResult.ai_result.confidence}% Confidence
                        </div>
                      </div>

                      <div className={styles.probsContainer}>
                        <h4 className={styles.subTitle}>Class Probabilities</h4>
                        {Object.entries(analysisResult.ai_result.all_probs).map(([cls, prob]) => (
                          <div key={cls} className={styles.probRow}>
                            <div className={styles.probLabelRow}>
                              <span className={styles.probClassName}>{cls}</span>
                              <span className={styles.probValue}>{prob}%</span>
                            </div>
                            <div className={styles.probBarBg}>
                              <div
                                className={styles.probBarFill}
                                style={{ width: `${prob}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Panel: Groq interpretation */}
                    <div className={styles.resultsPanelRight}>
                      <h3 className={styles.panelTitle}>Clinical AI Interpretation</h3>
                      
                      {analysisResult.doctor_message && (
                        <div className={styles.doctorQuestionCard}>
                          <span className={styles.questionCardLabel}>Doctor's Question:</span>
                          <p className={styles.questionCardText}>"{analysisResult.doctor_message}"</p>
                        </div>
                      )}

                      <div className={styles.interpretationText}>
                        {renderMarkdown(analysisResult.interpretation)}
                      </div>
                    </div>
                  </div>

                  <div className={styles.panelActions}>
                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={() => {
                        setAnalysisResult(null);
                        setDiseaseImage(null);
                        setDiseaseImagePreview(null);
                        setDoctorQuestion("");
                      }}
                    >
                      Run Another Analysis
                    </button>
                  </div>
                </div>
              ) : (
                /* State 1: Form Inputs */
                <div className={styles.diseaseForm}>
                  <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>1. Select AI Model</h3>
                    <div className={styles.modelRadioGroup}>
                      <label className={`${styles.modelRadioLabel} ${diseaseModel === "lc25000" ? styles.modelRadioActive : ""}`}>
                        <input
                          type="radio"
                          name="disease-model"
                          value="lc25000"
                          checked={diseaseModel === "lc25000"}
                          onChange={() => setDiseaseModel("lc25000")}
                          className={styles.modelRadioInput}
                          disabled={isAnalyzing}
                        />
                        <div className={styles.modelRadioContent}>
                          <span className={styles.modelRadioName}>LC25000</span>
                          <span className={styles.modelRadioDesc}>Lung & Colon Cancer · 5 classes</span>
                        </div>
                      </label>

                      <label className={`${styles.modelRadioLabel} ${diseaseModel === "aptos" ? styles.modelRadioActive : ""}`}>
                        <input
                          type="radio"
                          name="disease-model"
                          value="aptos"
                          checked={diseaseModel === "aptos"}
                          onChange={() => setDiseaseModel("aptos")}
                          className={styles.modelRadioInput}
                          disabled={isAnalyzing}
                        />
                        <div className={styles.modelRadioContent}>
                          <span className={styles.modelRadioName}>APTOS</span>
                          <span className={styles.modelRadioDesc}>Diabetic Retinopathy · 5 DR grades</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>2. Upload Diagnostic Image</h3>
                    <div
                      className={`${styles.dropZone} ${diseaseImagePreview ? styles.dropZoneHasImage : ""}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isAnalyzing) return;
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          handleDiseaseImageSelect(file);
                        }
                      }}
                      onClick={() => !isAnalyzing && diseaseFileInputRef.current?.click()}
                    >
                      <input
                        ref={diseaseFileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDiseaseImageSelect(file);
                        }}
                        disabled={isAnalyzing}
                      />
                      {diseaseImagePreview ? (
                        <div className={styles.dropZonePreview}>
                          <img
                            src={diseaseImagePreview}
                            alt="Diagnostic upload preview"
                            className={styles.dropZoneImage}
                          />
                          <div className={styles.dropZoneOverlay}>
                            <span>Click to Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.dropZonePlaceholder}>
                          <ImageUploadIcon size={36} color="var(--accent)" />
                          <p className={styles.dropZoneText}>
                            Drag and drop a diagnostic image here, or <span>browse</span>
                          </p>
                          <span className={styles.dropZoneSubtext}>Supports JPG, PNG, DICOM (image formats)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>3. Clinical Notes / Question (Optional)</h3>
                    <textarea
                      value={doctorQuestion}
                      onChange={(e) => setDoctorQuestion(e.target.value)}
                      placeholder="Ask the AI a question, e.g. What do you think? or type clinical notes..."
                      className={styles.diseaseTextarea}
                      rows={3}
                      disabled={isAnalyzing}
                    />
                  </div>

                  {analysisError && (
                    <div className={styles.diseaseErrorCard}>
                      <span className={styles.errorLabel}>Analysis Failed:</span>
                      <p className={styles.errorText}>{analysisError}</p>
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.analyzeButton}
                      disabled={!diseaseModel || !diseaseImage || isAnalyzing}
                      onClick={handleDiseaseAnalyze}
                    >
                      {isAnalyzing ? (
                        <div className={styles.analyzingLoader}>
                          <div className={styles.spinner} />
                          <span>Analyzing Case...</span>
                        </div>
                      ) : (
                        <>
                          <span>Run Diagnostic Analysis</span>
                          <SendIcon size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isWelcomeMode ? (
            <div className={styles.welcomePanel}>
              <BotIcon size={64} className={styles.welcomeIcon} />
              <h2 className={styles.welcomeTitle}>
                Hello, how can I help you today, {user?.firstName ?? "there"}?
              </h2>
              <p className={styles.welcomeSubtitle}>
                I'm MedBot, your intelligent health assistant.
              </p>
              <div className={styles.welcomeInputWrapper}>{inputZone}</div>
            </div>
          ) : (
            <div className={styles.messagesWrapper}>
              <div className={styles.messagesList}>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isTyping={
                      message.from === "bot" && message.text.length === 0
                    }
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {!isWelcomeMode && selectedOption !== "disease" && (
          <div className={styles.stickyInput}>{inputZone}</div>
        )}

        {selectedOption !== "disease" && (
          <div className={styles.disclaimer}>
            MedBot is AI and can make mistakes.{" "}
            <a href="#" target="_blank" rel="noreferrer">
              Please double-check important health information.
            </a>
          </div>
        )}
      </section>

    </div>
  );
};

export default ChatBotPage;
