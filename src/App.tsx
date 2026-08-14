import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

type LayoutCount = 2 | 3 | 4;

type Paragraph = {
  id: string;
  text: string;
};

type Pane = {
  id: string;
  title: string;
  eyebrow: string;
  paragraphs: Paragraph[];
  fontOffset: number;
  locked: boolean;
};

type WidthSets = Record<LayoutCount, number[]>;

type StoredWorkspace = {
  version: 1;
  layout: LayoutCount;
  globalFontSize: number;
  compact: boolean;
  panes: Pane[];
  widths: WidthSets;
};

const STORAGE_KEY = "multimemos.workspace.v1";
const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 18;
const MIN_PANE_FONT_SIZE = 10;
const MAX_PANE_FONT_SIZE = 20;

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeParagraph = (text = ""): Paragraph => ({ id: makeId(), text });

const DEFAULT_PANES: Pane[] = [
  {
    id: "reference",
    eyebrow: "REFERENCE",
    title: "返信元・素材",
    paragraphs: [makeParagraph()],
    fontOffset: -1,
    locked: false,
  },
  {
    id: "draft-a",
    eyebrow: "DRAFT A",
    title: "AI案・参考",
    paragraphs: [makeParagraph()],
    fontOffset: -1,
    locked: false,
  },
  {
    id: "draft-b",
    eyebrow: "DRAFT B",
    title: "作業文",
    paragraphs: [makeParagraph()],
    fontOffset: 1,
    locked: false,
  },
  {
    id: "notes",
    eyebrow: "NOTES",
    title: "メモ",
    paragraphs: [makeParagraph()],
    fontOffset: -1,
    locked: false,
  },
];

const DEFAULT_WIDTHS: WidthSets = {
  2: [50, 50],
  3: [33.333, 33.334, 33.333],
  4: [25, 25, 25, 25],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const paragraphsToText = (paragraphs: Paragraph[]) =>
  paragraphs.map((paragraph) => paragraph.text).join("\n\n");

const textToParagraphs = (text: string, previous: Paragraph[]): Paragraph[] => {
  const normalized = text.replace(/\r\n?/g, "\n");
  const chunks = normalized.split(/\n{2,}/u);

  if (chunks.length === 0) return [makeParagraph()];

  return chunks.map((chunk, index) => ({
    id: previous[index]?.id ?? makeId(),
    text: chunk,
  }));
};

const isLayoutCount = (value: unknown): value is LayoutCount =>
  value === 2 || value === 3 || value === 4;

const normalizeWidths = (value: unknown): WidthSets => {
  if (!value || typeof value !== "object") return DEFAULT_WIDTHS;
  const candidate = value as Partial<Record<LayoutCount, unknown>>;
  const next = { ...DEFAULT_WIDTHS };

  ([2, 3, 4] as LayoutCount[]).forEach((count) => {
    const paneWidths = candidate[count];
    if (
      Array.isArray(paneWidths) &&
      paneWidths.length === count &&
      paneWidths.every((width) => typeof width === "number" && Number.isFinite(width))
    ) {
      const total = paneWidths.reduce((sum, width) => sum + width, 0);
      if (total > 0) {
        next[count] = paneWidths.map((width) => (width / total) * 100);
      }
    }
  });

  return next;
};

const loadWorkspace = (): StoredWorkspace => {
  const fallback: StoredWorkspace = {
    version: 1,
    layout: 3,
    globalFontSize: 13,
    compact: false,
    panes: DEFAULT_PANES,
    widths: DEFAULT_WIDTHS,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredWorkspace>;

    const panes = DEFAULT_PANES.map((fallbackPane, index) => {
      const storedPane = Array.isArray(parsed.panes) ? parsed.panes[index] : undefined;
      if (!storedPane || typeof storedPane !== "object") return fallbackPane;

      const paragraphs = Array.isArray(storedPane.paragraphs)
        ? storedPane.paragraphs
            .filter(
              (paragraph): paragraph is Paragraph =>
                Boolean(paragraph) &&
                typeof paragraph.id === "string" &&
                typeof paragraph.text === "string",
            )
            .map((paragraph) => ({ ...paragraph }))
        : [];

      return {
        ...fallbackPane,
        id: typeof storedPane.id === "string" ? storedPane.id : fallbackPane.id,
        eyebrow:
          typeof storedPane.eyebrow === "string" ? storedPane.eyebrow : fallbackPane.eyebrow,
        title: typeof storedPane.title === "string" ? storedPane.title : fallbackPane.title,
        paragraphs: paragraphs.length ? paragraphs : [makeParagraph()],
        fontOffset:
          typeof storedPane.fontOffset === "number"
            ? clamp(storedPane.fontOffset, -4, 6)
            : fallbackPane.fontOffset,
        locked: typeof storedPane.locked === "boolean" ? storedPane.locked : false,
      };
    });

    return {
      version: 1,
      layout: isLayoutCount(parsed.layout) ? parsed.layout : 3,
      globalFontSize:
        typeof parsed.globalFontSize === "number"
          ? clamp(parsed.globalFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE)
          : 13,
      compact: typeof parsed.compact === "boolean" ? parsed.compact : false,
      panes,
      widths: normalizeWidths(parsed.widths),
    };
  } catch {
    return fallback;
  }
};

const countCharacters = (paragraphs: Paragraph[]) =>
  paragraphsToText(paragraphs).replace(/\s/gu, "").length;

export default function App() {
  const initial = useMemo(loadWorkspace, []);
  const [panes, setPanes] = useState<Pane[]>(initial.panes);
  const [layout, setLayout] = useState<LayoutCount>(initial.layout);
  const [globalFontSize, setGlobalFontSize] = useState(initial.globalFontSize);
  const [compact, setCompact] = useState(initial.compact);
  const [widths, setWidths] = useState<WidthSets>(initial.widths);
  const [focusPaneId, setFocusPaneId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [copiedPaneId, setCopiedPaneId] = useState<string | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const paneRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const copyTimerRef = useRef<number | null>(null);

  const activePanes = useMemo(() => {
    if (focusPaneId) {
      const focused = panes.find((pane) => pane.id === focusPaneId);
      return focused ? [focused] : panes.slice(0, layout);
    }
    return panes.slice(0, layout);
  }, [focusPaneId, layout, panes]);

  useEffect(() => {
    setMobileIndex((current) => Math.min(current, Math.max(activePanes.length - 1, 0)));
  }, [activePanes.length]);

  useEffect(() => {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const workspace: StoredWorkspace = {
        version: 1,
        layout,
        globalFontSize,
        compact,
        panes,
        widths,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setSaveState("saved");
    }, 280);

    return () => window.clearTimeout(timer);
  }, [compact, globalFontSize, layout, panes, widths]);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const updatePane = useCallback((paneId: string, updater: (pane: Pane) => Pane) => {
    setPanes((current) => current.map((pane) => (pane.id === paneId ? updater(pane) : pane)));
  }, []);

  const handleTextChange = (paneId: string, event: ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    updatePane(paneId, (pane) => ({
      ...pane,
      paragraphs: textToParagraphs(text, pane.paragraphs),
    }));
  };

  const focusPane = useCallback(
    (index: number) => {
      if (index < 0 || index >= activePanes.length) return;
      paneRefs.current[index]?.focus();
      const workspace = workspaceRef.current;
      if (workspace && window.matchMedia("(max-width: 800px)").matches) {
        workspace.scrollTo({ left: index * workspace.clientWidth, behavior: "smooth" });
      }
    },
    [activePanes.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && focusPaneId) {
        setFocusPaneId(null);
        return;
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const number = Number(event.key);
      if (!Number.isInteger(number) || number < 1 || number > 4) return;
      const targetIndex = number - 1;
      if (targetIndex >= activePanes.length) return;
      event.preventDefault();
      focusPane(targetIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePanes.length, focusPane, focusPaneId]);

  const copyPane = async (pane: Pane) => {
    try {
      await navigator.clipboard.writeText(paragraphsToText(pane.paragraphs));
      setCopiedPaneId(pane.id);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedPaneId(null), 1200);
    } catch {
      setCopiedPaneId(null);
    }
  };

  const clearPane = (pane: Pane) => {
    if (pane.locked) return;
    if (paragraphsToText(pane.paragraphs).trim() && !window.confirm(`「${pane.title}」を空にしますか？`)) {
      return;
    }
    updatePane(pane.id, (current) => ({ ...current, paragraphs: [makeParagraph()] }));
  };

  const resetWidths = () => {
    if (focusPaneId) return;
    setWidths((current) => ({ ...current, [layout]: [...DEFAULT_WIDTHS[layout]] }));
  };

  const startResize = (boundaryIndex: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (focusPaneId || !workspaceRef.current) return;
    event.preventDefault();

    const workspaceWidth = workspaceRef.current.getBoundingClientRect().width;
    const startX = event.clientX;
    const start = [...widths[layout]];
    const pairTotal = start[boundaryIndex] + start[boundaryIndex + 1];
    const minimum = layout === 4 ? 15 : 18;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = ((moveEvent.clientX - startX) / workspaceWidth) * 100;
      const left = clamp(start[boundaryIndex] + delta, minimum, pairTotal - minimum);
      const right = pairTotal - left;
      setWidths((current) => {
        const next = [...current[layout]];
        next[boundaryIndex] = left;
        next[boundaryIndex + 1] = right;
        return { ...current, [layout]: next };
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const moveMobile = (nextIndex: number) => {
    const target = clamp(nextIndex, 0, activePanes.length - 1);
    const workspace = workspaceRef.current;
    if (!workspace) return;
    workspace.scrollTo({ left: target * workspace.clientWidth, behavior: "smooth" });
    setMobileIndex(target);
  };

  const handleWorkspaceScroll = () => {
    const workspace = workspaceRef.current;
    if (!workspace || workspace.clientWidth === 0) return;
    const nextIndex = clamp(
      Math.round(workspace.scrollLeft / workspace.clientWidth),
      0,
      activePanes.length - 1,
    );
    setMobileIndex(nextIndex);
  };

  const gridTemplateColumns = focusPaneId
    ? "minmax(0, 1fr)"
    : widths[layout].map((width) => `${width}%`).join(" ");

  return (
    <div className={`app-shell${compact ? " is-compact" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">MultiMemos</span>
          <span className="brand-caption">SIDE-BY-SIDE WRITING DESK</span>
        </div>

        <div className="toolbar-group layout-switcher" aria-label="列数">
          {([2, 3, 4] as LayoutCount[]).map((count) => (
            <button
              key={count}
              className={layout === count && !focusPaneId ? "is-active" : ""}
              type="button"
              onClick={() => {
                setFocusPaneId(null);
                setLayout(count);
              }}
              aria-pressed={layout === count && !focusPaneId}
            >
              {count}
            </button>
          ))}
        </div>

        <div className="topbar-actions">
          <div className="toolbar-group font-controls" aria-label="全体文字サイズ">
            <button
              type="button"
              onClick={() => setGlobalFontSize((size) => clamp(size - 1, MIN_FONT_SIZE, MAX_FONT_SIZE))}
              aria-label="全体の文字を小さく"
            >
              A−
            </button>
            <span>{globalFontSize}</span>
            <button
              type="button"
              onClick={() => setGlobalFontSize((size) => clamp(size + 1, MIN_FONT_SIZE, MAX_FONT_SIZE))}
              aria-label="全体の文字を大きく"
            >
              A+
            </button>
          </div>
          <button
            className={`quiet-button${compact ? " is-active" : ""}`}
            type="button"
            onClick={() => setCompact((value) => !value)}
            aria-pressed={compact}
          >
            Compact
          </button>
          <button className="quiet-button desktop-only" type="button" onClick={resetWidths}>
            Equal
          </button>
        </div>
      </header>

      <div className="mobile-pager" aria-label="列を移動">
        <button type="button" onClick={() => moveMobile(mobileIndex - 1)} disabled={mobileIndex === 0}>
          ‹
        </button>
        <div>
          <span>{mobileIndex + 1} / {activePanes.length}</span>
          <strong>{activePanes[mobileIndex]?.title ?? ""}</strong>
        </div>
        <button
          type="button"
          onClick={() => moveMobile(mobileIndex + 1)}
          disabled={mobileIndex >= activePanes.length - 1}
        >
          ›
        </button>
      </div>

      <main
        ref={workspaceRef}
        className={`workspace${focusPaneId ? " is-focused" : ""}`}
        style={{ gridTemplateColumns }}
        onScroll={handleWorkspaceScroll}
      >
        {activePanes.map((pane, index) => {
          const paneFontSize = clamp(
            globalFontSize + pane.fontOffset,
            MIN_PANE_FONT_SIZE,
            MAX_PANE_FONT_SIZE,
          );
          const text = paragraphsToText(pane.paragraphs);

          return (
            <section
              className={`memo-pane${pane.locked ? " is-reference" : ""}`}
              key={pane.id}
              style={{ "--pane-font-size": `${paneFontSize}px` } as CSSProperties}
            >
              <div className="pane-header">
                <div className="pane-heading">
                  <span className="pane-eyebrow">{pane.eyebrow}</span>
                  <input
                    value={pane.title}
                    onChange={(event) =>
                      updatePane(pane.id, (current) => ({ ...current, title: event.target.value }))
                    }
                    aria-label={`${pane.eyebrow} のタイトル`}
                  />
                </div>

                <div className="pane-actions">
                  <button
                    className={pane.locked ? "is-active" : ""}
                    type="button"
                    onClick={() =>
                      updatePane(pane.id, (current) => ({ ...current, locked: !current.locked }))
                    }
                    aria-pressed={pane.locked}
                    title={pane.locked ? "Reference modeを解除" : "Reference mode（編集ロック）"}
                  >
                    REF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePane(pane.id, (current) => ({
                        ...current,
                        fontOffset: clamp(current.fontOffset - 1, -4, 6),
                      }))
                    }
                    aria-label={`${pane.title} の文字を小さく`}
                  >
                    −
                  </button>
                  <span className="pane-font-value">{paneFontSize}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updatePane(pane.id, (current) => ({
                        ...current,
                        fontOffset: clamp(current.fontOffset + 1, -4, 6),
                      }))
                    }
                    aria-label={`${pane.title} の文字を大きく`}
                  >
                    +
                  </button>
                  <button type="button" onClick={() => void copyPane(pane)} title="全文コピー">
                    {copiedPaneId === pane.id ? "✓" : "⧉"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusPaneId((current) => (current === pane.id ? null : pane.id))}
                    title={focusPaneId === pane.id ? "横並びへ戻る" : "この列に集中"}
                  >
                    {focusPaneId === pane.id ? "↙" : "↗"}
                  </button>
                  <button
                    className="danger-action"
                    type="button"
                    onClick={() => clearPane(pane)}
                    disabled={pane.locked}
                    title="この列を空にする"
                  >
                    ×
                  </button>
                </div>
              </div>

              <textarea
                ref={(element) => {
                  paneRefs.current[index] = element;
                }}
                className="memo-editor"
                value={text}
                onChange={(event) => handleTextChange(pane.id, event)}
                readOnly={pane.locked}
                spellCheck
                placeholder={
                  index === 0
                    ? "返信元メールや参考文を貼り付ける…"
                    : index === 1
                      ? "AIの提案や参考文を置く…"
                      : "ここに文章を書く…"
                }
                aria-label={pane.title}
              />

              <footer className="pane-footer">
                <span>{pane.paragraphs.length} paragraphs</span>
                <span>{countCharacters(pane.paragraphs).toLocaleString("ja-JP")} chars</span>
              </footer>

              {!focusPaneId && index < activePanes.length - 1 ? (
                <button
                  className="resize-handle desktop-only"
                  type="button"
                  onPointerDown={(event) => startResize(index, event)}
                  onDoubleClick={resetWidths}
                  aria-label={`${pane.title} と次の列の幅を調整`}
                  title="ドラッグで列幅変更・ダブルクリックで均等幅"
                />
              ) : null}
            </section>
          );
        })}
      </main>

      <footer className="statusbar">
        <span className={`save-indicator ${saveState}`} aria-live="polite">
          <i /> {saveState === "saving" ? "Saving…" : "Saved locally"}
        </span>
        <span className="shortcut-hint desktop-only">Alt + 1–4 で列へ移動 · Esc でFocus解除</span>
      </footer>
    </div>
  );
}
