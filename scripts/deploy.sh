#!/usr/bin/env bash
set -e

SERVER_IP="65.75.202.52"
KEY_PATH="$HOME/.ssh/enjuego_vps_key"

echo "🚀 Desplegando enjuego.online al VPS ($SERVER_IP)..."

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" root@"$SERVER_IP" "/root/deploy.sh"

echo "✅ Despliegue completado con éxito."
