import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const PRESET_QUANTITIES = [1, 2, 3, 4, 5, 10]; // Múltiplos de 10 em reais
const PRICE_PER_TITLE = 10.0; // Alterado de 2.50 para 10.00

interface QuantitySelectorProps {
  onQuantityChange: (quantity: number, totalPrice: number) => void;
}

export function QuantitySelector({ onQuantityChange }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      setQuantity(newQuantity);
      onQuantityChange(newQuantity, newQuantity * PRICE_PER_TITLE);
    }
  };

  const totalPrice = quantity * PRICE_PER_TITLE;

  return (
    <div className="w-full bg-black/50 rounded-lg p-6 border-2 border-dashed border-green-500">
      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {PRESET_QUANTITIES.map((preset) => (
          <button
            key={preset}
            onClick={() => handleQuantityChange(preset)}
            className={`py-4 px-2 rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${
              quantity === preset
                ? "bg-green-500 text-black"
                : "bg-green-500/30 text-white hover:bg-green-500/50"
            }`}
          >
            <div className="text-3xl md:text-4xl">+{preset}</div>
            <div className="text-xs mt-1 uppercase tracking-wide">Selecionar</div>
          </button>
        ))}
      </div>

      {/* Manual Input */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-white text-sm">Quantidade:</span>
        <div className="flex items-center gap-3 bg-black rounded px-3 py-2">
          <button
            onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
            className="text-green-500 hover:text-green-400 transition-colors"
            aria-label="Diminuir quantidade"
          >
            <Minus size={20} />
          </button>
          <input
            type="tel"
            value={quantity}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              handleQuantityChange(Math.max(1, value));
            }}
            className="w-12 text-center text-white bg-transparent border-0 outline-none font-bold"
          />
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="text-green-500 hover:text-green-400 transition-colors"
            aria-label="Aumentar quantidade"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Price Display */}
      <div className="text-right">
        <div className="text-green-500 font-bold text-lg">
          R$ {totalPrice.toFixed(2)}
        </div>
        <div className="text-white text-xs">
          {quantity} título{quantity !== 1 ? "s" : ""} × R$ {PRICE_PER_TITLE.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
