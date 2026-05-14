import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, X, RefreshCw } from "lucide-react";

export default function ImageCapture({ value, onChange, label = "Photo", required = false }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      setCameraActive(true);
    } catch {
      alert("Camera access denied. Please use file upload instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onChange(dataUrl);
    stopCamera();
  }, [onChange, stopCamera]);

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onChange]
  );

  const clear = useCallback(() => {
    onChange(null);
    stopCamera();
  }, [onChange, stopCamera]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {cameraActive ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-sky-400 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-56 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={capture}
              className="bg-white text-sky-600 rounded-full px-6 py-2.5 shadow-lg font-semibold hover:bg-sky-50 flex items-center gap-2 text-sm"
            >
              <Camera size={18} />
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="bg-red-500 text-white rounded-full px-5 py-2.5 shadow-lg font-semibold hover:bg-red-600 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400">
          <img src={value} alt="Captured" className="w-full h-52 object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="bg-sky-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-sky-600 flex items-center gap-1 shadow"
            >
              <RefreshCw size={13} /> Retake
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-800 flex items-center gap-1 shadow"
            >
              <Upload size={13} /> Replace
            </button>
            <button
              type="button"
              onClick={clear}
              className="bg-red-500 text-white rounded-lg p-1.5 hover:bg-red-600 shadow"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-sky-300 rounded-xl text-sky-500 hover:bg-sky-50 transition-colors font-medium text-sm"
          >
            <Camera size={24} />
            Use Camera
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <Upload size={24} />
            Upload File
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
