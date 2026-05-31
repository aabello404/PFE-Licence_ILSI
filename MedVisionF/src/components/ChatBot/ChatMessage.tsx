import React from 'react';
import { format } from 'date-fns';
import { BotIcon, StethoscopeIcon, MicroscopeIcon } from '../Icons';
import { ChatMessage as BaseChatMessage } from '../../types';
import styles from './ChatMessage.module.css';

type ChatOption = 'health' | 'disease';

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
    if (fragment.startsWith('**') && fragment.endsWith('**')) {
      return (
        <strong key={index} className={styles.bold}>
          {fragment.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{fragment}</React.Fragment>;
  });
};

export const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return null;
    const listEl = (
      <ul className={styles.markdownList} key={`list-${elements.length}`}>
        {listItems.map((item, index) => (
          <li key={index} className={styles.markdownListItem}>
            {renderInlineText(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
    return listEl;
  };

  lines.forEach((line, index) => {
    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }
    if (listItems.length > 0) {
      elements.push(flushList());
    }
    if (line.trim().length === 0) {
      elements.push(<div key={`br-${index}`} className={styles.lineBreak} />);
      return;
    }
    elements.push(
      <p key={`p-${index}`} className={styles.paragraph}>
        {renderInlineText(line)}
      </p>,
    );
  });

  if (listItems.length > 0) {
    elements.push(flushList());
  }

  return <>{elements}</>;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isTyping = false }) => {
  const isUser = message.from === 'user';
  const optionLabel =
    message.option === 'disease'
      ? 'Disease'
      : message.option === 'health'
      ? 'Symptoms'
      : undefined;

  const optionIcon = message.option === 'disease' ? (
    <MicroscopeIcon size={14} />
  ) : message.option === 'health' ? (
    <StethoscopeIcon size={14} />
  ) : null;

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}>
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
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
          {message.image && (
            <img src={message.image} alt="Chat attachment" className={styles.messageImage} />
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
          <span className={styles.timestamp}>{format(message.timestamp, 'h:mm a')}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
