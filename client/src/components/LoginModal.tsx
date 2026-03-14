import { useState } from "react";
import { X, KeyRound } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (phone: string) => void;
  isLoading?: boolean;
}

export function LoginModal({ isOpen, onClose, onLogin, isLoading }: LoginModalProps) {
  const [phone, setPhone] = useState("");

  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("55")) digits = digits.slice(2);
    const limited = digits.slice(0, 11);

    if (limited.length === 0) return "";
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 14) {
      onLogin(phone);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl max-w-sm w-full border border-gray-600/30 shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600/30">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-white" />
            <span className="text-white font-bold text-lg">Login</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-yellow-400 text-sm font-bold mb-2">
              Telefone
            </label>
            <div className="flex items-center bg-black/30 border border-gray-600/50 backdrop-blur-sm rounded-lg overflow-hidden">
              <span className="text-green-400 font-bold px-3 text-sm">+55</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(99) 99999-9999"
                disabled={isLoading}
                className="flex-1 bg-transparent py-3 px-2 text-white placeholder-gray-500 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || phone.length < 14}
            className="w-full bg-yellow-400 text-black font-bold py-4 text-lg rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 animate-glow"
          >
            {isLoading ? "Carregando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
