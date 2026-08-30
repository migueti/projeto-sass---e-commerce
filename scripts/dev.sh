#!/bin/bash

# Start script for local development
# Este script inicia o banco de dados se não estiver rodando e inicia o servidor dev.

set -e

echo "🗄️  Verificando se PostgreSQL está rodando..."

# Verificar se container está rodando
if docker ps | grep -q nuvem-postgres; then
  echo "✅ PostgreSQL já está rodando"
else
  echo "🚀 Iniciando PostgreSQL..."
  docker-compose up -d
  sleep 2
fi

echo "🚀 Iniciando servidor de desenvolvimento..."
npm run dev
