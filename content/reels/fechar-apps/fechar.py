"""Reel didático: Por que fechar apps não acelera o Android (1080x1920, 30fps).

Mesmo molde dos reels anteriores (frações de durs.json + zona de segurança
do Reels), com visuais novos: mockup de celular, apps congelando,
chips de custo.
"""
import json
import os

from manim import *

ACCENT = "#0578F5"
GREEN = "#3FB950"
RED = "#FF5555"
ORANGE = "#FFB86C"
ICE = "#58A6FF"
MUTED = "#5B6B80"
INK = "#0B1220"
PILL = "#21262D"
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


def chip(svg, label, color, y, w=3.4, icon_h=0.36, h=0.75):
    box = RoundedRectangle(corner_radius=0.375, width=w, height=h,
                           stroke_color=color, stroke_width=3)
    icon = SVGMobject(svg).scale_to_fit_height(icon_h).set_color(color)
    lab = txt(label, 20, color=WHITE, weight=BOLD)
    content = VGroup(icon, lab).arrange(RIGHT, buff=0.3)
    if content.width > box.width - 0.3:
        content.scale_to_fit_width(box.width - 0.3)
    content.move_to(box.get_center())
    return VGroup(box, content)


def app_card(label, color):
    card = RoundedRectangle(corner_radius=0.08, width=1.26, height=0.46,
                            fill_color=PILL, fill_opacity=1.0,
                            stroke_color=color, stroke_width=2)
    dot = Dot(radius=0.06, color=color)
    dot.move_to(card.get_left() + RIGHT * 0.2)
    lab = txt(label, 13, color=WHITE)
    lab.next_to(dot, RIGHT, buff=0.12)
    if lab.width > card.width - 0.55:
        lab.scale_to_fit_width(card.width - 0.55)
    lab.move_to(card.get_left() + RIGHT * (0.2 + 0.12 + lab.width / 2))
    return VGroup(card, dot, lab)


def phone_mockup(cx, cy):
    body = RoundedRectangle(corner_radius=0.28, width=1.9, height=3.2,
                            stroke_color=WHITE, stroke_width=4)
    body.move_to([cx, cy, 0])
    screen = RoundedRectangle(corner_radius=0.18, width=1.66, height=2.94,
                              fill_color="#10151c", fill_opacity=1.0,
                              stroke_width=0)
    screen.move_to(body.get_center() + DOWN * 0.06)
    notch = RoundedRectangle(corner_radius=0.04, width=0.6, height=0.08,
                             fill_color=WHITE, fill_opacity=0.9,
                             stroke_width=0)
    notch.move_to(body.get_top() + DOWN * 0.16)
    return VGroup(body, screen, notch), screen


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        mob, screen = phone_mockup(0, 0.85)
        mob.next_to(eb, DOWN, buff=0.3)
        self.P(FadeIn(mob, scale=0.9), rt=0.7)

        trash = SVGMobject("trash.svg").scale_to_fit_height(0.55)
        trash.set_color(RED)
        trash.move_to([1.35, mob.get_top()[1] - 0.4, 0])
        self.P(FadeIn(trash, scale=0.5), rt=0.4)

        names = ["WhatsApp", "Instagram", "Jogo"]
        cards = []
        for i, name in enumerate(names):
            c = app_card(name, ACCENT)
            c.move_to(screen.get_center() + UP * (0.75 - 0.75 * i))
            cards.append(c)
        self.P(FadeIn(cards[0]), FadeIn(cards[1]), FadeIn(cards[2]), rt=0.6)

        for i, c in enumerate(cards):
            self.W(0.16 + 0.1 * i)
            self.P(c.animate.move_to(trash.get_center()).scale(0.25)
                   .set_opacity(0.0), rt=0.4)

        self.W(0.55)
        badge = RoundedRectangle(corner_radius=0.12, width=1.3, height=0.5,
                                 fill_color=RED, fill_opacity=1.0,
                                 stroke_width=0)
        blab = txt("MITO?", 20, color=WHITE, weight=BOLD)
        blab.move_to(badge.get_center())
        pill = VGroup(badge, blab)
        title = fit(txt("FECHAR APPS ACELERA O CELULAR?", 26, weight=BOLD))
        title.next_to(mob, DOWN, buff=0.3)
        pill.next_to(title, DOWN, buff=0.2)
        self.P(FadeIn(title), rt=0.6)
        self.P(FadeIn(pill, scale=1.4), rt=0.4)
        self.hold_tail()


class CONGELA(SyncScene):
    NAME = "CONGELA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o que acontece")
        title = fit(txt("O ANDROID CONGELA O APP", 30, weight=BOLD,
                        t2c={"CONGELA": ICE}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        mob, screen = phone_mockup(0, -0.15)
        mob.next_to(title, DOWN, buff=0.25)
        self.P(FadeIn(mob, scale=0.9), rt=0.6)

        names = ["WhatsApp", "Waze", "Jogo"]
        cards = []
        for i, name in enumerate(names):
            c = app_card(name, ACCENT)
            c.move_to(screen.get_center() + UP * (0.75 - 0.75 * i))
            cards.append(c)
        self.P(FadeIn(cards[0]), FadeIn(cards[1]), FadeIn(cards[2]), rt=0.5)

        snow = SVGMobject("snow.svg").scale_to_fit_height(0.22)
        snow.set_color(ICE)
        for i, c in enumerate(cards):
            frac = 0.34 + 0.15 * i
            self.W(frac)
            s = snow.copy().move_to(c.get_right() + LEFT * 0.14)
            self.P(c[0].animate.set_stroke(ICE, width=2.5),
                   FadeIn(s, scale=0.5), rt=0.4)
            self.W(frac + 0.12)
        self.hold_tail()


class CUSTO(SyncScene):
    NAME = "CUSTO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o custo real")
        title = fit(txt("FECHAR CUSTA CARO", 34, weight=BOLD,
                        t2c={"CARO": RED}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        c1 = chip("cpu.svg", "processamento no máximo", RED, 0)
        c1.next_to(title, DOWN, buff=0.45)
        self.W(0.24)
        self.P(FadeIn(c1, shift=RIGHT * 0.6), rt=0.5)

        c2 = chip("battery-half.svg", "bateria gasta", ORANGE, 0)
        c2.next_to(c1, DOWN, buff=0.3)
        self.W(0.44)
        self.P(FadeIn(c2, shift=RIGHT * 0.6), rt=0.5)

        c3 = chip("stopwatch.svg", "espera de novo", ACCENT, 0)
        c3.next_to(c2, DOWN, buff=0.3)
        self.W(0.62)
        self.P(FadeIn(c3, shift=RIGHT * 0.6), rt=0.5)
        self.hold_tail()


class QUANDO(SyncScene):
    NAME = "QUANDO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "as exceções")
        title = fit(txt("QUANDO FECHAR FAZ SENTIDO", 30, weight=BOLD,
                        t2c={"FAZ SENTIDO": GREEN}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        rows = [
            ("music-note-beamed.svg", "tocando música", GREEN),
            ("geo-alt.svg", "GPS ligado", GREEN),
            ("cloud-download.svg", "baixando arquivo", GREEN),
        ]
        prev = title
        for i, (svg, label, color) in enumerate(rows):
            row = chip(svg, label, color, 0, w=3.0, h=0.6)
            row.next_to(prev, DOWN, buff=0.28)
            self.W(0.15 + 0.12 * i)
            self.P(FadeIn(row, shift=RIGHT * 0.5), rt=0.45)
            prev = row

        restart = chip("arrow-clockwise.svg", "travou de vez? REINICIE",
                       ACCENT, 0, w=3.4)
        restart.next_to(prev, DOWN, buff=0.5)
        self.W(0.62)
        self.P(FadeIn(restart, shift=UP * 0.4), rt=0.5)
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

        h1 = fit(txt("O QUE É O CACHE?", 28, weight=BOLD))
        h2 = fit(txt("LIMPAR TODA HORA ATRAPALHA?", 24, weight=BOLD))
        h2[-10:].set_color(RED)
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
