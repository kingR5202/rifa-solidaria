import { useState } from "react";
import { Carousel } from "@/components/Carousel";
import { QuantitySelector } from "@/components/QuantitySelector";
import { DescriptionAccordion } from "@/components/DescriptionAccordion";
import { InstagramSection } from "@/components/InstagramSection";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PixModal } from "@/components/PixModal";
import { CodesModal } from "@/components/CodesModal";
import { Button } from "@/components/ui/button";
import { IMAGE_URLS } from "@shared/imageUrls";
import { trpc } from "@/lib/trpc";

const PRICE_PER_TITLE = 10.0; // Alterado de 2.50 para 10.00

export default function Home() {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(PRICE_PER_TITLE);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [isCodesOpen, setIsCodesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    copyPaste: string;
    expiresAt: string;
  } | null>(null);

  const createPaymentMutation = trpc.rifa.createPayment.useMutation();
  const generateCodesMutation = trpc.rifa.generateCodes.useMutation();

  const handleQuantityChange = (qty: number, price: number) => {
    setQuantity(qty);
    setTotalPrice(price);
  };

  const handleParticipate = () => {
    setIsCheckoutOpen(true);
  };

  const handleCheckoutConfirm = async (data: { name: string; phone: string }) => {
    setIsLoading(true);
    try {
      const result = await createPaymentMutation.mutateAsync({
        name: data.name,
        phone: data.phone,
        quantity,
        totalPrice,
      });

      if (result.success) {
        setCustomerName(data.name);
        setCurrentOrderId(result.orderId);
        setPixData({
          qrCode: result.pixQrCode,
          copyPaste: result.pixCopyPaste,
          expiresAt: result.expiresAt,
        });
        setIsCheckoutOpen(false);
        setIsPixOpen(true);
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePixConfirm = async () => {
    if (!currentOrderId) return;

    setIsLoading(true);
    try {
      const result = await generateCodesMutation.mutateAsync({
        orderId: currentOrderId,
      });

      if (result.success) {
        setGeneratedCodes(result.codes);
        setIsPixOpen(false);
        setIsCodesOpen(true);
      }
    } catch (error) {
      console.error("Generate codes error:", error);
    } finally {
      setIsLoading(false);
    }
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="bg-green-500 text-black px-4 py-3 rounded-lg font-bold text-center text-sm md:text-base">
            🎗️ RIFA SOLIDÁRIA – AJUDE A RECONSTRUIR O SONHO DA ITALIANCAR, ATINGIDA POR UM INCÊNDIO
          </div>

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

        {/* Carousel */}
        <Carousel />

        {/* Quantity Selector */}
        <QuantitySelector onQuantityChange={handleQuantityChange} />

        {/* CTA Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleParticipate}
            className="bg-green-500 text-black hover:bg-green-600 font-bold px-12 py-4 text-xl md:text-2xl rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            QUERO AJUDAR
          </Button>
        </div>

        {/* Description & Rules */}
        <DescriptionAccordion />

        {/* Instagram Section */}
        <InstagramSection />
      </main>

      {/* Modals */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        quantity={quantity}
        totalPrice={totalPrice}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleCheckoutConfirm}
        isLoading={isLoading}
      />

      {pixData && (
        <PixModal
          isOpen={isPixOpen}
          qrCode={pixData.qrCode}
          copyPaste={pixData.copyPaste}
          expiresAt={pixData.expiresAt}
          onClose={() => setIsPixOpen(false)}
          onConfirm={handlePixConfirm}
          isLoading={isLoading}
        />
      )}

      <CodesModal
        isOpen={isCodesOpen}
        codes={generatedCodes}
        customerName={customerName}
        quantity={quantity}
        onClose={() => setIsCodesOpen(false)}
      />
    </div>
  );
}
