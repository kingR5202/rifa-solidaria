import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function DescriptionAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full bg-black/50 rounded-lg border-2 border-dashed border-yellow-400 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/75 transition-colors"
      >
        <div className="flex items-center gap-2 text-white font-bold">
          <span className="text-xl">📋</span>
          <span>Descrição / Regulamento</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-yellow-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 text-white text-sm space-y-4 border-t border-yellow-400/30">
          <div>
            <h3 className="font-bold text-yellow-400 mb-2">🎗️ RIFA SOLIDÁRIA</h3>
            <p className="mb-3">
              Em poucos minutos, o fogo destruiu <strong>16 carros</strong>, além da estrutura,
              ferramentas e anos de trabalho construídos com muito esforço.
            </p>
            <p className="mb-3">
              A <strong>Italiancar</strong> não perdeu apenas veículos. Perdeu projetos, histórias
              e o sustento de quem vive desse trabalho todos os dias.
            </p>
            <p className="mb-3">
              Essa rifa nasce para transformar solidariedade em reconstrução. Cada número comprado
              é mais do que uma chance de ganhar: é um gesto de apoio para ajudar a reerguer tudo
              o que foi perdido.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2">🏆 PRÊMIOS</h3>
            <ul className="space-y-2">
              <li>🚗 <strong>Eclipse GST 1995 – Placa Preta</strong></li>
              <li>🏍️ <strong>Kawasaki Z1000 – 2013</strong></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2">💰 VALOR</h3>
            <p>Cada título: <strong>R$ 2,50</strong></p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2">📋 REGULAMENTO</h3>
            <p className="text-xs text-gray-300">
              A rifa é uma iniciativa solidária para ajudar a Italiancar Automotiva a se reconstruir
              após o incêndio que destruiu suas instalações e frota. Todos os valores arrecadados
              serão destinados à reconstrução da empresa. O sorteio será realizado conforme
              regulamentação específica divulgada posteriormente.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2">🤝 SOLIDARIEDADE</h3>
            <p>
              Juntos, vamos ajudar a <strong>Italiancar</strong> a se levantar mais forte.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
