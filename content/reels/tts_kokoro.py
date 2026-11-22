#!/usr/bin/env python3
"""TTS Kokoro (pt-BR, voz pm_santa) — usado pelos build.py dos reels.

Uso: tts_kokoro.py "texto" saida.wav
Modelo em ~/.local/share/kokoro (baixado do GitHub thewh1teagle/kokoro-onnx).
"""
import re
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

MODEL = "/home/wenningtonda/.local/share/kokoro/kokoro-v1.0.onnx"
VOICES = "/home/wenningtonda/.local/share/kokoro/voices-v1.0.bin"

# Termos estrangeiros -> grafia fonética PT-BR (só pra voz; a legenda
# usa o texto original do roteiro). Adicionar conforme aparecerem.
FONETICO = {
    "wi-fi": "uaifai",
    "wifi": "uaifai",
    "app": "ápe",
    "apps": "ápes",
    "smartphone": "ismartfôni",
    "download": "daunlôde",
    "streaming": "strêimin",
    "cache": "cachê",
    "flash": "flésh",
    "desktop": "déquitôpe",
}


def fonetizar(t):
    for k, v in sorted(FONETICO.items(), key=lambda kv: -len(kv[0])):
        t = re.sub(re.escape(k), v, t, flags=re.IGNORECASE)
    return t


text, out = fonetizar(sys.argv[1]), sys.argv[2]
kokoro = Kokoro(MODEL, VOICES)
audio, rate = kokoro.create(text, voice="pm_santa", speed=1.0, lang="pt-br")
sf.write(out, audio, rate)
