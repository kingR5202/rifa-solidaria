# ItalianCar Rifa Solidária - TODO

## Funcionalidades Obrigatórias

### Design & Componentes
- [x] Restaurar design completo do site (carrossel 9 imagens, header com logo, seção de compra)
- [x] Implementar carrossel de imagens com navegação anterior/próximo
- [x] Criar header com logo ItalianCar e ícone Instagram
- [x] Implementar seção de compra de títulos com seletor de quantidade
- [x] Criar descrição/regulamento expansível
- [x] Implementar seção Instagram com gradiente
- [x] Otimizar imagens para performance (CDN)
- [x] Adicionar meta tags para SEO

### Sistema de Pagamento
- [x] Configurar variáveis de ambiente SafefyPay (.env)
- [x] Implementar pop-up de checkout (nome e telefone)
- [x] Integrar SafefyPay API para gerar QR Code PIX
- [x] Implementar pop-up de pagamento PIX com QR Code
- [x] Criar backend tRPC para processar pagamentos
- [x] Validar dados do usuário no backend
- [x] Implementar cálculo automático de preço (R$ 2,50/título)
- [x] Implementar seletor de quantidade com botões pré-definidos

### Backend & Notificações
- [x] Criar schema de dados para pedidos/pagamentos
- [x] Implementar procedimento tRPC para iniciar pagamento
- [x] Integrar notificações do proprietário quando pagamento iniciado
- [ ] Integrar notificações do proprietário quando pagamento concluído
- [x] Validar segurança das chaves de API

### Testes & Validação
- [x] Testar fluxo completo de checkout (vitest)
- [x] Testar geração de QR Code PIX (vitest)
- [x] Testar notificações do proprietário (vitest)
- [x] Validar responsividade do design (visual)
- [ ] Testar em diferentes navegadores

## Progresso

- [x] Projeto inicializado com web-db-user scaffold
- [x] Fase 1: Configurar variáveis de ambiente
- [x] Fase 2: Restaurar design
- [x] Fase 3: Pop-up de checkout
- [x] Fase 4: Integração SafefyPay (API client)
- [x] Fase 5: Pop-up PIX
- [x] Fase 6: Backend tRPC
- [ ] Fase 7: Otimização e SEO
- [ ] Fase 8: Testes finais

## Bugs & Correções

- [x] Erro de autenticação SafefyPay (Token inválido) - Implementar modo offline
- [x] Bug na digitação de telefone - Remover "55" automático e melhorar formatação
- [x] Integração SafefyPay com autenticação JWT correta
- [x] QR Code branco - Gerar QR Code em PNG com biblioteca qrcode
- [ ] Validar credenciais reais da SafefyPay em produção

## Novas Funcionalidades

- [x] Gerar código de 8 dígitos (letras + números) para cada título após pagamento
- [x] Corrigir bug do campo de telefone (deletar/digitar números)
- [x] Criar pop-up de exibição dos códigos gerados
- [x] Salvar códigos no banco de dados


## Mudanças de Design e Funcionalidade (v2.0)

### Título e Cores
- [x] Alterar título principal para "RIFA SOLIDÁRIA – AJUDE A RECONSTRUIR O SONHO DA ITALIANCAR, ATINGIDA POR UM INCÊNDIO"
- [x] Alterar cor do título para Verde (#28a745)
- [x] Remover cores vermelhas do projeto
- [x] Padronizar cores: Azul ou Verde para botões

### Carrossel
- [x] Implementar swipe para mobile
- [x] Implementar auto-play com transição suave para desktop

### Botões e Ações
- [x] Alterar texto "Quero Participar" para "QUERO AJUDAR"
- [x] Alterar cor do botão principal para Verde
- [x] Aumentar tamanho do botão principal

### Valores da Rifa
- [x] Alterar preço unitário de R$ 2,50 para R$ 10,00
- [x] Atualizar seletores: 10, 20, 30, 40, 50, 100 reais

### Pop-up de Checkout
- [x] Aplicar Glassmorphism (fundo tipo vidro com blur)
- [x] Remover cor amarela do campo "Total"
- [x] Alterar texto de aviso para branco
- [x] Remover botão "Cancelar" permanentemente

### Fluxo de Pagamento PIX
- [x] Implementar Skeleton Screen durante geração de PIX
- [x] Desabilitar fechar modal após clicar em "Pagar"
- [x] Reduzir tamanho do QR Code
- [x] Alterar cor do botão "Copiar Código" para Verde


## Ajustes de UI (v2.1)

- [x] Aumentar bordas arredondadas nos pop-ups (CheckoutModal e PixModal) - rounded-3xl
- [x] Aumentar transparência e efeito glassmorphism nos pop-ups - backdrop-blur-xl
- [x] Implementar scroll vertical dentro dos modais sem mover a página de fundo - overflow-y-auto

- [x] Remover botão "Fechar" e ícone X na tela de QR Code PIX
