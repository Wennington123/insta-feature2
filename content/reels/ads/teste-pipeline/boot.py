"""Animação: tempo de boot caindo após otimização (exemplo ilustrativo)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

BG, FG, ACCENT, MUTED = "#0d1117", "#e6edf3", "#0578F5", "#8b949e"

fig, ax = plt.subplots(figsize=(9, 16), dpi=120)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.axis("off")

ax.text(5, 8.6, "TEMPO DE BOOT", ha="center", color=FG,
        fontsize=34, fontweight="bold")
ax.text(5, 7.9, "antes  vs  depois da otimização", ha="center",
        color=MUTED, fontsize=18)

bar_bg = ax.barh([5.5], [8.6], height=1.6, color="#21262d")[0]
bar = ax.barh([5.5], [8.6], height=1.6, color=ACCENT)[0]
counter = ax.text(5, 4.1, "180s", ha="center", color=FG,
                  fontsize=52, fontweight="bold")
note = ax.text(5, 1.8, "exemplo ilustrativo —\ndiagnóstico antes de trocar peça",
               ha="center", color=MUTED, fontsize=17, linespacing=1.6)

frames_total = 90
start, end = 8.6, 8.6 * 45 / 180

def update(f):
    t = f / (frames_total - 1)
    eased = 1 - (1 - t) ** 3
    bar.set_width(start + (end - start) * eased)
    seconds = round(180 + (45 - 180) * eased)
    counter.set_text(f"{seconds}s")
    # contador fica verde quando a otimização "morde"
    if seconds <= 90:
        counter.set_color("#3FB950")
    return bar, counter

anim = FuncAnimation(fig, update, frames=frames_total, interval=33.3, blit=True)
anim.save("boot.mp4", writer="ffmpeg", fps=30, dpi=120,
          savefig_kwargs={"facecolor": BG})
print("boot.mp4 ok")
