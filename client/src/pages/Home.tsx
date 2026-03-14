import { useState, useEffect, useRef } from "react";
import { Carousel } from "@/components/Carousel";
import { QuantitySelector } from "@/components/QuantitySelector";
import { DescriptionAccordion } from "@/components/DescriptionAccordion";
import { InstagramSection } from "@/components/InstagramSection";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PixModal } from "@/components/PixModal";
import { MenuDrawer } from "@/components/MenuDrawer";
import { LoginModal } from "@/components/LoginModal";
import { MeusTitulos } from "@/components/MeusTitulos";
import { Button } from "@/components/ui/button";
import { IMAGE_URLS } from "@shared/imageUrls";
import { Menu } from "lucide-react";

const PRICE_PER_TITLE = 10.0;
const PROXY_URL = "/api/proxy";

export default function Home() {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(PRICE_PER_TITLE);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCode: string;
    transactionId: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Menu / Login / Meus Títulos state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMeusTitulosOpen, setIsMeusTitulosOpen] = useState(false);
  const [loggedPhone, setLoggedPhone] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Store customer data for saving order after payment
  const [customerData, setCustomerData] = useState<{ name: string; phone: string } | null>(null);

  // Poll payment status
  useEffect(() => {
    if (!pixData?.transactionId || !isPixOpen) return;

    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${PROXY_URL}?id=${encodeURIComponent(pixData.transactionId)}`);
        const data = await res.json();
        if (data.status === "paid") {
          setPaymentStatus("paid");
          if (pollInterval.current) clearInterval(pollInterval.current);

          // Save order to database after payment confirmed
          if (customerData) {
            try {
              await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transaction_id: pixData.transactionId,
                  customer_name: customerData.name,
                  customer_phone: customerData.phone,
                  quantity,
                  total_price: totalPrice,
                }),
              });
            } catch (err) {
              console.error("Save order error:", err);
            }
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 5000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [pixData?.transactionId, isPixOpen]);

  const handleQuantityChange = (qty: number, price: number) => {
    setQuantity(qty);
    setTotalPrice(price);
  };

  const handleParticipate = () => {
    setIsCheckoutOpen(true);
  };

  const handleCheckoutConfirm = async (data: { name: string; phone: string }) => {
    setIsLoading(true);
    setCustomerData(data);
    try {
      const amountCents = Math.round(totalPrice * 100);

      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: amountCents,
          metadata: {
            customer: {
              nome: data.name,
              telefone: data.phone,
            },
            quantity,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar PIX");
      }

      const pixCode = result.qr_code || "";
      if (!pixCode) {
        throw new Error("Código PIX não retornado");
      }

      setPixData({
        pixCode,
        transactionId: result.id,
      });
      setPaymentStatus("pending");
      setIsCheckoutOpen(false);
      setIsPixOpen(true);
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Erro ao gerar PIX. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePixClose = () => {
    setIsPixOpen(false);
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  const handleLogin = (phone: string) => {
    setIsLoginLoading(true);
    setLoggedPhone(phone);
    setIsLoginOpen(false);
    setIsLoginLoading(false);
    setIsMeusTitulosOpen(true);
  };

  const handleMeusTitulos = () => {
    if (loggedPhone) {
      setIsMeusTitulosOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleEntrar = () => {
    setIsLoginOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-green-500/20 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={IMAGE_URLS.logo}
              alt="ItalianCar Automotiva"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="font-bold text-lg">ITALIANCAR</h1>
              <p className="text-xs text-gray-400">Automotiva</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/italiancarautomotiva"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-500 hover:text-pink-400 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
              </svg>
            </a>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label="Menu"
            >
              <Menu size={28} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="space-y-4">
          <p className="text-gray-300 text-center">
            Em poucos minutos, o fogo destruiu <strong>16 carros</strong>, além da estrutura, ferramentas e anos de trabalho construídos com muito esforço.
          </p>

          <p className="text-gray-300 text-center">
            A Italiancar não perdeu apenas veículos. Perdeu projetos, histórias e o sustento de quem vive desse trabalho todos os dias.
          </p>

          <p className="text-gray-300 text-center">
            Essa rifa nasce para transformar solidariedade em reconstrução. Cada número comprado é mais do que uma chance de ganhar: é um gesto de apoio para ajudar a reerguer tudo o que foi perdido.
          </p>
        </section>

        {/* Carousel with overlay (Adquira já + title + meus títulos) */}
        <Carousel onMeusTitulos={handleMeusTitulos} />

        {/* Quantity Selector */}
        <QuantitySelector onQuantityChange={handleQuantityChange} />

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            onClick={handleParticipate}
            className="w-full bg-green-500 text-black hover:bg-green-600 font-bold py-6 text-2xl md:text-3xl rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/30"
          >
            QUERO AJUDAR
          </Button>
        </div>

        {/* Description & Rules */}
        <DescriptionAccordion />

        {/* Instagram Section */}
        <InstagramSection />
      </main>

      {/* Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onMeusTitulos={handleMeusTitulos}
        onEntrar={handleEntrar}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
        isLoading={isLoginLoading}
      />

      {/* Meus Títulos */}
      <MeusTitulos
        isOpen={isMeusTitulosOpen}
        phone={loggedPhone || ""}
        onClose={() => setIsMeusTitulosOpen(false)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        quantity={quantity}
        totalPrice={totalPrice}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleCheckoutConfirm}
        isLoading={isLoading}
      />

      {/* PIX Modal */}
      {pixData && (
        <PixModal
          isOpen={isPixOpen}
          pixCode={pixData.pixCode}
          totalPrice={totalPrice}
          quantity={quantity}
          paymentStatus={paymentStatus}
          onClose={handlePixClose}
        />
      )}
    </div>
  );
}
