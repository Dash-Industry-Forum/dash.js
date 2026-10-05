#!/usr/bin/env python3
"""
Converts the OpenCV dnn_superres ESPCN x4 model (TensorFlow GraphDef) into a flat float32 file for espcn.js.

Source model (Apache-2.0): https://github.com/fannymonori/TF-ESPCN/blob/master/export/ESPCN_x4.pb

    python3 convert-weights.py ESPCN_x4.pb espcn_x4.bin
    python3 convert-weights.py ESPCN_x4.pb espcn_x4.bin --check image.jpg   # also needs Pillow

Output layout (little-endian float32, TensorFlow HWIO order for filters):
    f1 [5][5][1][64], b1 [64], f2 [3][3][64][32], b2 [32], f3 [3][3][32][16], b3 [16]

--check runs a numpy reference of the network on a 4x downscaled image and asserts it beats bicubic (PSNR on luma),
which catches a wrong weight layout or normalization.
"""
import sys

import numpy as np

ORDER = ['f1', 'b1', 'f2', 'b2', 'f3', 'b3']


# Minimal protobuf reader: enough of GraphDef/NodeDef/AttrValue/TensorProto to pull out the Const tensors
def _varint(b, i):
    r = s = 0
    while True:
        c = b[i]
        i += 1
        r |= (c & 0x7f) << s
        s += 7
        if c < 0x80:
            return r, i


def _fields(b):
    i, out = 0, []
    while i < len(b):
        k, i = _varint(b, i)
        f, w = k >> 3, k & 7
        if w == 0:
            v, i = _varint(b, i)
        elif w == 2:
            n, i = _varint(b, i)
            v, i = b[i:i + n], i + n
        elif w == 5:
            v, i = b[i:i + 4], i + 4
        elif w == 1:
            v, i = b[i:i + 8], i + 8
        else:
            raise ValueError(f'unsupported wire type {w}')
        out.append((f, v))
    return out


def load_consts(path):
    consts = {}
    for f, node in _fields(open(path, 'rb').read()):
        if f != 1:  # GraphDef.node
            continue
        nf = _fields(node)
        name = next(v.decode() for k, v in nf if k == 1)
        op = next(v.decode() for k, v in nf if k == 2)
        if op != 'Const' or name not in ORDER:
            continue
        for k, attr in nf:
            if k != 5:  # NodeDef.attr
                continue
            kv = dict(_fields(attr))
            if kv[1] != b'value':
                continue
            tensor = dict(_fields(dict(_fields(kv[2]))[8]))  # AttrValue.tensor
            shape = [dict(_fields(d)).get(1, 1) for k2, d in _fields(tensor[2]) if k2 == 2]
            consts[name] = np.frombuffer(tensor[4], dtype='<f4').reshape(shape)
    return consts


def conv_same(x, w, b):
    """x [H][W][I], w [KH][KW][I][O] -> [H][W][O], zero padding like TF 'SAME'."""
    kh, kw = w.shape[:2]
    p = np.pad(x, ((kh // 2, kh // 2), (kw // 2, kw // 2), (0, 0)))
    win = np.lib.stride_tricks.sliding_window_view(p, (kh, kw), axis=(0, 1))  # [H][W][I][KH][KW]
    return np.einsum('hwiyx,yxio->hwo', win, w) + b


def espcn(y, c):
    x = np.maximum(conv_same(y[..., None], c['f1'], c['b1']), 0)
    x = np.maximum(conv_same(x, c['f2'], c['b2']), 0)
    x = conv_same(x, c['f3'], c['b3'])  # [H][W][16]
    h, w = y.shape
    # DepthToSpace(4): channel dy * 4 + dx -> output pixel (y * 4 + dy, x * 4 + dx)
    return np.tanh(x.reshape(h, w, 4, 4).transpose(0, 2, 1, 3).reshape(h * 4, w * 4))


def cv_downscale4(y):
    """OpenCV INTER_CUBIC 4x downscale (no antialiasing), the degradation the model was trained on."""
    k = np.array([-0.09375, 0.59375, 0.59375, -0.09375], dtype=np.float32)  # cubic a=-0.75 at t=0.5
    h, w = y.shape
    y = y.reshape(h, w // 4, 4) @ k
    return np.clip((y.T.reshape(w // 4, h // 4, 4) @ k).T, 0, 1)


def check(c, image_path):
    from PIL import Image
    img = Image.open(image_path).convert('RGB')
    img = img.crop((0, 0, img.width // 4 * 4, img.height // 4 * 4))
    ref = np.asarray(img, dtype=np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32) / 255
    small = cv_downscale4(ref)
    psnr = lambda a: 10 * np.log10(1 / np.mean((np.clip(a, 0, 1) - ref) ** 2))
    p_bicubic = psnr(np.asarray(Image.fromarray(small).resize(img.size, Image.BICUBIC)))
    p_espcn = psnr(espcn(small, c))
    print(f'PSNR (luma) bicubic {p_bicubic:.2f} dB, ESPCN {p_espcn:.2f} dB')
    assert p_espcn > p_bicubic, 'ESPCN should beat bicubic; weight layout or normalization is wrong'


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    consts = load_consts(src)
    for name in ORDER:
        print(name, consts[name].shape)
    np.concatenate([consts[n].ravel() for n in ORDER]).astype('<f4').tofile(dst)
    if '--check' in sys.argv:
        check(consts, sys.argv[sys.argv.index('--check') + 1])
