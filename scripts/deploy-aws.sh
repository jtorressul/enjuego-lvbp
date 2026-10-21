#!/usr/bin/env bash
set -e

SERVER_IP="18.204.81.98"
KEY_PATH="$HOME/.ssh/enjuego-aws.pem"

echo "🚀 Desplegando enjuego.online a AWS Lightsail ($SERVER_IP)..."

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@"$SERVER_IP" "/home/ubuntu/deploy.sh"

echo "✅ Despliegue completado con éxito."
