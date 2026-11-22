"""Reel didatico: O que acontece quando apaga um arquivo (1080x1920, 30fps).

Mesmo molde dos reels anteriores: cenas sincronizadas por fracao da
duracao de cada bloco de narracao (durs.json) + zona de seguranca do
Reels (topo 250px, base 420px, laterais |x|<=1.7).
Visuais novos: arquivo indo pra lixeira, slots do disco com plaquinha
LIVRE sobre bytes-fantasma, lupa de recuperacao, sobrescrita.
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


def slot(cx, cy):
    box = RoundedRectangle(corner_radius=0.06, width=0.7, height=0.5,
                           fill_color="#161b22", fill_opacity=1.0,
                           stroke_color=MUTED, stroke_width=2)
    box.move_to([cx, cy, 0])
    return box


def file_ic(pos, h=0.3):
    ic = SVGMobject("file-earmark.svg").scale_to_fit_height(h)
    ic.set_color(WHITE)
    if len(pos) == 2:
        pos = [pos[0], pos[1], 0]
    ic.move_to(pos)
    return ic


class HOOK(SyncScene):
    NAME = "HOOK"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "@w.tec_digital")
        self.P(FadeIn(eb, shift=DOWN * 0.3), rt=0.5)

        f = file_ic([-1.3, 0.4], h=0.85)
        self.W(0.10)
        self.P(FadeIn(f, scale=0.9), rt=0.5)

        trash = SVGMobject("trash.svg").scale_to_fit_height(1.0)
        trash.set_color(RED)
        trash.move_to([1.25, 0.4, 0])
        path = Line([-1.0, 0.4, 0], [0.72, 0.4, 0],
                    color=MUTED, stroke_width=3)
        path.set_dash([0.08, 0.08])
        self.W(0.26)
        self.P(FadeIn(trash, scale=0.9), FadeIn(path), rt=0.5)
        self.W(0.38)
        self.P(f.animate.move_to([0.9, 0.4, 0]).scale(0.4), rt=0.55)
        self.P(FadeOut(f), rt=0.25)

        t1 = fit(txt("VOCÊ APAGOU.", 40, weight=BOLD))
        t2 = fit(txt("SUMIU MESMO?", 40, weight=BOLD, t2c={"SUMIU": RED}))
        title = VGroup(t1, t2).arrange(DOWN, buff=0.12)
        if title.width > 3.4:
            title.scale_to_fit_width(3.4)
        title.move_to([0, -1.3, 0])
        self.W(0.62)
        self.P(Write(title), rt=1.0)
        sub = fit(txt("spoiler: não.", 24, color=GREEN))
        sub.next_to(title, DOWN, buff=0.15)
        self.W(0.85)
        self.P(FadeIn(sub, shift=UP * 0.3), rt=0.4)
        self.hold_tail()


class LIXO(SyncScene):
    NAME = "LIXO"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a lixeira")
        title = fit(txt("ESVAZIOU? AINDA ESTÁ LÁ", 32, weight=BOLD,
                        t2c={"AINDA": GREEN}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        trash = SVGMobject("trash.svg").scale_to_fit_height(1.3)
        trash.set_color(RED)
        trash.move_to([-0.95, 0.45, 0])
        fin = file_ic(trash.get_center() + DOWN * 0.1, h=0.42)
        self.W(0.20)
        self.P(FadeIn(trash, scale=0.9), rt=0.5)
        self.W(0.32)
        self.P(FadeIn(fin, scale=0.6), rt=0.4)

        hdd = SVGMobject("hdd.svg").scale_to_fit_height(1.1)
        hdd.set_color(ICE)
        hdd.move_to([1.05, 0.45, 0])
        fin2 = file_ic(hdd.get_center() + DOWN * 0.08, h=0.38)
        arrow = Arrow(trash.get_right() + RIGHT * 0.05,
                      hdd.get_left() + LEFT * 0.05, buff=0.08,
                      color=MUTED, stroke_width=4)
        self.W(0.52)
        self.P(FadeIn(arrow), FadeIn(hdd, scale=0.9), rt=0.5)
        self.W(0.62)
        self.P(FadeIn(fin2, scale=0.6), rt=0.4)

        note = pill("nada foi varrido.", ORANGE, w=3.0, size=18)
        note.next_to(hdd, DOWN, buff=0.55)
        self.W(0.80)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class MARCA(SyncScene):
    NAME = "MARCA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "o truque")
        title = fit(txt("SÓ TROCA A PLAQUINHA", 34, weight=BOLD,
                        t2c={"PLAQUINHA": ORANGE}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        xs = [-1.25, -0.45, 0.35, 1.15]
        ys = [0.5, 0.5, 0.5, 0.5]
        boxes, files = [], []
        for cx, cy in zip(xs, ys):
            boxes.append(slot(cx, cy))
            files.append(file_ic([cx, cy], h=0.3))
        disk = VGroup(*boxes, *files)
        self.W(0.20)
        self.P(FadeIn(disk, shift=UP * 0.3), rt=0.6)

        plate = RoundedRectangle(corner_radius=0.08, width=0.74, height=0.24,
                                 fill_color=GREEN, fill_opacity=1.0,
                                 stroke_width=0)
        plate.move_to([xs[2], ys[2] + 0.42, 0])
        plab = txt("LIVRE", 13, color=INK, weight=BOLD)
        plab.move_to(plate.get_center())
        self.W(0.44)
        self.P(FadeIn(plate, scale=0.7), FadeIn(plab), rt=0.5)
        self.W(0.52)
        self.P(files[2].animate.set_opacity(0.35), rt=0.6)

        note = pill("os bytes continuam lá.", GREEN, w=3.1, size=18)
        note.next_to(VGroup(*boxes), DOWN, buff=0.55)
        self.W(0.74)
        self.P(FadeIn(note, shift=UP * 0.3), rt=0.5)
        self.hold_tail()


class RECUPERA(SyncScene):
    NAME = "RECUPERA"

    def construct(self):
        self.camera.background_color = "#0d1117"
        eb = eyebrow(self, "a prova")
        title = fit(txt("POR ISSO DÁ PRA RECUPERAR", 32, weight=BOLD,
                        t2c={"RECUPERAR": GREEN}))
        title.next_to(eb, DOWN, buff=0.4)
        self.P(FadeIn(eb), rt=0.3)
        self.P(Write(title), rt=0.9)

        xs = [-1.25, -0.45, 0.35, 1.15]
        boxes = VGroup(*[slot(x, 0.45) for x in xs])
        ghosts = VGroup(*[
            file_ic([x, 0.45], h=0.3).set_opacity(0.35 if i != 3 else 1.0)
            for i, x in enumerate(xs)])
        self.W(0.18)
        self.P(FadeIn(boxes), FadeIn(ghosts), rt=0.6)

        mag = SVGMobject("search.svg").scale_to_fit_height(0.42)
        mag.set_color(ICE)
        start_x = xs[0] - 0.35
        mag.move_to([start_x, 1.25, 0])
        beam = Line([start_x, 1.05, 0], [start_x, 0.75, 0],
                    color=ICE, stroke_width=4)
        scan = VGroup(mag, beam)
        self.W(0.36)
        self.P(FadeIn(scan), rt=0.4)
        self.W(0.44)
        self.P(scan.animate.move_to(RIGHT * (xs[3] + 0.35 - start_x)), rt=0.9)
        self.W(0.56)

        note = pill("lê o que não foi reescrito.", GREEN, w=3.3, size=17)
        note.next_to(boxes, DOWN, buff=0.35)
        self.W(0.60)
        self.P(FadeIn(note, shift=UP * 0.3), FadeOut(scan), rt=0.5)

        nf = file_ic([xs[1], 0.45], h=0.34).set_color(PURPLE)
        self.W(0.74)
        self.P(FadeIn(nf, scale=1.4), ghosts[1].animate.set_opacity(0.0),
               rt=0.5)
        note2 = pill("sobrescreveu — agora sim.", RED, w=3.3, size=17)
        note2.next_to(note, DOWN, buff=0.2)
        self.W(0.86)
        self.P(FadeIn(note2, shift=UP * 0.3), rt=0.5)
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

        h1 = fit(txt("POR QUE A FOTO PERDE", 28, weight=BOLD,
                     t2c={"PERDE": RED}))
        h2 = fit(txt("QUALIDADE NO WHATSAPP?", 24, weight=BOLD))
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
