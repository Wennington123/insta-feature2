"""Reel didatico: Como o Bluetooth atravessa paredes (1080x1920, 30fps).

Mesmo molde dos reels anteriores: cenas sincronizadas por fracao da
duracao de cada bloco de narracao (durs.json) + zona de seguranca do
Reels (topo 250px, base 420px, laterais |x|<=1.7).
Visuais novos: onda atravesando parede, tela de pareamento, salto de canais.
"""
import json
import os

from manim import *

ACCENT = "#0578F5"
GREEN = "#3FB950"
RED = "#FF5555"
ORANGE = "#FFB86C"
ICE = "#58A6FF"
PURPLE = "#A371F7"
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


def chip(svg, label, color, w=3.4, h=0.72, icon_h=0.34):
    box = RoundedRectangle(corner_radius=0.36, width=w, height=h,
                           stroke_color=color, stroke_width=3)
    icon = SVGMobject(svg).scale_to_fit_height(icon_h).set_color(color)
    lab = txt(label, 19, color=WHITE, weight=BOLD)
    content = VGroup(icon, lab).arrange(RIGHT, buff=0.28)
    if content.width > box.width - 0.3:
        content.scale_to_fit_width(box.width - 0.3)
    content.move_to(box.get_center())
    return VGroup(box, content)


def radio_waves(cx, cy, n=3, r0=0.28, gap=0.22, color=ICE):
    arcs = VGroup()
    for i in range(n):
        r = r0 + gap * i
        arc = Arc(arc_center=[cx, cy, 0], radius=r,
                  start_angle=-PI / 2 - PI / 5, angle=PI / 2.4,
                  stroke_color=color, stroke_width=4 - i)
        arc.set_opacity(1.0 - 0.22 * i)
        arcs.add(arc)
    return arcs


def dot_row(cy, xs, color, r=0.07, opacities=None):
    g = VGroup()
    for i, x in enumerate(xs):
        o = 1.0 if opacities is None else opacities[i]
        g.add(Dot([x, cy, 0], radius=r, color=color, fill_opacity=o))
    return g


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        phone = RoundedRectangle(corner_radius=0.22, width=1.0, height=1.7,
                                 stroke_color=ACCENT, stroke_width=3.5)
        phone.move_to([-1.4, 0.4, 0])
        hole = Circle(radius=0.09, fill_color=ACCENT, fill_opacity=1.0,
                      stroke_width=0)
        hole.move_to(phone.get_bottom() + UP * 0.2)
        mob_p = VGroup(phone, hole)
        head = SVGMobject("headphones.svg").scale_to_fit_height(1.1)
        head.set_color(GREEN)
        head.move_to([1.4, 0.4, 0])
        self.W(0.06)
        self.P(FadeIn(mob_p, scale=0.9), FadeIn(head, scale=0.9), rt=0.6)

        wall = Rectangle(width=0.34, height=2.2, fill_color="#2b2f36",
                         fill_opacity=1.0, stroke_color=MUTED, stroke_width=2)
        wall.move_to([0, 0.1, 0])
        wlab = txt("PAREDE", 13, color=MUTED)
        wlab.move_to(wall.get_top() + DOWN * 0.25)
        self.W(0.14)
        self.P(FadeIn(wall), FadeIn(wlab), rt=0.5)

        wave = radio_waves(-1.4, 0.4, n=3, r0=0.24, gap=0.2)
        self.add(wave)
        self.W(0.24)
        for i in range(4):
            w = radio_waves(-1.4, 0.4, n=3, r0=0.24 + 0.16 * i,
                            gap=0.2, color=ICE)
            self.P(ReplacementTransform(wave, w), rt=0.45)
            wave = w
            self.W(0.32 + 0.12 * i)
        self.remove(wave)

        t1 = fit(txt("COMO O BLUETOOTH", 40, weight=BOLD))
        t2 = fit(txt("ATRAVESSA PAREDES?", 40, weight=BOLD, color=ICE))
        title = VGroup(t1, t2).arrange(DOWN, buff=0.12)
        if title.width > 3.4:
            title.scale_to_fit_width(3.4)
        title.move_to([0, -1.3, 0])
        self.W(0.62)
        self.P(Write(title), rt=1.0)
        sub = fit(txt("sem fio nenhum.", 24, color=MUTED))
        sub.next_to(title, DOWN, buff=0.15)
        self.W(0.85)
        self.P(FadeIn(sub, shift=UP * 0.3), rt=0.4)
        self.hold_tail()


class ONDA(SyncScene):
    NAME = "ONDA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o truque")
        title = fit(txt("É LUZ INVISÍVEL", 40, weight=BOLD,
                        t2c={"INVISÍVEL": ICE}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.8)

        freq = RoundedRectangle(corner_radius=0.2, width=2.3, height=0.62,
                                fill_color="#12261a", fill_opacity=1.0,
                                stroke_color=GREEN, stroke_width=3)
        flab = txt("2,4 GHz", 24, color=GREEN, weight=BOLD)
        flab.move_to(freq.get_center())
        fg = VGroup(freq, flab)
        fg.next_to(title, DOWN, buff=0.3)
        self.W(0.16)
        self.P(FadeIn(fg, scale=0.9), rt=0.5)

        mats = [("PLÁSTICO", GREEN), ("MADEIRA", GREEN), ("TECIDO", GREEN)]
        y = 0.15
        items = []
        for name, col in mats:
            bar = RoundedRectangle(corner_radius=0.1, width=2.6, height=0.5,
                                   fill_color="#1c2230", fill_opacity=1.0,
                                   stroke_color=col, stroke_width=3)
            lab = txt(name, 18, color=WHITE)
            ok = SVGMobject("lock.svg").scale_to_fit_height(0.26).set_color(col)
            content = VGroup(lab, ok).arrange(RIGHT, buff=0.25)
            content.move_to(bar.get_center())
            row = VGroup(bar, content)
            row.move_to([0, y, 0])
            items.append(row)
            y -= 0.55
        self.W(0.36)
        self.P(*[FadeIn(r, shift=RIGHT * 0.5) for r in items], rt=0.7)

        bad = RoundedRectangle(corner_radius=0.1, width=2.6, height=0.5,
                               fill_color="#2a1d20", fill_opacity=1.0,
                               stroke_color=RED, stroke_width=3)
        blab = txt("CONCRETO GROSSO / METAL", 16, color=RED)
        blab.move_to(bad.get_center())
        badrow = VGroup(bad, blab)
        badrow.move_to([0, y, 0])
        self.W(0.66)
        self.P(FadeIn(badrow, shift=RIGHT * 0.5), rt=0.5)
        self.hold_tail()


class PAREAMENTO(SyncScene):
    NAME = "PAREAMENTO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "primeiro contato")
        title = fit(txt("PRIMEIRO, ELES SE CONHECEM", 32, weight=BOLD,
                        t2c={"CONHECEM": ACCENT}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        radar = Circle(radius=0.5, stroke_color=ACCENT, stroke_width=3)
        radar.move_to([-1.3, 0.5, 0])
        dot = Dot(radius=0.09, color=ACCENT)
        dot.move_to(radar.get_center())
        scan = Line(radar.get_center(),
                    radar.get_center() + RIGHT * 0.5,
                    color=ACCENT, stroke_width=3)
        scan_group = VGroup(radar, dot, scan)
        self.W(0.12)
        self.P(FadeIn(scan_group), rt=0.4)
        for _ in range(4):
            self.P(Rotating(scan, about_point=radar.get_center(),
                            angle=PI / 2, run_time=0.22), rt=0.22)
        self.W(0.24)

        names = ["Galaxy Fit", "Fone W-Tec ✓", "Carro"]
        cards = []
        yy = 0.35
        for i, n in enumerate(names):
            c = RoundedRectangle(corner_radius=0.1, width=2.2, height=0.42,
                                 fill_color="#1c2230", fill_opacity=1.0,
                                 stroke_color=MUTED, stroke_width=2)
            cl = txt(n, 16, color=WHITE)
            cl.move_to(c.get_center())
            if i == 1:
                c.set_stroke(GREEN, width=3)
                cl.set_color(GREEN)
            card = VGroup(c, cl)
            card.move_to([0.75, yy, 0])
            cards.append(card)
            yy -= 0.56
        self.P(FadeIn(cards[0]), FadeIn(cards[1]), FadeIn(cards[2]), rt=0.7)

        keyico = SVGMobject("key.svg").scale_to_fit_height(0.4)
        keyico.set_color(PURPLE)
        keyico.move_to([0.75, yy + 0.15, 0])
        line1 = Arrow(radar.get_right() + RIGHT * 0.1,
                      cards[1][0].get_left() + LEFT * 0.1, buff=0.08,
                      color=PURPLE, stroke_width=4)
        self.W(0.42)
        self.P(Create(line1), FadeIn(keyico), rt=0.5)

        pad = SVGMobject("lock.svg").scale_to_fit_height(0.55)
        pad.set_color(GREEN)
        pad.move_to([0.75, yy + 0.75, 0])
        code = txt("código secreto trocado", 17, color=MUTED)
        code.next_to(pad, DOWN, buff=0.2)
        self.W(0.62)
        self.P(FadeOut(keyico), FadeIn(pad), rt=0.5)

        pill = RoundedRectangle(corner_radius=0.36, width=3.2, height=0.68,
                                fill_color="#12261a", fill_opacity=1.0,
                                stroke_color=GREEN, stroke_width=3)
        plab = txt("emparelhado — ninguém escuta", 19, color=GREEN,
                   weight=BOLD)
        if plab.width > pill.width - 0.35:
            plab.scale_to_fit_width(pill.width - 0.35)
        plab.move_to(pill.get_center())
        pg = VGroup(pill, plab)
        pg.next_to(code, DOWN, buff=0.25)
        self.W(0.76)
        self.P(FadeIn(pg, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class SALTO(SyncScene):
    NAME = "SALTO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a defesa")
        title = fit(txt("SALTA CANAIS PARA ESCAPAR", 32, weight=BOLD,
                        t2c={"ESCAPAR": ORANGE}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        lanes = VGroup()
        ys = [0.95, 0.05, -0.85]
        occupied = [False, True, False]
        lane_objs = []
        for i, (y, occ) in enumerate(zip(ys, occupied)):
            lane = RoundedRectangle(corner_radius=0.12, width=3.3, height=0.6,
                                    fill_color="#161b22", fill_opacity=1.0,
                                    stroke_color=MUTED, stroke_width=2)
            lane.move_to([0, y, 0])
            lab = txt(f"CANAL {i + 1}", 14, color=MUTED)
            lab.move_to(lane.get_left() + RIGHT * 0.7)
            if occ:
                occ_bar = RoundedRectangle(corner_radius=0.08, width=1.1,
                                           height=0.28, fill_color=RED,
                                           fill_opacity=0.85, stroke_width=0)
                occ_bar.move_to(lane.get_center() + RIGHT * 0.5)
                ol = txt("ocupado", 12, color=WHITE)
                ol.move_to(occ_bar.get_center())
                lane_objs.append(VGroup(lane, lab, occ_bar, ol))
            else:
                lane_objs.append(VGroup(lane, lab))
            lanes.add(lane_objs[-1])
        self.W(0.22)
        self.P(FadeIn(lanes), rt=0.6)

        blip = Circle(radius=0.13, fill_color=ICE, fill_opacity=1.0,
                      stroke_width=0)
        start_pos = lane_objs[0][0].get_left() + RIGHT * 0.3 + UP * 0.0
        blip.move_to(start_pos)
        mid_pos = lane_objs[1][0].get_left() + RIGHT * 0.3
        end_pos = lane_objs[2][0].get_left() + RIGHT * 0.3
        self.W(0.34)
        self.P(FadeIn(blip), rt=0.3)
        hops = [mid_pos, end_pos, mid_pos, end_pos, mid_pos, end_pos]
        for j, pos in enumerate(hops):
            self.W(0.40 + 0.07 * j)
            self.P(blip.animate.move_to(pos), rt=0.18)

        note = txt("milhares de vezes por segundo", 17, color=ORANGE)
        note.next_to(lanes, DOWN, buff=0.3)
        self.W(0.70)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.4)
        self.hold_tail()


class CTA(SyncScene):
    NAME = "CTA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "próximo reel")

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

        h1 = fit(txt("POR QUE O WI-FI CAI", 28, weight=BOLD))
        h2 = fit(txt("QUANDO LIGAM O MICRO-ONDAS?", 24, weight=BOLD))
        h2[12:].set_color(RED)
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
