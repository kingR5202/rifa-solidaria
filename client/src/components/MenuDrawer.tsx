import { X, ShoppingCart, Ticket, LogIn } from "lucide-react";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMeusTitulos: () => void;
  onEntrar: () => void;
}

export function MenuDrawer({ isOpen, onClose, onMeusTitulos, onEntrar }: MenuDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 animate-fadeIn" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-72 bg-gray-900/40 backdrop-blur-xl border-l border-gray-600/30 z-50 flex flex-col shadow-2xl animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600/30">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">≡</span>
            <span className="text-white font-bold">Menu</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 p-4 space-y-2">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors text-left"
          >
            <ShoppingCart size={20} />
            <span>Campanhas</span>
          </button>

          <button
            onClick={() => { onClose(); onMeusTitulos(); }}
            className="w-full flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors text-left"
          >
            <Ticket size={20} />
            <span>Meus Títulos</span>
          </button>
        </div>

        {/* Entrar Button */}
        <div className="p-4 border-t border-gray-600/30">
          <button
            onClick={() => { onClose(); onEntrar(); }}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-300 transition-all duration-300 text-lg animate-glow"
          >
            <LogIn size={20} />
            <span>Entrar</span>
          </button>
        </div>
      </div>
    </>
  );
}
