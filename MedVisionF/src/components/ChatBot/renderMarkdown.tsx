import { ReactNode } from "react";
import styles from "./ChatMessage.module.css";

const renderInlineText = (text: string): ReactNode[] => {
  const fragments = text.split(/(\*\*[^*]+\*\*)/g);
  return fragments.map((fragment, index) => {
    if (fragment.startsWith("**") && fragment.endsWith("**")) {
      return (
        <strong key={index} className={styles.bold}>
          {fragment.slice(2, -2)}
        </strong>
      );
    }
    return <>{fragment}</>;
  });
};

export const renderMarkdown = (text: string): ReactNode => {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
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
    if (line.startsWith("- ")) {
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
