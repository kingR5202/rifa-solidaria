import { useState, useEffect, useRef } from "react";
import { Copy, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PixModalProps {
  isOpen: boolean;
  pixCode: string;
  totalPrice: number;
  quantity: number;
  paymentStatus: string;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  customerCpf?: string;
  transactionId?: string;
}

export function PixModal({
  isOpen,
  pixCode,
  totalPrice,
  quantity,
  paymentStatus,
  onClose,
  customerName,
  customerPhone,
  customerCpf,
  transactionId,
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

  const maskPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    if (d.length >= 10) {
      return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`;
    }
    return phone;
  };

  const maskCpf = (cpf: string) => {
    const d = cpf.replace(/\D/g, "");
    if (d.length === 11) {
      return `***.***.*${d.slice(7, 9)}-${d.slice(9)}`;
    }
    return cpf;
  };

  if (!isOpen) return null;

  if (paymentStatus === "paid") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-green-500/50 shadow-2xl p-8 text-center animate-scaleIn">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-hidden animate-fadeIn">
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-gray-600/30 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide animate-scaleIn">
        {/* Header */}
        <div className="flex flex-col items-center p-5 border-b border-gray-600/20 sticky top-0 bg-gray-900/40 backdrop-blur-xl rounded-t-3xl z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
            <h2 className="text-xl font-bold text-white">Aguardando pagamento!</h2>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm">
            <Clock size={14} />
            <span>Você tem {formatTime(countdown)} para pagar</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">

          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-black font-bold text-sm flex items-center justify-center">1</span>
              <p className="text-white text-sm font-medium pt-0.5">Copie o código PIX abaixo.</p>
            </div>
            <input
              type="text"
              value={pixCode}
              readOnly
              className="w-full bg-black/40 border border-gray-600/50 rounded-xl px-3 py-2.5 text-white text-xs font-mono truncate backdrop-blur-sm"
            />
            <Button
              onClick={handleCopy}
              className={`w-full font-bold py-5 text-lg rounded-xl transition-all duration-300 shadow-lg ${
                copied
                  ? "bg-green-600 text-white shadow-green-600/30"
                  : "bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/30 hover:scale-[1.02]"
              }`}
            >
              {copied ? (
                <span className="flex items-center justify-center gap-2">
                  <Check size={22} /> Código copiado!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Copy size={22} /> Copiar Código
                </span>
              )}
            </Button>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-black font-bold text-sm flex items-center justify-center">2</span>
            <p className="text-gray-300 text-sm pt-0.5">Abra o app do seu banco e escolha a opção <strong className="text-white">PIX</strong>, como se fosse fazer uma transferência.</p>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-black font-bold text-sm flex items-center justify-center">3</span>
            <p className="text-gray-300 text-sm pt-0.5">Selecione a opção <strong className="text-white">PIX cópia e cola</strong>, cole a chave copiada e confirme o pagamento.</p>
          </div>

          {/* QR Code Toggle + Image */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={() => setShowQr(!showQr)}
              className="bg-gray-700/80 text-white hover:bg-gray-600 px-6 py-2.5 rounded-xl text-sm border border-gray-600/40"
            >
              {showQr ? "Ocultar QR Code" : "Mostrar QR Code"}
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

          {/* Product Info */}
          <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-green-400 text-sm font-bold mb-2">
              Você está adquirindo {quantity} título{quantity !== 1 ? "s" : ""} da campanha
            </p>
            <p className="text-white text-sm">
              🎗️ RIFA SOLIDÁRIA – AJUDE A RECONSTRUIR O SONHO DA ITALIANCAR, ATINGIDA POR UM INCÊNDIO
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-gray-800/30 border border-gray-700/40 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-gray-700/30">
              <h3 className="text-white text-sm font-bold">Detalhes da sua compra</h3>
              {transactionId && (
                <p className="text-gray-500 text-[10px] font-mono mt-0.5">ID: {transactionId}</p>
              )}
            </div>
            <div className="divide-y divide-gray-700/30">
              {customerName && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-400 text-xs">Comprador</span>
                  <span className="text-white text-xs font-medium">{customerName}</span>
                </div>
              )}
              {customerCpf && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-400 text-xs">CPF</span>
                  <span className="text-white text-xs font-medium">{maskCpf(customerCpf)}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-400 text-xs">Telefone</span>
                  <span className="text-white text-xs font-medium">{maskPhone(customerPhone)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-400 text-xs">Status</span>
                <span className="text-yellow-400 text-xs font-medium flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  Pendente
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-400 text-xs">Quantidade</span>
                <span className="text-white text-xs font-medium">{quantity} título{quantity !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-400 text-xs">Taxa</span>
                <span className="text-green-400 text-xs font-medium">Grátis</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-gray-700/20">
                <span className="text-white text-xs font-bold">Total</span>
                <span className="text-green-400 text-sm font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-gray-400 text-xs block mb-1">Títulos</span>
                <span className="text-yellow-400/80 text-xs italic">Os títulos serão disponibilizados quando o pagamento for identificado.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
