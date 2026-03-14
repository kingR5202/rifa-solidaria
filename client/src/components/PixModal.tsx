import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PixModalProps {
  isOpen: boolean;
  qrCode: string;
  copyPaste: string;
  expiresAt: string;
  onClose: () => void;
  onConfirm?: () => Promise<void>;
  isLoading?: boolean;
}

export function PixModal({
  isOpen,
  qrCode,
  copyPaste,
  expiresAt,
  onClose,
  isLoading = false,
}: PixModalProps) {
  const [copied, setCopied] = useState(false);
  const [isLoadingQR, setIsLoadingQR] = useState(true);

  useEffect(() => {
    if (isOpen && qrCode) {
      // Simular carregamento do QR Code
      const timer = setTimeout(() => setIsLoadingQR(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, qrCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-gray-600/30 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header - Sem botão de fechar */}
        <div className="flex items-center justify-center p-4 border-b border-gray-600/20 sticky top-0 bg-gray-900/40 backdrop-blur-xl rounded-t-3xl">
          <h2 className="text-xl font-bold text-white">Pagamento PIX</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code - Skeleton Screen */}
          <div className="flex flex-col items-center gap-4">
            {isLoadingQR ? (
              // Skeleton Screen
              <div className="w-48 h-48 bg-gray-700/30 rounded-2xl animate-pulse flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-400 text-xs">Gerando QR Code...</p>
                </div>
              </div>
            ) : (
              // QR Code Image
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            )}
            <p className="text-gray-400 text-sm text-center">
              {isLoadingQR ? "Aguarde..." : "Escaneie o código QR com seu celular para pagar"}
            </p>
          </div>

          {/* Copy-Paste Code */}
          <div className="space-y-2">
            <label className="block text-white text-sm font-medium">
              Ou copie o código PIX:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={copyPaste}
                readOnly
                disabled={isLoading || isLoadingQR}
                className="flex-1 bg-black/30 border border-gray-600/50 rounded-xl px-3 py-2 text-white text-sm font-mono truncate disabled:opacity-50 backdrop-blur-sm"
              />
              <Button
                onClick={handleCopy}
                disabled={isLoading || isLoadingQR}
                className="bg-green-500 text-black hover:bg-green-600 px-4 disabled:opacity-50 rounded-xl"
              >
                {copied ? (
                  <Check size={18} />
                ) : (
                  <Copy size={18} />
                )}
              </Button>
            </div>
          </div>

          {/* Expiration Info */}
          <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-green-400 text-sm font-bold">
              ⏱️ Válido até: {new Date(expiresAt).toLocaleString("pt-BR")}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Após este horário, o código PIX expirará
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800/30 rounded-2xl p-4 space-y-2 backdrop-blur-sm">
            <h3 className="text-white font-bold text-sm">Como pagar:</h3>
            <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
              <li>Abra seu app de banco ou carteira digital</li>
              <li>Selecione "Pagar com PIX"</li>
              <li>Escaneie o QR Code ou copie o código</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>

          {/* Sem botão de fechar - usuário deve completar o pagamento */}
        </div>
      </div>
    </div>
  );
}
