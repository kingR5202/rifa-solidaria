# Guia de Deployment - ItalianCar Rifa Solidária

Este guia explica como fazer deploy do projeto em **Vercel** e **Deploy**.

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Vercel (https://vercel.com)
- Conta no Deploy (https://deploy.com)
- Banco de dados MySQL/TiDB configurado
- Chaves SafefyPay (https://safefypay.com.br)

## Variáveis de Ambiente Necessárias

Antes de fazer deploy, você precisa configurar as seguintes variáveis de ambiente:

### Banco de Dados
- `DATABASE_URL` - String de conexão MySQL/TiDB

### Autenticação
- `JWT_SECRET` - Chave secreta para cookies (mínimo 32 caracteres)
- `VITE_APP_ID` - ID da aplicação Manus OAuth
- `OAUTH_SERVER_URL` - URL do servidor OAuth Manus
- `VITE_OAUTH_PORTAL_URL` - URL do portal OAuth Manus
- `OWNER_OPEN_ID` - OpenID do proprietário
- `OWNER_NAME` - Nome do proprietário

### SafefyPay (Pagamentos PIX)
- `SAFEFY_PUBLIC_KEY` - Chave pública SafefyPay
- `SAFEFY_SECRET_KEY` - Chave secreta SafefyPay
- `SAFEFY_OFFLINE_MODE` - `true` para modo teste, `false` para produção

### APIs Manus (Auto-injetadas)
- `BUILT_IN_FORGE_API_URL` - URL da API Manus
- `BUILT_IN_FORGE_API_KEY` - Token da API Manus
- `VITE_FRONTEND_FORGE_API_URL` - URL da API Manus (frontend)
- `VITE_FRONTEND_FORGE_API_KEY` - Token da API Manus (frontend)

### Aplicação
- `VITE_APP_TITLE` - Título da aplicação
- `VITE_APP_LOGO` - URL do logo da aplicação
- `VITE_ANALYTICS_ENDPOINT` - Endpoint de analytics (opcional)
- `VITE_ANALYTICS_WEBSITE_ID` - ID do website para analytics (opcional)

## Deployment no Vercel

### Opção 1: Via Git (Recomendado)

1. **Faça push do projeto para GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/seu-usuario/italiancar-rifa.git
   git push -u origin main
   ```

2. **Conecte ao Vercel**
   - Acesse https://vercel.com/new
   - Selecione "Import Git Repository"
   - Escolha seu repositório GitHub
   - Clique em "Import"

3. **Configure as variáveis de ambiente**
   - Na aba "Environment Variables", adicione todas as variáveis listadas acima
   - Clique em "Deploy"

4. **Configure o banco de dados**
   - Após o deploy, acesse o dashboard do Vercel
   - Vá para "Settings" > "Environment Variables"
   - Atualize `DATABASE_URL` com a URL de produção

### Opção 2: Via CLI

```bash
# Instale o Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod

# Configure as variáveis de ambiente quando solicitado
```

## Deployment no Deploy

### Via Dashboard

1. **Acesse https://deploy.com**
2. **Clique em "New Project"**
3. **Selecione "Deploy from Git"**
4. **Conecte seu repositório GitHub**
5. **Configure as variáveis de ambiente:**
   - Vá para "Settings" > "Environment Variables"
   - Adicione todas as variáveis listadas acima
6. **Clique em "Deploy"**

### Via CLI

```bash
# Instale o Deploy CLI
npm i -g deploy

# Faça login
deploy login

# Deploy
deploy

# Configure as variáveis de ambiente conforme solicitado
```

## Configuração do Banco de Dados

### Para Vercel + MySQL

1. **Crie um banco MySQL externo** (ex: PlanetScale, AWS RDS)
2. **Obtenha a string de conexão**
3. **Adicione como variável de ambiente `DATABASE_URL`**

### Para Deploy + MySQL

1. **Crie um banco MySQL externo**
2. **Configure a string de conexão**
3. **Adicione como variável de ambiente `DATABASE_URL`**

## Configuração do SafefyPay

### Modo Teste (Desenvolvimento)
- Use as chaves de sandbox do SafefyPay
- Configure `SAFEFY_OFFLINE_MODE=true` para simular pagamentos

### Modo Produção
- Obtenha as chaves de produção do SafefyPay
- Configure `SAFEFY_OFFLINE_MODE=false`
- Atualize `SAFEFY_PUBLIC_KEY` e `SAFEFY_SECRET_KEY`

## Verificação Pós-Deploy

Após o deploy, verifique:

1. **Homepage carrega corretamente**
   - Acesse a URL do seu deploy
   - Verifique se o carrossel, seletor de quantidade e botão "Quero Participar" aparecem

2. **Fluxo de checkout funciona**
   - Clique em "Quero Participar"
   - Preencha nome e telefone
   - Verifique se o pop-up PIX aparece com QR Code

3. **Códigos são gerados**
   - Complete o fluxo de pagamento
   - Verifique se os códigos de 8 dígitos aparecem

4. **Banco de dados está conectado**
   - Verifique se os pedidos estão sendo salvos no banco

## Troubleshooting

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está correto
- Certifique-se de que o banco de dados está acessível
- Verifique firewall/regras de segurança

### Erro: "SafefyPay authentication failed"
- Verifique as chaves `SAFEFY_PUBLIC_KEY` e `SAFEFY_SECRET_KEY`
- Certifique-se de que as chaves são do ambiente correto (sandbox/produção)

### Erro: "OAuth callback failed"
- Verifique `VITE_APP_ID` e `OAUTH_SERVER_URL`
- Certifique-se de que a URL de callback está registrada no Manus

### QR Code não aparece
- Verifique se a biblioteca `qrcode` foi instalada
- Certifique-se de que `SAFEFY_OFFLINE_MODE` está configurado corretamente

## Suporte

Para suporte, entre em contato com:
- Manus: https://help.manus.im
- SafefyPay: https://safefypay.com.br

## Próximos Passos

Após o deployment bem-sucedido:

1. **Configure webhook SafefyPay** para atualizar status de pagamentos
2. **Implemente envio de e-mail** com os códigos gerados
3. **Crie dashboard admin** para gerenciar sorteio
4. **Configure domínio customizado** (opcional)
