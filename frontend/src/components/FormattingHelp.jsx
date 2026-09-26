import { useRef, useState } from "react";
import { FaArrowsAlt, FaCompressAlt, FaTimes } from "react-icons/fa";

function FormattingHelp() {
  const [open, setOpen] = useState(false);
  const [isFloating, setIsFloating] = useState(false);

  const [position, setPosition] = useState({
    x: 80,
    y: 80,
  });

  const dragStateRef = useRef({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsFloating(false);
  };

  const handlePopOut = () => {
    setIsFloating(true);
  };

  const handleDock = () => {
    setIsFloating(false);
  };

  const handlePointerDown = (event) => {
    if (!isFloating) {
      return;
    }

    const panel = event.currentTarget.closest("[data-formatting-help-panel]");

    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();

    dragStateRef.current = {
      dragging: true,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isFloating || !dragStateRef.current.dragging) {
      return;
    }

    const panelWidth = 560;
    const panelHeight = 520;

    const maximumX = Math.max(10, window.innerWidth - panelWidth - 10);
    const maximumY = Math.max(10, window.innerHeight - panelHeight - 10);

    const nextX = Math.min(
      Math.max(10, event.clientX - dragStateRef.current.offsetX),
      maximumX
    );

    const nextY = Math.min(
      Math.max(10, event.clientY - dragStateRef.current.offsetY),
      maximumY
    );

    setPosition({
      x: nextX,
      y: nextY,
    });
  };

  const handlePointerUp = (event) => {
    dragStateRef.current.dragging = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
      >
        Formatting Help
      </button>

      {open && !isFloating && (
        <div className="mt-4 basis-full w-full rounded-2xl border border-slate-700 bg-slate-950/80 shadow-xl">
          <FormattingHelpHeader
            isFloating={false}
            onPopOut={handlePopOut}
            onDock={handleDock}
            onClose={handleClose}
          />

          <FormattingHelpContent />
        </div>
      )}

      {open && isFloating && (
        <div
          data-formatting-help-panel
          className="fixed z-[80] flex max-h-[75vh] w-[560px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <FormattingHelpHeader
            isFloating
            onPopOut={handlePopOut}
            onDock={handleDock}
            onClose={handleClose}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          <div className="overflow-y-auto">
            <FormattingHelpContent />
          </div>
        </div>
      )}
    </>
  );
}

function FormattingHelpHeader({
  isFloating,
  onPopOut,
  onDock,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  return (
    <header
      className={`flex items-start justify-between gap-4 border-b border-slate-800 p-4 ${
        isFloating ? "cursor-move" : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isFloating && <FaArrowsAlt className="text-slate-500" />}

          <h3 className="text-lg font-bold text-white">
            Text Formatting Help
          </h3>
        </div>

        <p className="mt-1 text-sm text-slate-400">
          Type normally, or use these symbols when you want extra formatting.
        </p>
      </div>

      <div
        className="flex shrink-0 items-center gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isFloating ? (
          <button
            type="button"
            onClick={onDock}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
          >
            <FaCompressAlt />
            Dock
          </button>
        ) : (
          <button
            type="button"
            onClick={onPopOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
          >
            <FaArrowsAlt />
            Pop Out
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close formatting help"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <FaTimes />
        </button>
      </div>
    </header>
  );
}

function FormattingHelpContent() {
  return (
    <div className="p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <FormattingItem
          example="# Main Title"
          description="Creates the largest heading."
        />

        <FormattingItem
          example="## Section Heading"
          description="Creates a section heading."
        />

        <FormattingItem
          example="### Smaller Heading"
          description="Creates a smaller heading."
        />

        <FormattingItem
          example="**Bold Text**"
          description="Makes text bold."
        />

        <FormattingItem
          example="*Italic Text*"
          description="Makes text italic."
        />

        <FormattingItem
          example="- Bullet Item"
          description="Creates a bullet list."
        />

        <FormattingItem
          example="1. Numbered Item"
          description="Creates a numbered list."
        />

        <FormattingItem
          example="> Quote"
          description="Creates a quoted section."
        />

        <FormattingItem
          example="---"
          description="Adds a divider line."
        />

        <FormattingItem
          example="`Inline Code`"
          description="Highlights a short piece of code or technical text."
        />

        <FormattingItem
          example={"```\nCode Block\n```"}
          description="Creates a larger block for code or technical text."
          fullWidth
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm leading-6 text-slate-400">
          Your formatting will be applied automatically when the saved content
          is viewed.
        </p>
      </div>
    </div>
  );
}

function FormattingItem({ example, description, fullWidth = false }) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950/70 p-3 ${
        fullWidth ? "md:col-span-2" : ""
      }`}
    >
      <pre className="whitespace-pre-wrap font-mono text-sm text-cyan-300">
        {example}
      </pre>

      <p className="mt-2 text-sm text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default FormattingHelp;