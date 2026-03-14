import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PixModalProps {
  isOpen: boolean;
  pixCode: string;
  totalPrice: number;
  quantity: number;
  paymentStatus: string;
  onClose: () => void;
}

export function PixModal({
  isOpen,
  pixCode,
  totalPrice,
  quantity,
  paymentStatus,
  onClose,
}: PixModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 min
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate QR code using a free API
  useEffect(() => {
    if (isOpen && pixCode) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
      setQrImageUrl(url);
    }
  }, [isOpen, pixCode]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(600);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  if (paymentStatus === "paid") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-green-500/50 shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Pagamento Confirmado!</h2>
          <p className="text-gray-300 mb-2">
            Obrigado por ajudar a reconstruir a ItalianCar!
          </p>
          <p className="text-white font-bold mb-6">
            {quantity} título{quantity !== 1 ? "s" : ""} - R$ {totalPrice.toFixed(2)}
          </p>
          <Button
            onClick={onClose}
            className="bg-green-500 text-black hover:bg-green-600 font-bold px-8 py-3 rounded-xl"
          >
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-gray-600/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-gray-600/20 sticky top-0 bg-gray-900/40 backdrop-blur-xl rounded-t-3xl">
          <h2 className="text-xl font-bold text-white">Pagamento PIX</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price */}
          <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-3 text-center">
            <p className="text-sm text-gray-300">Valor Total</p>
            <p className="text-2xl font-bold text-green-400">R$ {totalPrice.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {quantity} título{quantity !== 1 ? "s" : ""} × R$ {(totalPrice / quantity).toFixed(2)}
            </p>
          </div>

          {/* PIX Code Input + Copy */}
          <div className="space-y-2">
            <label className="block text-white text-sm font-medium">
              Código PIX Copia e Cola:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pixCode}
                readOnly
                className="flex-1 bg-black/30 border border-gray-600/50 rounded-xl px-3 py-2 text-white text-sm font-mono truncate backdrop-blur-sm"
              />
              <Button
                onClick={handleCopy}
                className="bg-green-500 text-black hover:bg-green-600 px-4 rounded-xl"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </Button>
            </div>
          </div>

          {/* QR Code Toggle + Image */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={() => setShowQr(!showQr)}
              className="bg-gray-700 text-white hover:bg-gray-600 px-6 rounded-xl"
            >
              {showQr ? "Ocultar QR Code" : "Ver QR Code"}
            </Button>

            {showQr && qrImageUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <img
                  src={qrImageUrl}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            )}
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></span>
            Aguardando pagamento...
          </div>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-sm font-bold text-red-400">
              Tempo restante: {formatTime(countdown)}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800/30 rounded-2xl p-4 space-y-2 backdrop-blur-sm">
            <h3 className="text-white font-bold text-sm">Como pagar:</h3>
            <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
              <li>Abra seu app de banco ou carteira digital</li>
              <li>Selecione "Pagar com PIX"</li>
              <li>Cole o código ou escaneie o QR Code</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
