from manim import *

ICONS = {
    "Inicialização\ncheia": "rocket.svg",
    "Disco\nlotado": "hard-drive.svg",
    "Apps em\n2º plano": "app-window.svg",
    "Poeira\ne calor": "thermometer.svg",
}
COLORS = ["#FF5555", "#FFB86C", "#FFD866", "#FF79C6"]

class Viloes(Scene):
    def construct(self):
        self.camera.background_color = "#0d1117"
        title = Text("OS 4 VILÕES\nDA LENTIDÃO", weight=BOLD, font_size=40,
                     line_spacing=0.9, font="DejaVu Sans",
                     t2c={"4": "#0578F5", "LENTIDÃO": "#FF5555"})
        if title.width > 4.2:
            title.scale_to_fit_width(4.2)
        title.to_edge(UP, buff=0.7)
        self.play(Write(title), run_time=1.1)

        rows = VGroup()
        for (txt, svg), color in zip(ICONS.items(), COLORS):
            box = RoundedRectangle(corner_radius=0.18, width=3.4, height=1.05,
                                   stroke_color=color, stroke_width=3.5)
            icon = SVGMobject(svg).scale_to_fit_height(0.5).set_color(color)
            label = Text(txt.replace("\n", " "), font_size=23, color=WHITE,
                         font="DejaVu Sans", weight=BOLD)
            content = VGroup(icon, label).arrange(RIGHT, buff=0.3)
            content.move_to(box.get_center())
            rows.add(VGroup(box, content))
        rows.arrange(DOWN, buff=0.32).next_to(title, DOWN, buff=0.7)

        self.play(
            LaggedStart(*[FadeIn(r, shift=RIGHT * 0.6) for r in rows], lag_ratio=0.3),
            run_time=2.0,
        )
        self.wait(1.8)
