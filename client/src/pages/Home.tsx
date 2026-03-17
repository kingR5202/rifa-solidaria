import { useState, useEffect, useRef } from "react";
import { Carousel } from "@/components/Carousel";
import { QuantitySelector } from "@/components/QuantitySelector";
import { DescriptionAccordion } from "@/components/DescriptionAccordion";
import { InstagramSection } from "@/components/InstagramSection";
import { CheckoutModal, type CheckoutFieldsConfig } from "@/components/CheckoutModal";
import { PixModal } from "@/components/PixModal";
import { MenuDrawer } from "@/components/MenuDrawer";
import { LoginModal } from "@/components/LoginModal";
import { MeusTitulos } from "@/components/MeusTitulos";
import { Button } from "@/components/ui/button";
import { IMAGE_URLS } from "@shared/imageUrls";
import { Menu } from "lucide-react";
import { trackMetaEvent } from "@/components/TrackingScripts";

const PRICE_PER_TITLE = 10.0;
const TRANSACTION_FEE = 2.23;
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
  const [customerData, setCustomerData] = useState<{ name: string; phone: string; email: string; cpf: string } | null>(null);
  const [checkoutFields, setCheckoutFields] = useState<CheckoutFieldsConfig>({ name: true, phone: true, email: false, cpf: false });
  const [pixCreatedAt, setPixCreatedAt] = useState<string>("");

  // Capture UTM params from URL on page load
  const utmParams = useRef<Record<string, string | null>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    utmParams.current = {
      src: params.get("src"),
      sck: params.get("sck"),
      utm_source: params.get("utm_source"),
      utm_campaign: params.get("utm_campaign"),
      utm_medium: params.get("utm_medium"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    };
  }, []);

  // Send order to Utmify
  const sendUtmifyEvent = (orderId: string, status: string, createdAt: string, approvedDate: string | null, customer: { name: string; phone: string; email: string; cpf: string }, qty: number, totalCents: number) => {
    fetch("https://utmify-proxy.botecoconta84.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        status,
        createdAt,
        approvedDate,
        customer,
        quantity: qty,
        totalPriceInCents: totalCents,
        trackingParameters: utmParams.current,
      }),
    }).catch(() => {});
  };

  // Load checkout fields config
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.checkout_fields) setCheckoutFields(data.checkout_fields);
      })
      .catch(() => {});
  }, []);

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

          // Track Purchase event (Pixel + CAPI)
          if (customerData) {
            trackMetaEvent("Purchase", {
              currency: "BRL",
              value: totalPrice,
              content_name: "Rifa Solidária ItalianCar",
              content_category: "infoproduto",
              content_type: "product",
              num_items: quantity,
              order_id: pixData.transactionId,
            }, {
              fn: customerData.name.split(" ")[0],
              ln: customerData.name.split(" ").slice(1).join(" "),
              ph: customerData.phone.replace(/\D/g, ""),
              external_id: customerData.phone.replace(/\D/g, ""),
            });
          }

          // Save order and update transaction status
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
              // Update transaction status to paid
              await fetch("/api/transactions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transaction_id: pixData.transactionId,
                  status: "paid",
                }),
              });
              // Send confirmation email if customer provided email
              if (customerData.email) {
                fetch("/api/send-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: customerData.email,
                    customerName: customerData.name,
                    quantity,
                    totalPrice,
                    transactionId: pixData.transactionId,
                  }),
                }).catch(() => {});
              }
            } catch (err) {
              console.error("Save order error:", err);
            }

            // Send Utmify paid event
            const paidAt = new Date().toISOString().slice(0, 19).replace("T", " ");
            sendUtmifyEvent(pixData.transactionId, "paid", pixCreatedAt || paidAt, paidAt, customerData, quantity, Math.round((totalPrice + TRANSACTION_FEE) * 100));
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

  const handleCheckoutConfirm = async (data: { name: string; phone: string; email: string; cpf: string }) => {
    setIsLoading(true);
    setCustomerData(data);

    // Save user name + phone to database
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, name: data.name }),
      });
    } catch (err) {
      console.error("Save user error:", err);
    }

    try {
      const amountCents = Math.round((totalPrice + TRANSACTION_FEE) * 100);

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

      // Track InitiateCheckout event (Pixel + CAPI)
      trackMetaEvent("InitiateCheckout", {
        currency: "BRL",
        value: totalPrice,
        content_name: "Rifa Solidária ItalianCar",
        content_category: "infoproduto",
        num_items: quantity,
      }, {
        fn: data.name.split(" ")[0],
        ln: data.name.split(" ").slice(1).join(" "),
        ph: data.phone.replace(/\D/g, ""),
      });

      // Save PIX transaction to database
      try {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: result.id,
            customer_name: data.name,
            customer_phone: data.phone,
            quantity,
            total_price: totalPrice,
            pix_code: pixCode,
          }),
        });
      } catch (err) {
        console.error("Save transaction error:", err);
      }

      // Send Utmify waiting_payment event
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      setPixCreatedAt(now);
      sendUtmifyEvent(result.id, "waiting_payment", now, null, data, quantity, Math.round((totalPrice + TRANSACTION_FEE) * 100));
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

  const handleLogin = async (phone: string) => {
    setIsLoginLoading(true);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      console.error("Save user error:", err);
    }
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
            className="w-full bg-green-500 text-white hover:bg-green-600 font-bold py-8 text-3xl md:text-4xl rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/30 animate-glow"
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
        fieldsConfig={checkoutFields}
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
          customerName={customerData?.name}
          customerPhone={customerData?.phone}
          customerCpf={customerData?.cpf}
          transactionId={pixData.transactionId}
        />
      )}
    </div>
  );
}
