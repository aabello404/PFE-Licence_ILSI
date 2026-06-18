import React from "react";
import { format } from "date-fns";
import { BotIcon, StethoscopeIcon, MicroscopeIcon } from "../Icons";
import { ChatMessage as BaseChatMessage } from "../../types";
import { renderMarkdown } from "./renderMarkdown";
import styles from "./ChatMessage.module.css";

type ChatOption = "health" | "disease";

interface MessageWithOption extends BaseChatMessage {
  option?: ChatOption;
}

interface ChatMessageProps {
  message: MessageWithOption;
  isTyping?: boolean;
}

const renderInlineText = (text: string): React.ReactNode[] => {
  const fragments = text.split(/(\*\*[^*]+\*\*)/g);
  return fragments.map((fragment, index) => {
    if (fragment.startsWith("**") && fragment.endsWith("**")) {
      return (
        <strong key={index} className={styles.bold}>
          {fragment.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{fragment}</React.Fragment>;
  });
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isTyping = false,
}) => {
  const isUser = message.from === "user";
  const optionLabel =
    message.option === "disease"
      ? "Disease"
      : message.option === "health"
        ? "Symptoms"
        : undefined;

  const optionIcon =
    message.option === "disease" ? (
      <MicroscopeIcon size={14} />
    ) : message.option === "health" ? (
      <StethoscopeIcon size={14} />
    ) : null;

  return (
    <div
      className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}
    >
      {!isUser && (
        <div className={styles.botAvatar}>
          <BotIcon size={20} />
        </div>
      )}
      <div className={styles.bubbleColumn}>
        {isUser && optionLabel && (
          <div className={styles.optionBadge}>
            {optionIcon}
            <span>{optionLabel}</span>
          </div>
        )}
        <div
          className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}
        >
          {message.image && (
            <img
              src={message.image}
              alt="Chat attachment"
              className={styles.messageImage}
            />
          )}
          <div className={styles.messageText}>
            {isTyping ? (
              <div className={styles.typingIndicator}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            ) : (
              renderMarkdown(message.text)
            )}
          </div>
          <span className={styles.timestamp}>
            {format(message.timestamp, "h:mm a")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
