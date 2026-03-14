import { Instagram } from "lucide-react";

export function InstagramSection() {
  return (
    <div className="w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 rounded-lg p-8 text-center">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Nos siga no Instagram</h2>
        <p className="text-white/90">Acompanhe as novidades da campanha e da reconstrução da ItalianCar</p>
        <a
          href="https://instagram.com/italiancarautomotiva"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-pink-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
        >
          <Instagram size={20} />
          <span>Clique aqui para seguir!</span>
        </a>
      </div>
    </div>
  );
}
