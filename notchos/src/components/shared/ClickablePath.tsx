import { useCallback } from 'react';

const isTauri = '__TAURI_INTERNALS__' in window;

// Match file paths: ./foo, /foo, or bare paths with extensions
const PATH_REGEX = /(?:\.\/|\/|(?:src|test|lib|pkg|app|components|hooks|scripts|docs)\/)[^\s,;:'")\]}>]+/g;

interface ClickablePathProps {
  text: string;
  style?: React.CSSProperties;
}

export function ClickablePath({ text, style }: ClickablePathProps) {
  const handleClick = useCallback(async (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isTauri) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (e.metaKey || e.ctrlKey) {
        await invoke('reveal_in_file_manager', { path });
      } else {
        await invoke('open_in_editor', { path });
      }
    } catch (err) {
      console.error('[ClickablePath] action failed:', err);
    }
  }, []);

  // Split text into segments: plain text and matched paths
  const segments: Array<{ type: 'text' | 'path'; content: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PATH_REGEX)) {
    if (match.index! > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'path', content: match[0] });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no paths found, render plain text
  if (segments.length <= 1 && segments[0]?.type === 'text') {
    return <span style={style}>{text}</span>;
  }

  return (
    <span style={style}>
      {segments.map((seg, i) =>
        seg.type === 'path' ? (
          <a
            key={i}
            href="#"
            onClick={(e) => handleClick(seg.content, e)}
            style={{
              color: 'var(--teal)',
              textDecoration: 'none',
              cursor: isTauri ? 'pointer' : 'default',
              borderBottom: '0.5px solid rgba(56,168,154,0.3)',
            }}
            title={`Click to open, ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Click to reveal`}
          >
            {seg.content}
          </a>
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </span>
  );
}
