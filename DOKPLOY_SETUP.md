# Setup Dokploy - ItalianCar Rifa Solidária

Guia completo para fazer deploy do projeto no Dokploy.

## 📋 Pré-requisitos

- Dokploy instalado e rodando
- Acesso ao dashboard Dokploy
- Repositório GitHub conectado (já feito!)
- Domínio configurado (opcional)

## 🚀 Passo 1: Conectar Repositório GitHub

1. Acesse o dashboard do Dokploy
2. Vá para **Repositories** ou **Git**
3. Clique em **Connect Repository**
4. Selecione **GitHub**
5. Autorize o Dokploy
6. Selecione o repositório `LKLV1/rifa-solidaria`

## 🐳 Passo 2: Criar Aplicação Docker

### Opção A: Via Docker Compose (Recomendado)

1. No Dokploy, vá para **Applications**
2. Clique em **New Application**
3. Selecione **Docker Compose**
4. Preencha os dados:
   - **Name**: `italiancar-rifa`
   - **Repository**: `LKLV1/rifa-solidaria`
   - **Branch**: `main`
   - **Docker Compose File**: `docker-compose.yml`

5. Clique em **Create**

### Opção B: Via Dockerfile

1. No Dokploy, vá para **Applications**
2. Clique em **New Application**
3. Selecione **Docker**
4. Preencha os dados:
   - **Name**: `italiancar-rifa`
   - **Repository**: `LKLV1/rifa-solidaria`
   - **Branch**: `main`
   - **Dockerfile**: `Dockerfile`
   - **Port**: `3000`

5. Clique em **Create**

## 🔐 Passo 3: Configurar Variáveis de Ambiente

No dashboard Dokploy, vá para sua aplicação e clique em **Environment Variables**.

Adicione as seguintes variáveis:

### Banco de Dados
```
DATABASE_URL=mysql://seu_usuario:sua_senha@db:3306/italiancar_rifa
MYSQL_ROOT_PASSWORD=sua_senha_root
MYSQL_DATABASE=italiancar_rifa
MYSQL_USER=italiancar_user
MYSQL_PASSWORD=sua_senha_usuario
```

### Autenticação
```
JWT_SECRET=uma-chave-secreta-com-min-32-caracteres-aleatorios
VITE_APP_ID=seu-app-id-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=seu-owner-open-id
OWNER_NAME=Seu Nome
```

### SafefyPay (Pagamentos PIX)
```
SAFEFY_PUBLIC_KEY=pk_production_sua_chave_publica
SAFEFY_SECRET_KEY=sk_production_sua_chave_secreta
SAFEFY_OFFLINE_MODE=false
```

### APIs Manus
```
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-forge-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua-frontend-forge-api-key
```

### Aplicação
```
VITE_APP_TITLE=ItalianCar - Rifa Solidária
VITE_APP_LOGO=https://seu-cdn.com/logo.png
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu-website-id
```

## 🌐 Passo 4: Configurar Domínio (Opcional)

1. No Dokploy, vá para sua aplicação
2. Clique em **Domains**
3. Clique em **Add Domain**
4. Preencha:
   - **Domain**: `rifa.seu-dominio.com` (ou outro)
   - **Port**: `3000`
   - **SSL**: Ativar (automático com Let's Encrypt)

5. Clique em **Add**

## 📦 Passo 5: Deploy

1. No Dokploy, vá para sua aplicação
2. Clique em **Deploy**
3. Aguarde o build completar (pode levar 5-10 minutos)
4. Verifique os logs em **Logs**
5. Acesse a URL da sua aplicação

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

1. **Homepage**
   - Acesse `http://localhost:3000` ou seu domínio
   - Verifique se o carrossel, seletor de quantidade e botão "Quero Participar" aparecem

2. **Checkout**
   - Clique em "Quero Participar"
   - Preencha nome e telefone
   - Verifique se o pop-up PIX aparece

3. **QR Code**
   - Verifique se o QR Code é exibido (preto e branco)
   - Tente escanear com um celular

4. **Códigos Gerados**
   - Após o pagamento, verifique se os códigos de 8 dígitos aparecem

5. **Banco de Dados**
   - Verifique se os pedidos estão sendo salvos
   - Acesse o container MySQL: `docker exec -it italiancar-db mysql -u root -p`

## 🔧 Troubleshooting

### Erro: "Build failed"
```bash
# Verifique os logs
docker logs italiancar-rifa
```

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está correto
- Certifique-se de que o container MySQL está rodando
- Verifique a senha do banco

### Erro: "Cannot find module 'qrcode'"
```bash
# Reinstale dependências
docker exec italiancar-rifa npm install
```

### Erro: "SafefyPay authentication failed"
- Verifique as chaves `SAFEFY_PUBLIC_KEY` e `SAFEFY_SECRET_KEY`
- Certifique-se de que `SAFEFY_OFFLINE_MODE=false` em produção

### Porta 3000 já em uso
```bash
# Mude a porta no docker-compose.yml
ports:
  - "3001:3000"  # Mude para 3001
```

## 📊 Monitoramento

No Dokploy, você pode:

1. **Ver logs em tempo real**
   - Vá para **Logs** na aplicação

2. **Monitorar recursos**
   - Vá para **Metrics**
   - Verifique CPU, memória, rede

3. **Gerenciar containers**
   - Vá para **Containers**
   - Restart, stop, ou remove containers

## 🔄 Atualizações Futuras

Para atualizar o projeto:

1. Faça push das mudanças para GitHub
2. No Dokploy, clique em **Redeploy**
3. Ou configure **Auto Deploy** para fazer push automático

## 📚 Documentação Adicional

- **Dokploy**: https://dokploy.com/docs
- **Docker**: https://docs.docker.com
- **Docker Compose**: https://docs.docker.com/compose

## 🆘 Suporte

- **Manus**: https://help.manus.im
- **SafefyPay**: https://safefypay.com.br
- **Dokploy Community**: https://dokploy.com/community
