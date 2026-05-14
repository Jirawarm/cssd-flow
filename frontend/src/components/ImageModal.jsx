import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

export default function ImageModal({ src, alt = "Image", onClose }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors"
          title={zoomed ? "Zoom out" : "Zoom in"}
        >
          {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
        <button
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2.5 backdrop-blur-sm transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
        className={`rounded-xl object-contain transition-all duration-300 select-none ${
          zoomed
            ? "max-h-none max-w-none w-auto h-auto scale-125 cursor-zoom-out"
            : "max-h-[88vh] max-w-[92vw] cursor-zoom-in"
        }`}
        style={{ touchAction: "pinch-zoom" }}
      />

      {/* Hint */}
      {!zoomed && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
          Tap image to zoom · Tap outside to close
        </p>
      )}
    </div>
  );
}
