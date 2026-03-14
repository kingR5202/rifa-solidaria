import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { IMAGE_URLS } from "@shared/imageUrls";

interface Order {
  id: number;
  transaction_id: string;
  customer_name: string;
  quantity: number;
  total_price: string;
  payment_status: string;
  codes: string;
  created_at: string;
}

interface MeusTitulosProps {
  isOpen: boolean;
  phone: string;
  onClose: () => void;
}

export function MeusTitulos({ isOpen, phone, onClose }: MeusTitulosProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !phone) return;
    setLoading(true);

    fetch(`/api/orders?phone=${encodeURIComponent(phone)}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
      })
      .catch((err) => {
        console.error("Fetch orders error:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, phone]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `Dia ${d.toLocaleDateString("pt-BR")} as ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const getStatusLabel = (status: string) => {
    if (status === "paid") return { text: "Pago", color: "text-green-400" };
    if (status === "expired") return { text: "Expirado", color: "text-orange-400" };
    return { text: "Pendente", color: "text-yellow-400" };
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-gray-700 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={IMAGE_URLS.logo} alt="ItalianCar" className="h-10 w-auto" />
            <div>
              <h1 className="font-bold text-white">ITALIANCAR</h1>
              <p className="text-xs text-gray-400">Automotiva</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
        </div>
      </header>

      {/* Title */}
      <div className="max-w-4xl mx-auto w-full px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart size={22} className="text-white" />
          <h2 className="text-white font-bold text-xl">Meus títulos</h2>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Nenhum título encontrado</p>
            <p className="text-sm mt-2">Compre títulos da rifa para vê-los aqui</p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {orders.map((order) => {
              const status = getStatusLabel(order.payment_status);
              return (
                <div
                  key={order.id}
                  className="flex gap-4 bg-gray-900/60 border border-gray-700/50 rounded-xl p-3"
                >
                  {/* Thumbnail */}
                  <img
                    src={IMAGE_URLS.carousel[0]}
                    alt="Rifa"
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs">{formatDate(order.created_at)}</p>
                    <p className="text-white font-bold text-sm mt-1 truncate">
                      🎗️ RIFA SOLIDÁRIA – AJUDE A RECONS
                    </p>
                    <p className={`text-sm font-bold ${status.color}`}>{status.text}</p>
                    <p className="text-gray-300 text-xs">
                      título{order.quantity !== 1 ? "s" : ""} : {order.quantity}
                    </p>
                    <p className="text-gray-300 text-xs">
                      Total: R$ {Number(order.total_price).toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">ID: {order.id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
