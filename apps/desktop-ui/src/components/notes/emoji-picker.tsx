"use client";

const EMOJI_OPTIONS = ["📄", "📝", "📋", "📌", "🗒️", "💡", "⭐", "🔖", "🎯", "📊", "🔍", "💼", "🧠", "✅", "📅", "🔐", "🚀", "🎨", "💻", "📚"];

export function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
    return (
        <div className="p-2 grid grid-cols-5 gap-1 w-44">
            {EMOJI_OPTIONS.map((e) => (
                <button
                    key={e}
                    className="text-lg hover:bg-muted rounded p-1 cursor-pointer"
                    onClick={() => { onSelect(e); onClose(); }}
                    type="button"
                >
                    {e}
                </button>
            ))}
        </div>
    );
}
