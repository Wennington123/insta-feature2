from manim import *

class CTA(Scene):
    def construct(self):
        self.camera.background_color = "#0d1117"

        logo = ImageMobject("logo_wtec.png").scale_to_fit_height(1.15)
        logo.to_edge(UP, buff=0.55)
        self.play(FadeIn(logo, shift=DOWN * 0.3), run_time=0.55)

        title = Text("Antes de gastar,\nme manda o sintoma", weight=BOLD, font_size=40,
                     line_spacing=0.9, font="DejaVu Sans",
                     t2c={"sintoma": "#0578F5"})
        if title.width > 4.2:
            title.scale_to_fit_width(4.2)
        title.next_to(logo, DOWN, buff=0.55)
        self.play(Write(title), run_time=1.1)

        sub = Text("diagnóstico gratuito — Petrolina e região", font_size=21,
                   color="#8b949e", font="DejaVu Sans",
                   t2c={"gratuito": "#3FB950"})
        if sub.width > 3.9:
            sub.scale_to_fit_width(3.9)
        sub.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(sub, shift=UP * 0.3), run_time=0.6)

        icon = SVGMobject("whatsapp.svg").scale_to_fit_height(0.5).set_color(WHITE)
        btn_txt = Text("Fale comigo", weight=BOLD, font_size=26, font="DejaVu Sans")
        btn_content = VGroup(icon, btn_txt).arrange(RIGHT, buff=0.3)
        btn = RoundedRectangle(corner_radius=0.3, width=3.4, height=1.05,
                               fill_color="#25D366", fill_opacity=1, stroke_width=0)
        btn_content.move_to(btn.get_center())
        button = VGroup(btn, btn_content).shift(DOWN * 1.7)
        self.play(GrowFromCenter(button), run_time=0.7)
        self.play(button.animate.scale(1.08), run_time=0.22)
        self.play(button.animate.scale(1 / 1.08), run_time=0.22)

        handle = Text("@w.tec_digital", font_size=20, color="#8b949e",
                      font="DejaVu Sans")
        handle.to_edge(DOWN, buff=0.55)
        self.play(FadeIn(handle), run_time=0.5)
        self.wait(0.9)
