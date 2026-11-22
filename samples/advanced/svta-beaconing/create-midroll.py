#!/usr/bin/env python3
"""
Generates the mid-roll ad used by the SVTA 2053-1 beaconing sample: a 20 s DASH presentation showing a moving
"ADVERTISEMENT" text, a playback clock and a countdown, with a short beep at every full second.

No Python dependencies; frames are drawn with a built-in pixel font and piped to ffmpeg (H.264 + AAC, 2 s segments).

Usage:
    python3 create-midroll.py [output-dir]      (default: ./midroll)

Output:
    <output-dir>/midroll.mpd, init and media segments
"""
import os
import subprocess
import sys

WIDTH, HEIGHT, FPS, DURATION = 1280, 720, 30, 20
BACKGROUND = (20, 24, 48)
TEXT_COLOR = (255, 196, 0)
CLOCK_COLOR = (255, 255, 255)
BAR_COLOR = (255, 196, 0)

# 5x7 pixel font, only the characters used below
FONT = {
    'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
    '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
    ' ': ['00000'] * 7,
}


def text_width(text, scale):
    return len(text) * 6 * scale - scale


def fill_rect(frame, x, y, w, h, color):
    x0, x1 = max(0, x), min(WIDTH, x + w)
    y0, y1 = max(0, y), min(HEIGHT, y + h)
    if x0 >= x1 or y0 >= y1:
        return
    row = bytes(color) * (x1 - x0)
    for yy in range(y0, y1):
        offset = (yy * WIDTH + x0) * 3
        frame[offset:offset + len(row)] = row


def draw_text(frame, text, x, y, scale, color):
    for i, char in enumerate(text):
        glyph = FONT[char]
        gx = x + i * 6 * scale
        for gy, bits in enumerate(glyph):
            for bx, bit in enumerate(bits):
                if bit == '1':
                    fill_rect(frame, gx + bx * scale, y + gy * scale, scale, scale, color)


def render_frame(n, background):
    t = n / FPS
    frame = bytearray(background)

    # Moving "ADVERTISEMENT" banner, scrolling from right to left
    banner = 'ADVERTISEMENT'
    scale = 14
    width = text_width(banner, scale)
    travel = WIDTH + width
    x = WIDTH - int((t * 260) % travel)
    draw_text(frame, banner, x, 110, scale, TEXT_COLOR)

    # Playback clock and total duration
    clock = '%02d:%02d.%d' % (int(t) // 60, int(t) % 60, int(t * 10) % 10)
    total = ' / 00:%02d' % DURATION
    clock_scale = 11
    clock_text = clock + total
    draw_text(frame, clock_text, (WIDTH - text_width(clock_text, clock_scale)) // 2, 330, clock_scale, CLOCK_COLOR)

    # Countdown
    remaining = 'ENDS IN %02d' % max(0, DURATION - int(t))
    draw_text(frame, remaining, (WIDTH - text_width(remaining, 8)) // 2, 520, 8, TEXT_COLOR)

    # Progress bar
    fill_rect(frame, 0, HEIGHT - 24, int(WIDTH * t / DURATION), 24, BAR_COLOR)
    return frame


def main():
    out_dir = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'midroll')
    os.makedirs(out_dir, exist_ok=True)
    background = bytes(BACKGROUND) * (WIDTH * HEIGHT)

    command = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{HEIGHT}', '-r', str(FPS), '-i', '-',
        '-f', 'lavfi', '-i', f'aevalsrc=0.25*sin(2*PI*1000*t)*lt(mod(t\\,1)\\,0.08):s=48000:c=stereo:d={DURATION}',
        '-map', '0:v', '-map', '1:a', '-t', str(DURATION),
        '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-b:v', '1500k', '-maxrate', '1500k', '-bufsize', '3000k',
        '-g', str(2 * FPS), '-keyint_min', str(2 * FPS), '-sc_threshold', '0',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
        '-f', 'dash', '-seg_duration', '2', '-use_template', '1', '-use_timeline', '1',
        '-init_seg_name', 'init-$RepresentationID$.m4s',
        '-media_seg_name', 'seg-$RepresentationID$-$Number%05d$.m4s',
        '-adaptation_sets', 'id=0,streams=v id=1,streams=a',
        os.path.join(out_dir, 'midroll.mpd')
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for n in range(DURATION * FPS):
        process.stdin.write(render_frame(n, background))
    process.stdin.close()
    if process.wait() != 0:
        sys.exit('ffmpeg failed')
    print(f'Wrote {out_dir}/midroll.mpd')


if __name__ == '__main__':
    main()
