"""Reel didático: Como funciona um pendrive (1080x1920, 30fps).

Cenas sincronizadas com a narração: cada cena recebe a duração do bloco
de áudio em durs.json e espalha as animações por frações desse tempo.
"""
import json
import os

from manim import *

ACCENT = "#0578F5"
GREEN = "#3FB950"
RED = "#FF5555"
ORANGE = "#FFB86C"
MUTED = "#5B6B80"
FONT = "DejaVu Sans"

_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    with open(os.path.join(_DIR, "durs.json")) as f:
        DURS = json.load(f)
except FileNotFoundError:
    DURS = {}


def fit(mobj, w=4.2):
    if mobj.width > w:
        mobj.scale_to_fit_width(w)
    return mobj


def txt(s, size=24, **kw):
    kw.setdefault("font", FONT)
    return Text(s, font_size=size, **kw)


class SyncScene(Scene):
    NAME = ""

    def _total(self):
        return DURS.get(self.NAME, 10.0)

    def P(self, *anims, rt=1.0, **kw):
        self._e = getattr(self, "_e", 0.0) + rt
        self.play(*anims, run_time=rt, **kw)

    def W(self, until_frac):
        target = self._total() * until_frac
        dt = target - getattr(self, "_e", 0.0)
        if dt > 0.01:
            self._e += dt
            self.wait(dt)

    def hold_tail(self):
        dt = self._total() - getattr(self, "_e", 0.0)
        if dt > 0.01:
            self._e += dt
            self.wait(dt)


def eyebrow(self, s):
    m = txt(s.upper(), 18, color=MUTED, weight=BOLD)
    m.to_edge(UP, buff=0.55)
    return m


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        icon = SVGMobject("usb.svg").scale_to_fit_height(1.1).set_color(ACCENT)
        icon.next_to(eb, DOWN, buff=1.3)
        self.P(FadeIn(icon, scale=1.4), rt=0.7)

        title = fit(txt("COMO FUNCIONA UM\nPENDRIVE?", 44, weight=BOLD,
                        line_spacing=0.9,
                        t2c={"PENDRIVE?": ACCENT}))
        title.next_to(icon, DOWN, buff=0.9)
        self.P(Write(title), rt=1.2)

        sub = fit(txt("3 chips. Zero mágica.", 26, color=MUTED))
        sub.next_to(title, DOWN, buff=0.7)
        self.W(0.55)
        self.P(FadeIn(sub, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class PARTES(SyncScene):
    NAME = "PARTES"

    ROWS = [
        ("usb.svg", "CONECTOR", "energia + dados", ACCENT, 0.16),
        ("cpu.svg", "CONTROLADOR", "o cérebro", ORANGE, 0.42),
        ("hard-drive.svg", "MEMÓRIA FLASH", "os arquivos moram aqui", GREEN, 0.68),
    ]

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "por dentro")
        self.P(FadeIn(eb), rt=0.4)

        self._boxes = []
        y = 1.9
        for svg, label, desc, color, frac in self.ROWS:
            box = RoundedRectangle(corner_radius=0.18, width=3.6, height=1.35,
                                   stroke_color=color, stroke_width=3.5)
            icon = SVGMobject(svg).scale_to_fit_height(0.55).set_color(color)
            lab = txt(label, 26, color=WHITE, weight=BOLD)
            d = txt(desc, 18, color=MUTED)
            content = VGroup(icon, VGroup(lab, d).arrange(DOWN, buff=0.12))
            content.arrange(RIGHT, buff=0.35)
            if content.width > box.width - 0.35:
                content.scale_to_fit_width(box.width - 0.35)
            content.move_to(box.get_center())
            grp = VGroup(box, content)
            grp.move_to([0, y, 0])
            self.W(frac - 0.04)
            self.P(FadeIn(grp, shift=RIGHT * 0.6), rt=0.55)
            self._boxes.append(grp)
            y -= 1.75
        self.hold_tail()


class FLASH(SyncScene):
    NAME = "FLASH"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a mágica")
        title = fit(txt("A CÉLULA DE FLASH", 34, weight=BOLD,
                        t2c={"FLASH": GREEN}))
        title.next_to(eb, DOWN, buff=0.6)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.8)

        cell = RoundedRectangle(corner_radius=0.3, width=2.9, height=2.3,
                                stroke_color=WHITE, stroke_width=4)
        cell.move_to([0, 0.4, 0])
        lab = txt("CÉLULA", 20, color=MUTED)
        lab.next_to(cell, DOWN, buff=0.35)
        self.W(0.14)
        self.P(Create(cell), FadeIn(lab), rt=0.7)

        bits = txt("1", 72, weight=BOLD, color=GREEN)
        bits.next_to(cell, RIGHT, buff=0.25)
        bitz = txt("0", 72, weight=BOLD, color=RED)
        bitz.next_to(cell, RIGHT, buff=0.25)

        cx, cy = cell.get_center()[0], cell.get_center()[1]
        offs = [(-0.55, 0.3), (0.1, 0.3), (-0.55, -0.35), (0.1, -0.35)]
        inside = VGroup(*[Dot([cx + ox, cy + oy, 0], radius=0.11,
                              color=GREEN, fill_opacity=1.0)
                          for ox, oy in offs])
        outside = VGroup(*[Dot([1.75 + 0.3 * (i % 2), cy + 0.35 - 0.7 * (i // 2),
                                0], radius=0.11, color=GREEN,
                               fill_opacity=1.0)
                           for i in range(4)])

        self.W(0.26)
        self.P(*[MoveAlongPath(o, ArcBetweenPoints(o.get_center(),
                                                   inside[i].get_center(),
                                                   -PI / 4))
                 for i, o in enumerate(outside)], rt=1.0)
        self.P(FadeIn(bits, scale=1.5), rt=0.4)

        self.W(0.44)
        self.P(FadeOut(bits), rt=0.25)
        self.P(FadeOut(inside), rt=0.4)
        self.P(FadeIn(bitz, scale=1.5), rt=0.4)

        self.W(0.60)
        self.P(FadeOut(bitz), rt=0.25)
        self.P(FadeIn(inside), rt=0.4)

        foot = fit(txt("desligou? continuam trancados.", 24, color=GREEN,
                       weight=BOLD))
        foot.to_edge(DOWN, buff=0.9)
        self.W(0.74)
        self.P(FadeIn(foot, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class DESGASTE(SyncScene):
    NAME = "DESGASTE"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o detalhe")
        title = fit(txt("CADA ESCRITA DESGASTA", 36, weight=BOLD,
                        t2c={"DESGASTA": RED}))
        title.next_to(eb, DOWN, buff=0.6)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        ctrl = RoundedRectangle(corner_radius=0.18, width=2.6, height=1.15,
                                stroke_color=ORANGE, stroke_width=3.5)
        icon = SVGMobject("cpu.svg").scale_to_fit_height(0.5).set_color(ORANGE)
        lab = txt("CONTROLADOR", 20, color=WHITE, weight=BOLD)
        cgrp = VGroup(icon, lab).arrange(RIGHT, buff=0.3)
        if cgrp.width > ctrl.width - 0.35:
            cgrp.scale_to_fit_width(ctrl.width - 0.35)
        cgrp.move_to(ctrl.get_center())
        ctrlgrp = VGroup(ctrl, cgrp)
        ctrlgrp.move_to([0, 1.6, 0])
        self.W(0.14)
        self.P(FadeIn(ctrlgrp, scale=0.9), rt=0.6)

        cells = []
        x = -1.25
        for i in range(3):
            c = RoundedRectangle(corner_radius=0.12, width=1.0, height=1.0,
                                 stroke_color=WHITE, stroke_width=3)
            c.move_to([x, -1.0, 0])
            cells.append(c)
            x += 1.25
        cgrp2 = VGroup(*cells)
        self.W(0.30)
        self.P(FadeIn(cgrp2), rt=0.5)

        bars = []
        for i, c in enumerate(cells):
            bar = Rectangle(width=0.72, height=0.12, fill_color=RED,
                            fill_opacity=1.0, stroke_width=0)
            bar.move_to(c.get_center() + DOWN * 0.28)
            bars.append(bar)
            frac = 0.42 + 0.09 * i
            self.W(frac)
            arrow = Arrow(ctrl.get_bottom(), c.get_top() + UP * 0.1,
                          buff=0.15, color=ORANGE, stroke_width=4)
            self.P(Create(arrow), rt=0.35)
            self.P(GrowFromEdge(bars[i], LEFT), rt=0.35)
            self.P(FadeOut(arrow), rt=0.25)

        foot = fit(txt("wear leveling: espalha pra durar.", 24,
                       color=ACCENT, weight=BOLD))
        foot.to_edge(DOWN, buff=0.9)
        self.W(0.80)
        self.P(FadeIn(foot, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class CTA(SyncScene):
    NAME = "CTA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "próximo reel")

        logo = ImageMobject("logo_wtec.png")
        logo.scale_to_fit_height(1.5)
        logo.next_to(eb, DOWN, buff=1.0)
        self.P(FadeIn(eb), rt=0.4)
        self.P(FadeIn(logo, scale=1.3), rt=0.8)

        head = fit(txt("POR QUE O PENDRIVE\nMENTE SOBRE O ESPAÇO?", 34,
                       weight=BOLD, line_spacing=0.9,
                       t2c={"MENTE": RED}))
        head.next_to(logo, DOWN, buff=0.9)
        self.W(0.28)
        self.P(Write(head), rt=1.2)

        btn = RoundedRectangle(corner_radius=0.45, width=3.7, height=0.9,
                               fill_color=ACCENT, fill_opacity=1.0,
                               stroke_width=0)
        blab = txt("SEGUIR @W.TEC_DIGITAL", 22, color=WHITE, weight=BOLD)
        blab.move_to(btn.get_center())
        btngrp = VGroup(btn, blab)
        btngrp.next_to(head, DOWN, buff=1.0)
        self.W(0.62)
        self.P(FadeIn(btngrp, shift=UP * 0.4), rt=0.5)

        n = 0
        while getattr(self, "_e", 0.0) < self._total() - 0.8 and n < 12:
            self.P(btngrp.animate.scale(1.06), rt=0.35,
                   rate_func=there_and_back)
            n += 1
        self.hold_tail()
