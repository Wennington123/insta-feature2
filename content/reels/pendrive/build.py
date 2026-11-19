#!/usr/bin/env python3
"""Build do reel "Como funciona um pendrive".

Roteiro JSON → Piper TTS (bloco por slide) → durações → cenas Manim
→ SRT proporcional → concat vídeo/áudio → legendas queimadas → mp4 final.

Uso: python3 build.py   (rota: roteiro → final, idempotente)
"""
import glob
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MANIM = os.path.join(ROOT, ".venv-manim", "bin", "manim")
PIPER = "/tmp/piper/piper/piper"
VOICE_M = "/tmp/piper/faber.onnx"
VOICE_C = "/tmp/piper/faber.onnx.json"
ROTEIRO = os.path.join(ROOT, "content", "posts", "como-funciona-um-pendrive.json")
OUT = os.path.join(ROOT, "content", "reels", "como-funciona-um-pendrive.mp4")
TAIL = 0.5  # silêncio ao fim de cada bloco (cena continua em hold)

STYLE = ("force_style='FontName=DejaVu Sans,FontSize=9,Bold=1,"
         "PrimaryColour=&H00FFFFFF,OutlineColour=&H64000000,BorderStyle=1,"
         "Outline=1.2,Shadow=0,MarginV=55,Alignment=2'")


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(" ".join(cmd))
        print(r.stderr[-2500:])
        sys.exit(1)
    return r


def dur(f):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", f], capture_output=True, text=True)
    return float(r.stdout.strip())


def main():
    os.chdir(HERE)
    with open(ROTEIRO) as f:
        roteiro = json.load(f)
    slides = sorted(roteiro["slides"], key=lambda s: s["index"])

    # ---- 1. narração (Piper) ----
    wavs = []
    for i, sl in enumerate(slides, 1):
        wav = f"audio/seg{i}.wav"
        os.makedirs("audio", exist_ok=True)
        run([PIPER, "-m", VOICE_M, "-c", VOICE_C, "-f", wav],
            input=sl["voiceover"])
        wavs.append(wav)
        print(f"tts seg{i}: {dur(wav):.2f}s")

    # ---- 2. durações das cenas (áudio + hold) ----
    durs = {}
    for i, sl in enumerate(slides, 1):
        durs[sl["scene"]] = dur(f"audio/seg{i}.wav") + TAIL
    with open("durs.json", "w") as f:
        json.dump(durs, f, indent=1)
    print("durs:", {k: round(v, 2) for k, v in durs.items()})

    # ---- 3. cenas manim ----
    for i, sl in enumerate(slides, 1):
        out = f"seg{i}.mp4"
        run([MANIM, "pendrive.py", sl["scene"], "-o", out])
        # manim grava em media/videos/<scene>/<qualidade>/<out>
        hits = glob.glob(f"media/videos/**/{out}", recursive=True)
        if not hits:
            print(f"manim não produziu {out}"); sys.exit(1)
        subprocess.run(["cp", hits[0], out], check=True)
        print(f"manim {sl['scene']} ok")

    # ---- 4. legendas SRT (proporcionais ao texto) ----
    def chunks(text, maxlen=34):
        words, out, cur = text.split(), [], ""
        for w in words:
            if cur and len(cur) + 1 + len(w) > maxlen:
                out.append(cur)
                cur = w
            else:
                cur = f"{cur} {w}".strip()
        if cur:
            out.append(cur)
        return out

    t0 = 0.0
    lines = []
    fmt = lambda t: f"{int(t//3600):02d}:{int(t%3600//60):02d}:{int(t%60):02d},{int(t*1000)%1000:03d}"
    for i, sl in enumerate(slides, 1):
        d = durs[sl["scene"]]
        cs = chunks(sl["voiceover"])
        total_chars = sum(len(c) for c in cs)
        t = t0 + 0.15
        for c in cs:
            dt = (len(c) / total_chars) * (d - TAIL - 0.3)
            lines.append(f"{len(lines)+1}\n{fmt(t)} --> {fmt(min(t + dt, t0 + d - 0.05))}\n{c}\n")
            t += dt
        t0 += d
    with open("captions.srt", "w") as f:
        f.write("\n".join(lines))

    # ---- 5. vídeo: fades + concat ----
    n = len(slides)
    inputs, fparts, labels = [], [], []
    for i in range(1, n + 1):
        inputs += ["-i", f"seg{i}.mp4"]
        fades = "fade=t=in:st=0:d=0.25"
        if i == n:
            fades += f",fade=t=out:st={durs[slides[-1]['scene']] - 0.4:.2f}:d=0.4"
        fparts.append(f"[{i-1}:v]fps=30,format=yuv420p,{fades}[v{i}]")
        labels.append(f"[v{i}]")
    run(["ffmpeg", "-y", "-loglevel", "error"] + inputs +
        ["-filter_complex", ";".join(fparts) + ";" +
         "".join(labels) + f"concat=n={n}:v=1:a=0[v]",
         "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-pix_fmt", "yuv420p", "_video.mp4"])

    # ---- 6. áudio: pad + concat ----
    # trilho de silêncio compartilhado
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "anullsrc=r=22050:cl=mono", "-t", str(TAIL),
         "-c:a", "pcm_s16le", "sil.wav"])
    with open("concat.txt", "w") as f:
        for i in range(1, n + 1):
            f.write(f"file 'audio/seg{i}.wav'\nfile 'sil.wav'\n")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", "concat.txt", "-c:a", "pcm_s16le", "narration.wav"])

    # ---- 7. final: legendas queimadas + mux ----
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", "_video.mp4",
         "-i", "narration.wav", "-filter_complex",
         f"[0:v]subtitles=captions.srt:{STYLE}[v]",
         "-map", "[v]", "-map", "1:a",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
         "-ar", "44100", "-ac", "2", "-shortest", "-movflags", "+faststart",
         OUT])
    print(f"OK: {OUT} ({dur(OUT):.2f}s)")


if __name__ == "__main__":
    main()
