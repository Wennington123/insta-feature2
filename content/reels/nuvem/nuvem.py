"""Reel didatico: O que e a nuvem (1080x1920, 30fps).

Mesmo molde dos reels anteriores: cenas sincronizadas por fracao da
duracao de cada bloco de narracao (durs.json) + zona de seguranca do
Reels (topo 250px, base 420px, laterais |x|<=1.7).
Visuais novos: arquivo viajando ate servidor, rack com LED, copias
em predios, aviso de dependencia.
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


def pill(text, color, w=3.2, h=0.68, size=19):
    box = RoundedRectangle(corner_radius=0.36, width=w, height=h,
                           fill_color="#12261a", fill_opacity=1.0,
                           stroke_color=color, stroke_width=3)
    lab = txt(text, size, color=color, weight=BOLD)
    if lab.width > box.width - 0.35:
        lab.scale_to_fit_width(box.width - 0.35)
    lab.move_to(box.get_center())
    return VGroup(box, lab)


def icon_row(svg, text, color, y, w=2.9, h=0.56, lab_size=17):
    bar = RoundedRectangle(corner_radius=0.1, width=w, height=h,
                           fill_color="#1c2230", fill_opacity=1.0,
                           stroke_color=color, stroke_width=3)
    icon = SVGMobject(svg).scale_to_fit_height(0.26).set_color(color)
    lab = txt(text, lab_size, color=WHITE)
    content = VGroup(icon, lab).arrange(RIGHT, buff=0.22)
    if content.width > bar.width - 0.3:
        content.scale_to_fit_width(bar.width - 0.3)
    content.move_to(bar.get_center())
    row = VGroup(bar, content)
    row.move_to([0, y, 0])
    return row


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        phone = RoundedRectangle(corner_radius=0.22, width=1.0, height=1.7,
                                 stroke_color=ACCENT, stroke_width=3.5)
        phone.move_to([-1.4, 0.3, 0])
        hole = Circle(radius=0.09, fill_color=ACCENT, fill_opacity=1.0,
                      stroke_width=0)
        hole.move_to(phone.get_bottom() + UP * 0.2)
        mob_p = VGroup(phone, hole)
        file = SVGMobject("file-earmark.svg").scale_to_fit_height(0.5)
        file.set_color(WHITE)
        file.move_to(phone.get_center())
        self.W(0.10)
        self.P(FadeIn(mob_p, scale=0.9), FadeIn(file, scale=0.9), rt=0.6)

        cloud = SVGMobject("cloud.svg").scale_to_fit_height(0.85)
        cloud.set_color(ACCENT)
        cloud.move_to([1.1, 0.75, 0])
        q = txt("?", 34, weight=BOLD, color=RED)
        q.move_to(cloud.get_center() + DOWN * 0.02)
        path = Line(phone.get_top() + UP * 0.15,
                    cloud.get_left() + LEFT * 0.1 + DOWN * 0.1,
                    color=MUTED, stroke_width=3)
        path.set_dash([0.08, 0.08])
        self.W(0.28)
        self.P(FadeIn(path), rt=0.4)
        for i in range(3):
            self.P(file.animate.move_to(
                path.point_from_proportion(0.25 + 0.375 * i)), rt=0.28)
        self.W(0.44)
        self.P(FadeIn(cloud, scale=0.85), FadeIn(q, scale=0.85), rt=0.5)

        t1 = fit(txt("SUA FOTO ESTÁ", 40, weight=BOLD))
        t2 = fit(txt("'NA NUVEM'... ONDE?", 40, weight=BOLD,
                     t2c={"NUVEM": ACCENT}))
        title = VGroup(t1, t2).arrange(DOWN, buff=0.12)
        if title.width > 3.4:
            title.scale_to_fit_width(3.4)
        title.move_to([0, -1.3, 0])
        self.W(0.62)
        self.P(Write(title), rt=1.0)
        sub = fit(txt("sem mágica.", 24, color=MUTED))
        sub.next_to(title, DOWN, buff=0.15)
        self.W(0.85)
        self.P(FadeIn(sub, shift=UP * 0.3), rt=0.4)
        self.hold_tail()


class DISCO(SyncScene):
    NAME = "DISCO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a verdade")
        title = fit(txt("É O DISCO DE OUTRA PESSOA", 34, weight=BOLD,
                        t2c={"OUTRA PESSOA": ORANGE}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        up = chip("cloud-arrow-up.svg", "SUA FOTO", ICE, w=2.2, h=0.62)
        up.move_to([0, 1.05, 0])
        self.W(0.26)
        self.P(FadeIn(up, shift=UP * 0.3), rt=0.5)

        units = VGroup()
        for r in range(4):
            for c in range(3):
                u = RoundedRectangle(corner_radius=0.06, width=0.66,
                                     height=0.4, fill_color="#161b22",
                                     fill_opacity=1.0, stroke_color=MUTED,
                                     stroke_width=2)
                led = Dot(radius=0.035, color=GREEN, fill_opacity=0.5,
                          stroke_width=0)
                led.move_to(u.get_right() + LEFT * 0.1)
                units.add(VGroup(u, led))
        rack = VGroup(*units).arrange_in_grid(rows=4, cols=3, buff=0.14)
        rack.move_to([0, -0.45, 0])
        unit_pos = [u[0].get_center() for u in units]
        self.W(0.44)
        self.P(FadeIn(rack, scale=0.92), rt=0.6)

        target = unit_pos[9]
        dest = RoundedRectangle(corner_radius=0.06, width=0.66, height=0.4,
                                fill_color=GREEN, fill_opacity=0.9,
                                stroke_color=GREEN, stroke_width=2)
        dest.move_to(target)
        self.W(0.56)
        self.P(ReplacementTransform(
            up.copy().scale(0.35).set_fill(opacity=1), dest), rt=0.5)
        for _ in range(4):
            self.P(dest.animate.set_fill(opacity=0.4), rt=0.16,
                   rate_func=there_and_back)
        self.W(0.78)

        note = pill("HD de outra pessoa.", ORANGE, w=3.0, size=18)
        note.next_to(rack, DOWN, buff=0.35)
        self.W(0.86)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class COPIA(SyncScene):
    NAME = "COPIA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o segredo")
        title = fit(txt("EXISTEM CÓPIAS ESPALHADAS", 34, weight=BOLD,
                        t2c={"CÓPIAS": GREEN}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        cards = []
        xs = [-1.15, 0.0, 1.15]
        names = ["A", "B", "C"]
        for x, n in zip(xs, names):
            card = RoundedRectangle(corner_radius=0.12, width=1.0, height=1.2,
                                    fill_color="#161b22", fill_opacity=1.0,
                                    stroke_color=MUTED, stroke_width=2.5)
            bld = SVGMobject("building.svg").scale_to_fit_height(0.5)
            bld.set_color(ICE)
            lab = txt(f"PRÉDIO {n}", 12, color=WHITE, weight=BOLD)
            body = VGroup(bld, lab).arrange(DOWN, buff=0.16)
            body.move_to(card.get_center())
            grp = VGroup(card, body)
            grp.move_to([x, 0.55, 0])
            cards.append(grp)
        self.W(0.20)
        self.P(*[FadeIn(c, shift=UP * 0.3) for c in cards], rt=0.7)

        xc = SVGMobject("x-circle.svg").scale_to_fit_height(0.6)
        xc.set_color(RED)
        xc.move_to(cards[0][0].get_center())
        flab = txt("disco queimou", 13, color=RED, weight=BOLD)
        flab.next_to(cards[0][0], DOWN, buff=0.18)
        self.W(0.48)
        self.P(FadeIn(xc, scale=1.4), FadeIn(flab), rt=0.5)

        cop1 = SVGMobject("copy.svg").scale_to_fit_height(0.36)
        cop1.set_color(GREEN)
        cop2 = SVGMobject("copy.svg").scale_to_fit_height(0.36)
        cop2.set_color(GREEN)
        cop1.next_to(cards[1][0].get_corner(UR), DR, buff=0.02)
        cop2.next_to(cards[2][0].get_corner(UR), DR, buff=0.02)
        ok = txt("assumiu", 13, color=GREEN, weight=BOLD)
        ok.next_to(cards[2][0], DOWN, buff=0.18)
        self.W(0.62)
        self.P(cards[1][0].animate.set_stroke(GREEN, width=3.5),
               cards[2][0].animate.set_stroke(GREEN, width=3.5),
               FadeIn(cop1), FadeIn(cop2), FadeIn(ok), rt=0.6)

        note = pill("nada some.", GREEN, w=2.6, size=20)
        note.next_to(VGroup(*[c[0] for c in cards]), DOWN, buff=0.85)
        self.W(0.80)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class CUIDADO(SyncScene):
    NAME = "CUIDADO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o outro lado")
        title = fit(txt("É CONFIANÇA, NÃO MÁGICA", 34, weight=BOLD,
                        t2c={"CONFIANÇA": ACCENT, "NÃO MÁGICA": RED}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        r1 = icon_row("wifi-off.svg", "sem internet, sem acesso", RED, 0.85)
        self.W(0.24)
        self.P(FadeIn(r1, shift=RIGHT * 0.5), rt=0.55)

        r2 = icon_row("shield-exclamation.svg",
                      "conta invadida, arquivos invadidos", RED, 0.10)
        self.W(0.44)
        self.P(FadeIn(r2, shift=RIGHT * 0.5), rt=0.55)

        r3 = icon_row("hdd.svg", "disco alheio: termo de uso decide",
                      ORANGE, -0.65, lab_size=15)
        self.W(0.58)
        self.P(FadeIn(r3, shift=RIGHT * 0.5), rt=0.55)

        note = pill("prático — mas é confiança.", GREEN, w=3.2, size=19)
        note.next_to(r3, DOWN, buff=0.4)
        self.W(0.78)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.5)
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

        h1 = fit(txt("POR QUE A INTERNET CAI", 28, weight=BOLD,
                     t2c={"CAI": RED}))
        h2 = fit(txt("QUANDO CHOVE?", 28, weight=BOLD))
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
