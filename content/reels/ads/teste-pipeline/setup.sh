#!/usr/bin/env bash
cat > wtec << 'EOF'
#!/usr/bin/env bash
echo ""
echo "  -> boot: 47 apps na inicialização"
sleep 0.45
echo "  -> disco: 98% cheio"
sleep 0.45
echo "  -> temperatura: 89°C"
sleep 0.45
echo "  !! 4 problemas encontrados"
sleep 0.9
EOF
chmod +x wtec
