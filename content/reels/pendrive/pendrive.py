"""Reel didático: Como funciona um pendrive (1080x1920, 30fps).

Cenas sincronizadas com a narração: cada cena recebe a duração do bloco
de áudio em durs.json e espalha as animações por frações desse tempo.

Zona de segurança do Reels (UI do Instagram não cobre o conteúdo):
topo até y=2.65, base a partir de y=-1.8 (legendas em -2.25..-1.8),
laterais |x|<=1.7.
"""
import json
import os

from manim import *

ACCENT = "#0578F5"
GREEN = "#3FB950"
RED = "#FF5555"
ORANGE = "#FFB86C"
MUTED = "#5B6B80"
INK = "#0B1220"
FONT = "DejaVu Sans"

_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    with open(os.path.join(_DIR, "durs.json")) as f:
        DURS = json.load(f)
except FileNotFoundError:
    DURS = {}


def fit(mobj, w=3.4):
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
    m.to_edge(UP, buff=1.35)
    return m


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        icon = SVGMobject("usb.svg").scale_to_fit_height(0.9).set_color(ACCENT)
        icon.next_to(eb, DOWN, buff=0.6)
        self.P(FadeIn(icon, scale=1.4), rt=0.7)

        l1 = fit(txt("COMO FUNCIONA UM", 42, weight=BOLD))
        l2 = fit(txt("PENDRIVE?", 42, weight=BOLD, color=ACCENT))
        title = VGroup(l1, l2).arrange(DOWN, buff=0.12)
        if title.width > 3.4:
            title.scale_to_fit_width(3.4)
        title.next_to(icon, DOWN, buff=0.5)
        self.P(Write(title), rt=1.2)

        sub = fit(txt("3 chips. Zero mágica.", 26, color=MUTED))
        sub.next_to(title, DOWN, buff=0.35)
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

        photo = ImageMobject("pendrive-photo.jpg")
        photo.scale_to_fit_width(2.2)
        photo.next_to(eb, DOWN, buff=0.25)
        frame = SurroundingRectangle(photo, color=MUTED, stroke_width=2,
                                     buff=0.05)
        self.W(0.06)
        self.P(FadeIn(photo), Create(frame), rt=0.8)

        top = frame.get_bottom()[1] - 0.2
        for svg, label, desc, color, frac in self.ROWS:
            box = RoundedRectangle(corner_radius=0.15, width=3.4, height=0.75,
                                   stroke_color=color, stroke_width=3)
            icon = SVGMobject(svg).scale_to_fit_height(0.38).set_color(color)
            lab = txt(label, 22, color=WHITE, weight=BOLD)
            d = txt(desc, 15, color=MUTED)
            content = VGroup(icon, VGroup(lab, d).arrange(DOWN, buff=0.08))
            content.arrange(RIGHT, buff=0.3)
            if content.width > box.width - 0.3:
                content.scale_to_fit_width(box.width - 0.3)
            content.move_to(box.get_center())
            grp = VGroup(box, content)
            grp.move_to([0, top - 0.375, 0])
            self.W(frac - 0.04)
            self.P(FadeIn(grp, shift=RIGHT * 0.6), rt=0.55)
            top -= 0.93
        self.hold_tail()


class FLASH(SyncScene):
    NAME = "FLASH"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a mágica")
        title = fit(txt("A CÉLULA DE FLASH", 34, weight=BOLD,
                        t2c={"FLASH": GREEN}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.8)

        cell = RoundedRectangle(corner_radius=0.3, width=2.5, height=2.0,
                                stroke_color=WHITE, stroke_width=4)
        cell.next_to(title, DOWN, buff=0.4)
        self.W(0.14)
        self.P(Create(cell), rt=0.7)

        bits = txt("1", 64, weight=BOLD, color=GREEN)
        bits.next_to(cell, LEFT, buff=0.2)
        bitz = txt("0", 64, weight=BOLD, color=RED)
        bitz.next_to(cell, LEFT, buff=0.2)

        cx, cy = cell.get_center()[0], cell.get_center()[1]
        offs = [(-0.5, 0.35), (0.1, 0.35), (-0.5, -0.3), (0.1, -0.3)]
        inside = VGroup(*[Dot([cx + ox, cy + oy, 0], radius=0.1,
                              color=GREEN, fill_opacity=1.0)
                          for ox, oy in offs])
        outside = VGroup(*[Dot([1.7 + 0.3 * (i % 2), cy + 0.35 - 0.7 * (i // 2),
                                0], radius=0.1, color=GREEN,
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

        foot = fit(txt("desligou? continuam trancados.", 22, color=GREEN,
                       weight=BOLD))
        foot.next_to(cell, DOWN, buff=0.3)
        self.W(0.74)
        self.P(FadeIn(foot, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class DESGASTE(SyncScene):
    NAME = "DESGASTE"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o detalhe")
        title = fit(txt("CADA ESCRITA DESGASTA", 34, weight=BOLD,
                        t2c={"DESGASTA": RED}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        ctrl = RoundedRectangle(corner_radius=0.15, width=2.6, height=0.9,
                                stroke_color=ORANGE, stroke_width=3.5)
        icon = SVGMobject("cpu.svg").scale_to_fit_height(0.38).set_color(ORANGE)
        lab = txt("CONTROLADOR", 18, color=WHITE, weight=BOLD)
        cgrp = VGroup(icon, lab).arrange(RIGHT, buff=0.3)
        if cgrp.width > ctrl.width - 0.3:
            cgrp.scale_to_fit_width(ctrl.width - 0.3)
        cgrp.move_to(ctrl.get_center())
        ctrlgrp = VGroup(ctrl, cgrp)
        ctrlgrp.next_to(title, DOWN, buff=0.35)
        self.W(0.14)
        self.P(FadeIn(ctrlgrp, scale=0.9), rt=0.6)

        cells = []
        x = -1.25
        for i in range(3):
            c = RoundedRectangle(corner_radius=0.12, width=0.95, height=0.9,
                                 stroke_color=WHITE, stroke_width=3)
            c.move_to([x, ctrl.get_bottom()[1] - 0.4 - 0.45, 0])
            cells.append(c)
            x += 1.25
        cgrp2 = VGroup(*cells)
        self.W(0.30)
        self.P(FadeIn(cgrp2), rt=0.5)

        bars = []
        for i, c in enumerate(cells):
            bar = Rectangle(width=0.6, height=0.1, fill_color=RED,
                            fill_opacity=1.0, stroke_width=0)
            bar.move_to(c.get_center() + DOWN * 0.26)
            bars.append(bar)
            frac = 0.42 + 0.09 * i
            self.W(frac)
            arrow = Arrow(ctrl.get_bottom(), c.get_top() + UP * 0.1,
                          buff=0.12, color=ORANGE, stroke_width=4)
            self.P(Create(arrow), rt=0.35)
            self.P(GrowFromEdge(bars[i], LEFT), rt=0.35)
            self.P(FadeOut(arrow), rt=0.25)

        foot = fit(txt("wear leveling: espalha pra durar.", 22,
                       color=ACCENT, weight=BOLD))
        foot.next_to(cgrp2, DOWN, buff=0.3)
        self.W(0.80)
        self.P(FadeIn(foot, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class CTA(SyncScene):
    NAME = "CTA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "próximo reel")

        # cartão branco (igual à arte original do logo)
        card = RoundedRectangle(corner_radius=0.15, width=2.1, height=1.5,
                                fill_color=WHITE, fill_opacity=1.0,
                                stroke_width=0)
        card.next_to(eb, DOWN, buff=0.35)
        logo = ImageMobject("logo_wtec.png")
        logo.scale_to_fit_height(0.95)
        logo.move_to(card.get_center() + UP * 0.18)
        credit = txt("fontes e créditos na descrição", 11, color=INK)
        if credit.width > card.width - 0.2:
            credit.scale_to_fit_width(card.width - 0.2)
        credit.move_to(card.get_center() + DOWN * 0.52)
        self.P(FadeIn(card), FadeIn(logo), FadeIn(credit), rt=0.8)

        h1 = fit(txt("POR QUE O PENDRIVE", 28, weight=BOLD))
        h2 = fit(txt("MENTE SOBRE O ESPAÇO?", 28, weight=BOLD))
        h2[:5].set_color(RED)
        head = VGroup(h1, h2).arrange(DOWN, buff=0.12)
        if head.width > 3.4:
            head.scale_to_fit_width(3.4)
        head.next_to(card, DOWN, buff=0.3)
        self.W(0.28)
        self.P(Write(head), rt=1.2)

        btn = RoundedRectangle(corner_radius=0.375, width=3.4, height=0.75,
                               fill_color=ACCENT, fill_opacity=1.0,
                               stroke_width=0)
        blab = txt("SEGUIR @W.TEC_DIGITAL", 20, color=WHITE, weight=BOLD)
        if blab.width > btn.width - 0.4:
            blab.scale_to_fit_width(btn.width - 0.4)
        blab.move_to(btn.get_center())
        btngrp = VGroup(btn, blab)
        btngrp.next_to(head, DOWN, buff=0.25)
        self.W(0.62)
        self.P(FadeIn(btngrp, shift=UP * 0.4), rt=0.5)

        n = 0
        while getattr(self, "_e", 0.0) < self._total() - 0.8 and n < 12:
            self.P(btngrp.animate.scale(1.05), rt=0.35,
                   rate_func=there_and_back)
            n += 1
        self.hold_tail()
