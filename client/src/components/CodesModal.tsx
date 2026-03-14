import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodesModalProps {
  isOpen: boolean;
  codes: string[];
  customerName: string;
  quantity: number;
  onClose: () => void;
}

export function CodesModal({
  isOpen,
  codes,
  customerName,
  quantity,
  onClose,
}: CodesModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    const allCodes = codes.join("\n");
    navigator.clipboard.writeText(allCodes);
    setCopiedCode("all");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-yellow-400/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-yellow-400/30 bg-gray-900">
          <h2 className="text-xl font-bold text-white">🎉 Seus Códigos da Rifa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 font-bold text-lg">
              ✅ Pagamento Confirmado!
            </p>
            <p className="text-gray-300 text-sm mt-2">
              Olá <span className="font-bold text-white">{customerName}</span>, seu pagamento foi processado com sucesso!
            </p>
          </div>

          {/* Codes Summary */}
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-400 font-bold mb-2">
              Você adquiriu {quantity} título{quantity !== 1 ? "s" : ""} da Rifa Solidária
            </p>
            <p className="text-gray-300 text-sm">
              Cada código abaixo representa um título. Guarde-os com segurança!
            </p>
          </div>

          {/* Codes Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold">Seus Códigos:</p>
              <Button
                onClick={copyAllCodes}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {copiedCode === "all" ? (
                  <>
                    <Check size={14} className="mr-1" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1" /> Copiar Todos
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className="bg-black border border-yellow-400/50 rounded-lg p-4 text-center hover:border-yellow-400 transition-colors group cursor-pointer"
                  onClick={() => copyToClipboard(code)}
                >
                  <p className="text-xs text-gray-400 mb-2">Título #{index + 1}</p>
                  <p className="text-2xl font-bold text-yellow-400 font-mono tracking-widest">
                    {code}
                  </p>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-xs text-gray-400">
                    {copiedCode === code ? (
                      <>
                        <Check size={12} /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Clique para copiar
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-bold text-sm mb-2">⚠️ Importante:</p>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>✓ Salve seus códigos em um local seguro</li>
              <li>✓ Cada código é único e intransferível</li>
              <li>✓ Você receberá um e-mail de confirmação com todos os códigos</li>
              <li>✓ Guarde-os para o sorteio final da campanha</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={copyAllCodes}
              className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300 font-bold"
            >
              <Copy size={16} className="mr-2" />
              Copiar Todos os Códigos
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 font-bold"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
