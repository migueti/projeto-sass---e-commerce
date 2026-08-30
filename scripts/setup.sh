#!/bin/bash

# Setup script for local development
# Este script inicializa o ambiente de desenvolvimento local com tudo que é necessário.

set -e

echo "🚀 Inicializando ambiente de desenvolvimento..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
  echo "❌ Docker não está instalado. Por favor, instale Docker primeiro."
  exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose não está instalado. Por favor, instale Docker Compose primeiro."
  exit 1
fi

# Instalar dependências Node.js
echo "📦 Instalando dependências Node.js..."
npm install

# Iniciar banco de dados
echo "🗄️  Iniciando PostgreSQL..."
docker-compose up -d

# Aguardar banco estar pronto
echo "⏳ Aguardando banco de dados ficar pronto..."
sleep 3

# Aplicar migrações
echo "🔄 Aplicando migrações do Prisma..."
npm run db:migrate

# Gerar cliente Prisma
echo "✨ Gerando Prisma Client..."
npm run db:generate

echo ""
echo "✅ Ambiente pronto! Agora você pode executar:"
echo ""
echo "   npm run dev       # Iniciar servidor de desenvolvimento"
echo "   npm test          # Rodar testes"
echo "   npm run build     # Build para produção"
echo ""
echo "Para parar o banco de dados, execute:"
echo "   docker-compose down"
echo ""
