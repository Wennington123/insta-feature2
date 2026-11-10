#!/usr/bin/env python3
"""Compõe o reel final: vídeo (xfade) + áudio (trilha + SFX sincronizados)."""
import subprocess
import sys

D = "/tmp/kenney-interface-sounds-master/addons/kenney_interface_sounds"
VIL = "media/videos/viloes/1920p60/viloes.mp4"
CTA = "media/videos/cta_dark/1920p60/cta.mp4"
OUT = "notebook-pipeline-test.mp4"

def dur(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", f], capture_output=True, text=True)
    return float(r.stdout.strip())

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        sys.exit(1)

# ---- 1. vídeo ----
h, v, b, c = dur("hook-fast.mp4"), dur(VIL), dur("boot.mp4"), dur(CTA)
t = 0.4
o1, o2, o3 = h - t, h + v - 2 * t, h + v + b - 3 * t
total = h + v + b + c - 3 * t
print(f"hook {h} vil {v} boot {b} cta {c} -> offsets {o1:.2f}/{o2:.2f}/{o3:.2f}, total {total:.2f}s")

run(["ffmpeg", "-y", "-loglevel", "error",
     "-i", "hook-fast.mp4", "-i", VIL, "-i", "boot.mp4", "-i", CTA,
     "-filter_complex",
     f"[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];"
     f"[2:v]fps=30,format=yuv420p[v2];[3:v]fps=30,format=yuv420p[v3];"
     f"[v0][v1]xfade=transition=fade:duration=0.4:offset={o1:.2f}[x1];"
     f"[x1][v2]xfade=transition=fade:duration=0.4:offset={o2:.2f}[x2];"
     f"[x2][v3]xfade=transition=fade:duration=0.4:offset={o3:.2f}[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
     "-pix_fmt", "yuv420p", "-movflags", "+faststart", "_video.mp4"])

# ---- 2. áudio ----
# (arquivo, volume, tempo_em_segundos)
sfx = [
    # teclas do hook
    (f"{D}/tick_001.wav", 0.45, 0.05), (f"{D}/tick_002.wav", 0.45, 0.17),
    (f"{D}/tick_001.wav", 0.45, 0.29), (f"{D}/tick_002.wav", 0.45, 0.41),
    (f"{D}/tick_001.wav", 0.45, 0.53), (f"{D}/tick_002.wav", 0.45, 0.65),
    # linhas do output
    (f"{D}/select_001.wav", 0.4, 1.05), (f"{D}/select_001.wav", 0.4, 1.50),
    (f"{D}/select_001.wav", 0.4, 1.95),
    # alerta "!!"
    (f"{D}/error_001.wav", 0.55, 2.40),
    # itens do manim (vilões)
    (f"{D}/glass_001.wav", 0.4, o1 + 1.35), (f"{D}/glass_001.wav", 0.4, o1 + 1.90),
    (f"{D}/glass_001.wav", 0.4, o1 + 2.45), (f"{D}/glass_001.wav", 0.4, o1 + 3.00),
    # boot: contador
    (f"{D}/pluck_001.wav", 0.4, o2 + 0.2),
    # CTA: botão + ding (logo 0.55 + título 1.1 + sub 0.6 = grow em ~2.25s)
    (f"{D}/click_001.wav", 0.5, o3 + 2.25), (f"{D}/confirmation_002.wav", 0.55, o3 + 2.55),
]

inputs = ["-i", "/tmp/trilha.mp3"]
for path, _, _ in sfx:
    inputs += ["-i", path]
filters = []
mix_labels = []
# música
filters.append(
    f"[0:a]atrim=0:{total:.2f},asetpts=PTS-STARTPTS,"
    f"volume=0.13,afade=t=in:d=0.5,afade=t=out:st={total - 1.3:.2f}:d=1.3,"
    f"aresample=44100,aformat=channel_layouts=stereo[mus]")
mix_labels.append("[mus]")

# whoosh sintético nas 3 transições
for i, ts in enumerate([o1, o2, o3], start=1):
    filters.append(
        f"anoisesrc=colour=pink:duration=0.35:amplitude=0.5,"
        f"lowpass=f=1000,highpass=f=250,"
        f"afade=t=in:d=0.06,afade=t=out:st=0.18:d=0.17,"
        f"volume=0.30,aresample=44100,aformat=channel_layouts=stereo,"
        f"adelay={int(ts * 1000)}:all=1[w{i}]")
    mix_labels.append(f"[w{i}]")

# sfx
for i, (path, vol, ts) in enumerate(sfx, start=1):
    filters.append(
        f"[{i}:a]volume={vol},aresample=44100,"
        f"aformat=channel_layouts=stereo,adelay={int(ts * 1000)}:all=1[s{i}]")
    mix_labels.append(f"[s{i}]")

n_inputs = len(sfx) + 1
fc = ";".join(filters) + ";" + "".join(mix_labels) + \
     f"amix=inputs={len(mix_labels)}:normalize=0,atrim=0:{total:.2f}[a]"

cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inputs + \
      ["-filter_complex", fc, "-map", "[a]", "-c:a", "aac", "-b:a", "160k",
       "_audio.m4a"]
run(cmd)

# ---- 3. mux ----
run(["ffmpeg", "-y", "-loglevel", "error",
     "-i", "_video.mp4", "-i", "_audio.m4a",
     "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy",
     "-shortest", "-movflags", "+faststart", OUT])

print(f"OK: {OUT} ({total:.2f}s)")
