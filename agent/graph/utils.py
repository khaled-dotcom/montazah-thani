import io
import os
import random
import re
import secrets
from datetime import datetime, timezone

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from models.models import RequestCounter, db


# ── من إحنا ───────────────────────────────────────────────────────────────────
# الخدمة دي متعدّدة الأحياء، فالافتراضي عام: "أحياء محافظة الإسكندرية".
# لكن أغلب النشرات بتشغّل نسخة بتخدم حي واحد، وساعتها المواطن المفروض
# يشوف اسم حيّه هو من أول جملة — مش اسم المحافظة كلها. ORG_NAME موجود
# أصلًا وبيتقري في الداشبورد وإيميلات الإشعارات؛ الردود بس هي اللي كانت
# فايتاه، فكانت بتقدّم نفسها باسم غلط.
#
# نفس الافتراضيات القديمة، فنشرة متعدّدة الأحياء ما بيتغيّرش عندها حاجة.

def org_name() -> str:
    """اسم الجهة بالعربي زي ما المواطن المفروض يشوفه."""
    return os.environ.get("ORG_NAME") or "أحياء محافظة الإسكندرية"


def org_name_en() -> str:
    """نفسها بالإنجليزي، للردود اللي بتطلع بلغة رسالة المواطن."""
    return os.environ.get("ORG_NAME_EN") or "the Alexandria districts service"


# ── text helpers ──────────────────────────────────────────────────────────────

def strip_tags(text: str) -> str:
    """Remove all XML-style tags injected by LLM prompts from a reply string."""
    text = re.sub(r"<SUMMARY>.*?</SUMMARY>", "", text, flags=re.DOTALL)
    text = re.sub(r"<INTENT>.*?</INTENT>", "", text, flags=re.DOTALL)
    text = re.sub(r"<LAST_BOT_MESSAGE>.*?</LAST_BOT_MESSAGE>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def detect_language_fallback(user_message: str, arabic: str, default: str) -> str:
    """
    Return `arabic` if the user message contains Arabic characters,
    otherwise return `default`.
    Used for error/fallback messages in nodes that must match user language.
    """
    if any("؀" <= c <= "ۿ" for c in (user_message or "")):
        return arabic
    return default


# ── reference numbers ─────────────────────────────────────────────────────────

# أبجدية بدون الحروف والأرقام المتشابهة (0/O، 1/I) عشان المواطن يقدر
# يقرا الرقم من الشاشة ويكتبه تاني من غير لبس
_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

COMPLAINT_PREFIX = "C"
APPOINTMENT_PREFIX = "A"


def generate_reference(prefix: str, length: int = 7) -> str:
    """Generates a human-readable reference such as C7K4M2X."""
    body = "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(length))
    return f"{prefix}{body}"


def count_request():
    """Decrement the global request counter."""
    try:
        counter = RequestCounter.query.first()
        if counter:
            counter.decrement()
    except Exception as e:
        print(f"[count_request] Error decrementing counter: {e}")


# ── Arabic rendering ──────────────────────────────────────────────────────────

# ── اختيار خط البطاقة ─────────────────────────────────────────────────────────
#
# البطاقة بتتكتب بـPillow، وPillow هنا مبنيش بـraqm — يعني ما بيعرفش يشكّل
# العربي بنفسه. عشان كده بنستخدم arabic_reshaper اللي بيحوّل الحروف لـ
# "صيغ العرض" (Arabic Presentation Forms-B).
#
# والفخ إن أغلب الخطوط العربية الحديثة مش شايلة الصيغ دي — بتعتمد على تشكيل
# OpenType. فلو استخدمنا واحد منهم، كل حرف عربي بيطلع مربع فاضي (.notdef)،
# والمواطن بياخد بطاقة مليانة مربعات.
#
# فبندوّر على خط شايل الصيغ دي فعلاً، وبنتأكد بالاختبار مش بالاسم.

_FONT_CANDIDATES = [
    # منصّب مع الحاوية — شايل صيغ العرض ومرخّص بحرية
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    # ويندوز، للتشغيل المحلي
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
]

# ألف بصيغة العرض — لو الخط مش شايلها، العربي هيطلع مربعات
_PRESENTATION_PROBE = "\ufe8d"

_font_path_cache = None


def _resolve_font_path() -> str | None:
    """
    Returns the first font that can actually draw reshaped Arabic.

    Checked by rendering a presentation-form glyph and comparing it to the
    .notdef box, because a font's name says nothing about its coverage — the
    file this project shipped with was called Cairo.ttf and turned out to be
    a Latin-only face.
    """
    global _font_path_cache

    if _font_path_cache is not None:
        return _font_path_cache or None

    override = os.environ.get("TICKET_FONT_PATH")
    candidates = ([override] if override else []) + _FONT_CANDIDATES

    for path in candidates:
        if not path or not os.path.exists(path):
            continue
        try:
            probe = ImageFont.truetype(path, 40)
            glyph = probe.getmask(_PRESENTATION_PROBE).size
            notdef = probe.getmask("\uffff").size

            if glyph != notdef and glyph[0] > 3:
                _font_path_cache = path
                print(f"[ticket] Arabic font: {path}", flush=True)
                return path
        except Exception:
            continue

    _font_path_cache = ""
    print(
        "[ticket] WARNING: no font with Arabic presentation forms found — "
        "ticket text will render as boxes. Set TICKET_FONT_PATH.",
        flush=True,
    )
    return None


def _ar(text: str) -> str:
    if not text:
        return text
    try:
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def _is_ar(text: str) -> bool:
    return any("؀" <= c <= "ۿ" for c in (text or ""))


def _prep_text(text: str) -> str:
    return _ar(text) if _is_ar(text or "") else (text or "—")


# ── ticket palette / layout ───────────────────────────────────────────────────

PRIMARY       = (13, 110, 84)      # أخضر إداري
PRIMARY_DARK  = (8, 79, 60)
HERO_TEXT     = (190, 227, 214)
PAGE_BG       = (241, 245, 249)
WHITE_COLOR   = (255, 255, 255)
TEXT_PRIMARY  = (15, 23, 42)
TEXT_MUTED    = (100, 116, 139)
LINE_COLOR    = (226, 232, 240)
CONFIRM_GREEN = (16, 185, 129)

OUTER_W     = 900
CARD_MARGIN = 34
CARD_W      = OUTER_W - 2 * CARD_MARGIN
CARD_LEFT   = CARD_MARGIN
CARD_RIGHT  = OUTER_W - CARD_MARGIN
RADIUS      = 26
PAD         = 40

HEADER_H    = 128
STAMP_R     = 30
STUB_H      = 96
FIELD_GAP_Y = 30
COL_GAP     = 40

_LOGO_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "static", "images", "logo.png"
)


def _ticket_font(size: int) -> ImageFont.FreeTypeFont:
    path = _resolve_font_path()

    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass

    return ImageFont.load_default()


def _tw_calc(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def _text_right(draw, text, font, right_x, y, fill):
    w = _tw_calc(draw, text, font)
    draw.text((right_x - w, y), text, font=font, fill=fill)
    return w


def _text_left(draw, text, font, left_x, y, fill):
    draw.text((left_x, y), text, font=font, fill=fill)
    return _tw_calc(draw, text, font)


def _wrap_text(draw, text, font, max_w):
    words = (text or "").split(" ")
    lines, cur = [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if _tw_calc(draw, trial, font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _rounded_mask_img(size, radius, corners=(True, True, True, True)):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255, corners=corners
    )
    return mask


def _draw_dashed(draw, x1, x2, y, color, dash=10, gap=8, width=2):
    x = x1
    while x < x2:
        draw.line([x, y, min(x + dash, x2), y], fill=color, width=width)
        x += dash + gap


def _draw_ticket_stamp(draw, cx, cy):
    r = STAMP_R
    draw.ellipse([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], fill=WHITE_COLOR)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CONFIRM_GREEN)
    draw.line([cx - 13, cy + 1, cx - 4, cy + 12], fill=WHITE_COLOR, width=5)
    draw.line([cx - 4, cy + 12, cx + 15, cy - 10], fill=WHITE_COLOR, width=5)


def _ticket_field_block(draw, label, value_lines, x_right, y, label_font, value_font):
    _text_right(draw, label, label_font, x_right, y, TEXT_MUTED)
    ly = y + label_font.size + 8
    for line in value_lines:
        _text_right(draw, line, value_font, x_right, ly, TEXT_PRIMARY)
        ly += value_font.size + 8
    return ly


def generate_appointment_ticket(
    name: str,
    phone: str,
    date: str,
    details: str,
    reference_id: str,
    district: str | None = None,
) -> bytes:
    """
    Renders the appointment confirmation as a PNG ticket the citizen can save
    on their phone and show at the district office.
    """
    header_title = _ar(district or "أحياء محافظة الإسكندرية")

    label_font   = _ticket_font(15)
    value_font   = _ticket_font(22)
    details_font = _ticket_font(20)
    name_font    = _ticket_font(25)
    caption_font = _ticket_font(13)
    ref_font     = _ticket_font(15)
    footer_font  = _ticket_font(13)

    dummy = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    col_w = (CARD_W - 2 * PAD - COL_GAP) // 2

    name_lines    = _wrap_text(dummy, _prep_text(name), value_font, col_w)
    date_lines    = _wrap_text(dummy, _prep_text(date), value_font, col_w)
    phone_lines   = _wrap_text(dummy, _prep_text(phone), value_font, col_w)
    ref_lines     = [reference_id]
    details_lines = _wrap_text(dummy, _prep_text(details), details_font, CARD_W - 2 * PAD)

    district_lines = (
        _wrap_text(dummy, _prep_text(district), value_font, col_w) if district else []
    )

    row1_h = max(len(name_lines), len(date_lines)) * (value_font.size + 8) + label_font.size + 8
    row2_h = max(len(phone_lines), len(ref_lines)) * (value_font.size + 8) + label_font.size + 8
    details_h = label_font.size + 8 + len(details_lines) * (details_font.size + 8)
    district_h = (
        label_font.size + 8 + len(district_lines) * (value_font.size + 8) + FIELD_GAP_Y
        if district_lines
        else 0
    )

    body_h = PAD + row1_h + FIELD_GAP_Y + row2_h + FIELD_GAP_Y + details_h + district_h + PAD
    total_h = int(CARD_MARGIN + HEADER_H + STAMP_R + 6 + body_h + STUB_H + CARD_MARGIN)

    img = Image.new("RGBA", (OUTER_W, total_h), PAGE_BG + (255,))
    card_h = total_h - 2 * CARD_MARGIN

    shadow = Image.new("RGBA", (OUTER_W, total_h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [CARD_LEFT, CARD_MARGIN + 10, CARD_RIGHT, CARD_MARGIN + card_h + 10],
        radius=RADIUS,
        fill=(15, 23, 42, 70),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, shadow)

    card_mask = _rounded_mask_img((CARD_W, card_h), RADIUS)
    card_layer = Image.new("RGBA", (CARD_W, card_h), WHITE_COLOR + (255,))
    img.paste(card_layer, (CARD_LEFT, CARD_MARGIN), card_mask)

    draw = ImageDraw.Draw(img)
    y0 = CARD_MARGIN

    header_layer = Image.new("RGB", (CARD_W, HEADER_H), PRIMARY)
    hd = ImageDraw.Draw(header_layer)
    for x in range(CARD_W):
        t = x / max(CARD_W - 1, 1)
        r = int(PRIMARY[0] + (PRIMARY_DARK[0] - PRIMARY[0]) * t)
        g = int(PRIMARY[1] + (PRIMARY_DARK[1] - PRIMARY[1]) * t)
        b = int(PRIMARY[2] + (PRIMARY_DARK[2] - PRIMARY[2]) * t)
        hd.line([(x, 0), (x, HEADER_H)], fill=(r, g, b))
    header_mask = _rounded_mask_img((CARD_W, HEADER_H), RADIUS, corners=(True, True, False, False))
    img.paste(header_layer, (CARD_LEFT, y0), header_mask)

    logo_size = 62
    halo_r = logo_size // 2 + 8
    logo_cx = CARD_RIGHT - PAD - halo_r
    logo_cy = y0 + HEADER_H // 2
    draw.ellipse(
        [logo_cx - halo_r, logo_cy - halo_r, logo_cx + halo_r, logo_cy + halo_r],
        fill=WHITE_COLOR,
    )
    try:
        logo = Image.open(_LOGO_PATH).convert("RGBA")
        logo.thumbnail((logo_size, logo_size), Image.LANCZOS)
        img.paste(logo, (logo_cx - logo.width // 2, logo_cy - logo.height // 2), logo)
    except Exception:
        draw.ellipse(
            [
                logo_cx - logo_size // 2,
                logo_cy - logo_size // 2,
                logo_cx + logo_size // 2,
                logo_cy + logo_size // 2,
            ],
            fill=PRIMARY_DARK,
        )

    title_x_right = logo_cx - halo_r - 18
    _text_right(draw, header_title, name_font, title_x_right, y0 + 34, WHITE_COLOR)
    _text_right(draw, "APPOINTMENT CONFIRMATION", caption_font, title_x_right, y0 + 68, HERO_TEXT)

    _draw_ticket_stamp(draw, CARD_LEFT + PAD + STAMP_R, y0 + HEADER_H)

    right_col_x = CARD_RIGHT - PAD
    left_col_x = right_col_x - col_w - COL_GAP

    row_y = y0 + HEADER_H + STAMP_R + 6 + PAD - STAMP_R
    _ticket_field_block(draw, _ar("اسم المواطن"), name_lines, right_col_x, row_y, label_font, value_font)
    _ticket_field_block(draw, _ar("تاريخ الموعد"), date_lines, left_col_x, row_y, label_font, value_font)

    row_y = row_y + row1_h + FIELD_GAP_Y
    _ticket_field_block(draw, _ar("رقم التواصل"), phone_lines, right_col_x, row_y, label_font, value_font)
    _ticket_field_block(draw, _ar("رقم الموعد"), ref_lines, left_col_x, row_y, label_font, value_font)

    row_y = row_y + row2_h + FIELD_GAP_Y
    draw.line([CARD_LEFT + PAD, row_y - 12, CARD_RIGHT - PAD, row_y - 12], fill=LINE_COLOR, width=1)
    _ticket_field_block(draw, _ar("الخدمة المطلوبة"), details_lines, right_col_x, row_y, label_font, details_font)

    if district_lines:
        row_y = row_y + details_h + FIELD_GAP_Y
        draw.line([CARD_LEFT + PAD, row_y - 12, CARD_RIGHT - PAD, row_y - 12], fill=LINE_COLOR, width=1)
        _ticket_field_block(draw, _ar("الحي"), district_lines, right_col_x, row_y, label_font, value_font)

    seam_y = y0 + HEADER_H + STAMP_R + 6 + body_h

    notch_r = 15
    draw.ellipse([CARD_LEFT - notch_r, seam_y - notch_r, CARD_LEFT + notch_r, seam_y + notch_r], fill=PAGE_BG)
    draw.ellipse([CARD_RIGHT - notch_r, seam_y - notch_r, CARD_RIGHT + notch_r, seam_y + notch_r], fill=PAGE_BG)
    _draw_dashed(draw, CARD_LEFT + notch_r + 4, CARD_RIGHT - notch_r - 4, seam_y, LINE_COLOR)

    stub_y = seam_y + 22
    rng = random.Random(reference_id)
    bx = CARD_LEFT + PAD
    bar_top, bar_h = stub_y, 34
    while bx < CARD_LEFT + PAD + 220:
        bw = rng.choice([2, 2, 3, 5])
        draw.rectangle([bx, bar_top, bx + bw, bar_top + bar_h], fill=TEXT_PRIMARY)
        bx += bw + rng.choice([3, 5, 7])

    _text_left(draw, reference_id, ref_font, CARD_LEFT + PAD, bar_top + bar_h + 8, TEXT_MUTED)

    issued = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    _text_right(draw, _ar(f"صدرت في {issued}"), footer_font, CARD_RIGHT - PAD, stub_y + 4, TEXT_MUTED)
    _text_right(draw, _ar("برجاء إحضار هذه البطاقة والأوراق المطلوبة"), footer_font, CARD_RIGHT - PAD, stub_y + 26, TEXT_MUTED)

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
