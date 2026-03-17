# Modo Sandbox - Teste de Pagamentos

Sistema para testar o fluxo completo de pagamentos sem usar a API real da Safefy.

## 🎯 Funcionalidades

### 1. Criar Transação Pendente
- Cria uma transação de teste com status "pending"
- Gera dados fictícios de cliente
- Permite testar o fluxo de reprocessamento

### 2. Criar e Completar
- Cria uma transação de teste
- Automaticamente simula o webhook de pagamento
- Cria o pedido completo com códigos
- Envia evento para Utmify (marcado como teste)

### 3. Simular Pagamento
- Permite completar manualmente uma transação pendente
- Simula o webhook da Safefy
- Cria pedido e códigos
- Atualiza status para "paid"

## 📋 Como Usar

### No Painel Admin

1. **Acesse a seção "Modo Sandbox"**
   - Localizada logo após "Reprocessar Pagamentos Perdidos"
   - Identificada pela cor azul

2. **Defina a quantidade de títulos**
   - Digite um número entre 1 e 100
   - Cada título custa R$ 10,00 no modo sandbox

3. **Escolha o tipo de teste**:

   **Opção A: Criar Pendente**
   - Cria apenas a transação pendente
   - Útil para testar o fluxo de reprocessamento
   - Aparece na aba "Transações" como pendente

   **Opção B: Criar e Completar**
   - Cria e completa automaticamente
   - Útil para testar o fluxo completo rapidamente
   - Aparece imediatamente em "Pedidos"

4. **Simular Pagamento Manual**
   - Se criou uma transação pendente
   - Clique em "Simular Pagamento" no resultado
   - Completa a transação manualmente

## 🔧 Endpoints da API

### `/api/test-payment` (POST)
Cria uma transação de teste.

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "quantity": 1,
  "autoComplete": false
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Transação de teste criada (pendente)",
  "transaction_id": "TEST-1234567890-abc123def",
  "customer": {
    "name": "Cliente Teste Sandbox",
    "phone": "11999999999",
    "email": "teste@sandbox.com",
    "cpf": "111.111.111-11"
  },
  "quantity": 1,
  "total_price": "10.00",
  "status": "pending"
}
```

### `/api/test-webhook` (POST)
Simula o webhook de pagamento para uma transação.

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "transaction_id": "TEST-1234567890-abc123def"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Webhook de teste processado com sucesso",
  "transaction_id": "TEST-1234567890-abc123def",
  "codes": ["123456", "789012"],
  "order_created": true,
  "utmify_sent": true
}
```

## 📊 Dados de Teste

Todas as transações de teste usam os seguintes dados:

```javascript
{
  transactionId: "TEST-{timestamp}-{random}",
  customer: {
    name: "Cliente Teste Sandbox",
    phone: "11999999999",
    email: "teste@sandbox.com",
    cpf: "111.111.111-11"
  },
  pricePerTitle: 10.00,
  pixCode: "TEST-PIX-CODE-00020126360014br.gov.bcb.pix"
}
```

## ✅ Validações

O sistema garante:
- Não permite completar transações já pagas
- Não cria pedidos duplicados
- Gera códigos únicos de 6 dígitos
- Envia eventos para Utmify marcados como `isTest: true`
- Requer autenticação de admin

## 🔄 Fluxo Completo de Teste

### Cenário 1: Teste de Reprocessamento
1. Criar transação pendente (botão "Criar Pendente")
2. Verificar na aba "Transações" (status: pending)
3. Clicar em "Reprocessar Pagamentos Perdidos"
4. Sistema verifica na Safefy (não encontra)
5. Usar "Simular Pagamento" para completar
6. Verificar na aba "Pedidos" (status: paid, com códigos)

### Cenário 2: Teste Completo Rápido
1. Criar transação completa (botão "Criar e Completar")
2. Sistema cria transação + simula webhook automaticamente
3. Verificar na aba "Pedidos" (pedido já criado)
4. Verificar na aba "Transações" (status: paid)
5. Evento enviado para Utmify com `isTest: true`

## 🔐 Segurança

- Todos os endpoints requerem JWT de admin
- Transações de teste têm ID com prefixo "TEST-"
- Eventos no Utmify marcados como `isTest: true`
- Não interage com a API real da Safefy

## 🚀 Próximos Passos

Após testar no sandbox:
1. Verificar se os códigos são gerados corretamente
2. Confirmar que o Utmify recebe os eventos
3. Testar o botão de reprocessamento
4. Validar emails/notificações (se implementados)
5. Testar com diferentes quantidades de títulos
