import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CheckoutFieldItem {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
}

// Keep backward compat with old format
export type CheckoutFieldsConfig = CheckoutFieldItem[] | Record<string, boolean>;

interface CheckoutModalProps {
  isOpen: boolean;
  quantity: number;
  totalPrice: number;
  onClose: () => void;
  onConfirm: (data: { name: string; phone: string; email: string; cpf: string }) => void;
  isLoading?: boolean;
  fieldsConfig?: CheckoutFieldsConfig;
}

function normalizeFields(config: CheckoutFieldsConfig): CheckoutFieldItem[] {
  if (Array.isArray(config)) return config;
  const defaults: Omit<CheckoutFieldItem, "enabled">[] = [
    { id: "name", label: "Nome Completo", desc: "" },
    { id: "phone", label: "Telefone", desc: "" },
    { id: "email", label: "E-mail", desc: "" },
    { id: "cpf", label: "CPF", desc: "" },
  ];
  return defaults.map((d) => ({ ...d, enabled: !!config[d.id] }));
}

export function CheckoutModal({
  isOpen,
  quantity,
  totalPrice,
  onClose,
  onConfirm,
  isLoading = false,
  fieldsConfig = [
    { id: "name", label: "Nome", desc: "", enabled: true },
    { id: "phone", label: "Telefone", desc: "", enabled: true },
    { id: "email", label: "E-mail", desc: "", enabled: false },
    { id: "cpf", label: "CPF", desc: "", enabled: false },
  ],
}: CheckoutModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  const fields = normalizeFields(fieldsConfig);

  const isEnabled = (id: string) => fields.find((f) => f.id === id)?.enabled ?? false;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isEnabled("name") && !name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    if (isEnabled("phone") && (!phone.trim() || phone.length < 12)) {
      newErrors.phone = "Telefone inválido";
    }
    if (isEnabled("email")) {
      if (!email.trim()) {
        newErrors.email = "E-mail é obrigatório";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = "E-mail inválido";
      }
    }
    if (isEnabled("cpf")) {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (!cpfDigits || cpfDigits.length !== 11) {
        newErrors.cpf = "CPF inválido";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onConfirm({ name, phone, email, cpf });
    }
  };

  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("55")) digits = digits.slice(2);
    const d = digits.slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  const formatCpf = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-black/30 border border-gray-600/50 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 transition-colors backdrop-blur-sm";

  const renderField = (fieldId: string) => {
    switch (fieldId) {
      case "name":
        return (
          <div key="name">
            <label className="block text-white text-sm font-medium mb-2">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: "" }); }}
              placeholder="Seu nome"
              disabled={isLoading}
              className={inputClass}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
        );
      case "phone":
        return (
          <div key="phone">
            <label className="block text-white text-sm font-medium mb-2">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(formatPhone(e.target.value)); if (errors.phone) setErrors({ ...errors, phone: "" }); }}
              placeholder="(99) 99999-9999"
              disabled={isLoading}
              className={inputClass}
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            <p className="text-white bg-red-600/20 text-xs font-bold px-2 py-1 rounded mt-2">
              ⚠️ IMPORTANTE, DIGITE SEU NÚMERO CORRETAMENTE!
            </p>
          </div>
        );
      case "email": {
        const EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com"];
        const handleEmailChange = (val: string) => {
          setEmail(val);
          if (errors.email) setErrors({ ...errors, email: "" });
          const atIdx = val.indexOf("@");
          if (atIdx !== -1) {
            const typed = val.slice(atIdx + 1).toLowerCase();
            const filtered = typed
              ? EMAIL_DOMAINS.filter((d) => d.startsWith(typed) && d !== typed)
              : EMAIL_DOMAINS;
            setEmailSuggestions(filtered);
          } else {
            setEmailSuggestions([]);
          }
        };
        const applyEmailSuggestion = (domain: string) => {
          const atIdx = email.indexOf("@");
          const user = atIdx !== -1 ? email.slice(0, atIdx) : email;
          setEmail(`${user}@${domain}`);
          setEmailSuggestions([]);
        };
        return (
          <div key="email" className="relative">
            <label className="block text-white text-sm font-medium mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => setTimeout(() => setEmailSuggestions([]), 150)}
              placeholder="seu@email.com"
              disabled={isLoading}
              className={inputClass}
              autoComplete="off"
            />
            {emailSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-600/60 rounded-xl overflow-hidden shadow-xl">
                {emailSuggestions.map((domain) => {
                  const atIdx = email.indexOf("@");
                  const user = atIdx !== -1 ? email.slice(0, atIdx) : email;
                  return (
                    <li
                      key={domain}
                      onMouseDown={() => applyEmailSuggestion(domain)}
                      className="px-4 py-2.5 text-sm text-white hover:bg-green-500/20 cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-gray-400">{user}</span>
                      <span className="text-green-400 font-medium">@{domain}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
        );
      }
      case "cpf":
        return (
          <div key="cpf">
            <label className="block text-white text-sm font-medium mb-2">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => { setCpf(formatCpf(e.target.value)); if (errors.cpf) setErrors({ ...errors, cpf: "" }); }}
              placeholder="000.000.000-00"
              disabled={isLoading}
              className={inputClass}
            />
            {errors.cpf && <p className="text-red-400 text-xs mt-1">{errors.cpf}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-hidden animate-fadeIn">
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl max-w-md w-full border border-gray-600/30 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600/20 sticky top-0 bg-gray-900/40 backdrop-blur-xl rounded-t-3xl">
          <h2 className="text-xl font-bold text-white">Finalizar Pedido</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Order Summary */}
          <div className="bg-green-500/15 border border-green-500/40 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-green-400 text-sm font-bold mb-2">
              Você está adquirindo {quantity} título{quantity !== 1 ? "s" : ""} da campanha
            </p>
            <p className="text-white text-sm">
              🎗️ RIFA SOLIDÁRIA – AJUDE A RECONSTRUIR O SONHO DA ITALIANCAR, ATINGIDA POR UM INCÊNDIO
            </p>
          </div>

          {/* Form - fields rendered in saved order */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.filter((f) => f.enabled).map((f) => renderField(f.id))}

            {/* Price Display */}
            <div className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-3 text-center backdrop-blur-sm">
              <p className="text-sm text-gray-300">Total a pagar:</p>
              <p className="text-2xl font-bold text-white">R$ {totalPrice.toFixed(2)}</p>
            </div>

            {/* Button */}
            <div className="pt-4 pb-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-500 text-white hover:bg-green-600 font-bold py-7 text-2xl md:text-3xl transition-all duration-300 hover:scale-105 rounded-xl shadow-lg shadow-green-500/30 animate-glow"
              >
                {isLoading ? "Processando..." : "Continuar para PIX"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
