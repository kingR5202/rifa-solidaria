import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { IMAGE_URLS } from "@shared/imageUrls";

interface CarouselProps {
  onMeusTitulos?: () => void;
}

export function Carousel({ onMeusTitulos }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const images = IMAGE_URLS.carousel;
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play para desktop
  useEffect(() => {
    if (!isAutoPlay) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 5000); // Muda a cada 5 segundos

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlay, images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsAutoPlay(false);
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsAutoPlay(false);
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  // Swipe para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoPlay(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }

    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  return (
    <>
    <div
      className="relative w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image Container */}
      <div className="relative aspect-square">
        <img
          src={images[currentIndex]}
          alt={`Campanha ItalianCar - Imagem ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          draggable={false}
        />
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors z-10"
        aria-label="Imagem anterior"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors z-10"
        aria-label="Próxima imagem"
      >
        <ChevronRight size={24} />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 right-4 bg-green-500 text-black px-3 py-1 rounded font-bold text-sm z-10">
        {currentIndex + 1}/{images.length}
      </div>

      {/* Overlay: Adquira já + Title over image with gradient */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent pt-20 pb-4 px-4 z-10">
        <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded mb-2 animate-pulse">
          Adquira já!
        </span>
        <p className="text-white font-bold text-sm md:text-base leading-tight">
          🎗️ RIFA SOLIDÁRIA – AJUDE A RECONSTRUIR O SONHO DA ITALIANCAR, ATINGIDA POR UM INCÊNDIO
        </p>
      </div>
    </div>

    {/* Meus Títulos bar below carousel */}
    {onMeusTitulos && (
      <button
        onClick={onMeusTitulos}
        className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-b-lg hover:from-gray-800 hover:to-gray-800 transition-all -mt-1"
      >
        <ShoppingCart size={18} className="text-white" />
        <span className="text-white font-bold text-sm">MEUS TÍTULOS</span>
      </button>
    )}
    </>
  );
}
