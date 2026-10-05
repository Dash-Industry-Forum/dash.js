#!/usr/bin/env python3
"""
Verifies that model.onnx (third-party export) contains the official Real-ESRGAN realesr-animevideov3 weights.

model.onnx: https://huggingface.co/skillsafe-ai/realesr-animevideov3 (commit 185e9142d439d17e3fb99395600fb7d08af09de5)
Official weights (BSD-3-Clause, see LICENSE-realesr-animevideov3.txt):
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth

    python3 verify-model.py realesr-animevideov3.pth model.onnx [input-64x64.npy output-64x64.npy]

Checks (numpy only, no torch / onnx packages):
  1. sha256 of the official .pth
  2. graph is SRVGGNetCompact: (Conv, PRelu) x 17, Conv 64->48, DepthToSpace(4, CRD), nearest Resize of input, Add
  3. every ONNX weight equals the .pth weight
  4. optional: numpy forward on the repo's reference input reproduces the reference output

The numpy forward (srvgg) is also the reference for checking the WebGPU output in the browser.
"""
import hashlib
import pickle
import sys
import zipfile
from collections import OrderedDict

import numpy as np

PTH_SHA256 = 'b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d'
NUM_CONV = 16
SCALE = 4


# --- PyTorch checkpoint (zip + pickle) without torch ---
class _TorchUnpickler(pickle.Unpickler):
    DTYPES = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'LongStorage': np.int64}

    def __init__(self, f, zf, prefix):
        super().__init__(f)
        self.zf, self.prefix = zf, prefix

    def find_class(self, module, name):
        if module == 'torch._utils' and name == '_rebuild_tensor_v2':
            def rebuild(storage, offset, size, stride, *_):
                item = storage.itemsize
                return np.lib.stride_tricks.as_strided(storage[offset:], size, [s * item for s in stride]).copy()
            return rebuild
        if module == 'torch._utils' and name == '_rebuild_parameter':
            return lambda data, *_: data
        if module == 'torch' and name in self.DTYPES:
            return self.DTYPES[name]
        if module == 'collections' and name == 'OrderedDict':
            return OrderedDict
        raise pickle.UnpicklingError(f'unexpected class {module}.{name}')

    def persistent_load(self, pid):
        _, dtype, key, _location, _numel = pid
        return np.frombuffer(self.zf.read(f'{self.prefix}/data/{key}'), dtype=dtype)


def load_pth(path):
    with zipfile.ZipFile(path) as zf:
        pkl = next(n for n in zf.namelist() if n.endswith('/data.pkl'))
        with zf.open(pkl) as f:
            return _TorchUnpickler(f, zf, pkl.rsplit('/', 1)[0]).load()


# --- ONNX (protobuf) without onnx package ---
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


def load_onnx(path):
    graph = next(v for f, v in _fields(open(path, 'rb').read()) if f == 7)  # ModelProto.graph
    nodes, inits = [], {}
    for f, v in _fields(graph):
        if f == 1:  # NodeProto: input=1, output=2, op_type=4, attribute=5
            nf = _fields(v)
            attrs = {}
            for k, a in nf:
                if k == 5:
                    af = _fields(a)  # AttributeProto: name=1, i=3, s=4
                    attrs[next(x for n, x in af if n == 1).decode()] = next((x for n, x in af if n in (3, 4)), None)
            nodes.append((next(x for k, x in nf if k == 4).decode(), [x.decode() for k, x in nf if k == 1], attrs))
        elif f == 5:  # TensorProto: dims=1, data_type=2, name=8, raw_data=9
            tf = _fields(v)
            assert dict(tf)[2] == 1, 'expected float32 initializers'
            dims = [x for k, x in tf if k == 1]
            inits[dict(tf)[8].decode()] = np.frombuffer(dict(tf)[9], dtype='<f4').reshape(dims)
    return nodes, inits


# --- numpy reference of SRVGGNetCompact ---
def conv3x3(x, w, b):
    """x [C][H][W], w [O][C][3][3] -> [O][H][W], zero padding 1."""
    p = np.pad(x, ((0, 0), (1, 1), (1, 1)))
    win = np.lib.stride_tricks.sliding_window_view(p, (3, 3), axis=(1, 2))  # [C][H][W][3][3]
    return np.einsum('chwyx,ocyx->ohw', win, w, optimize=True) + b[:, None, None]


def srvgg(img, params):
    """img [3][H][W] RGB 0..1 -> [3][4H][4W]."""
    x = img
    for i in range(NUM_CONV + 1):
        x = conv3x3(x, params[f'body.{2 * i}.weight'], params[f'body.{2 * i}.bias'])
        a = params[f'body.{2 * i + 1}.weight'][:, None, None]
        x = np.where(x >= 0, x, a * x)  # PReLU
    x = conv3x3(x, params[f'body.{2 * NUM_CONV + 2}.weight'], params[f'body.{2 * NUM_CONV + 2}.bias'])
    c, h, w = img.shape
    # PixelShuffle / DepthToSpace CRD: channel c * 16 + dy * 4 + dx -> pixel (4y + dy, 4x + dx) of channel c
    x = x.reshape(c, SCALE, SCALE, h, w).transpose(0, 3, 1, 4, 2).reshape(c, h * SCALE, w * SCALE)
    return x + img.repeat(SCALE, 1).repeat(SCALE, 2)  # + nearest-upsampled input


def main():
    pth_path, onnx_path = sys.argv[1], sys.argv[2]

    assert hashlib.sha256(open(pth_path, 'rb').read()).hexdigest() == PTH_SHA256, 'not the official .pth'
    params = load_pth(pth_path)['params']
    print(f'official .pth: sha256 ok, {len(params)} tensors')

    nodes, inits = load_onnx(onnx_path)
    ops = [op for op, _, _ in nodes if op != 'Constant']
    assert ops == ['Conv', 'PRelu'] * (NUM_CONV + 1) + ['Conv', 'DepthToSpace', 'Resize', 'Add'], ops
    d2s = next(a for op, _, a in nodes if op == 'DepthToSpace')
    assert d2s['blocksize'] == SCALE and d2s.get('mode', b'DCR') == b'CRD', d2s
    assert next(a for op, _, a in nodes if op == 'Resize').get('mode', b'nearest') == b'nearest'
    print('onnx graph: SRVGGNetCompact, DepthToSpace CRD x4, nearest residual ok')

    # Conv weights keep their PyTorch names; PRelu slopes are anonymous, map them in graph order
    prelus = [inputs[1] for op, inputs, _ in nodes if op == 'PRelu']
    names = {f'body.{2 * i + 1}.weight': prelus[i] for i in range(NUM_CONV + 1)}
    for key, ref in params.items():
        got = inits[names.get(key, key)].reshape(ref.shape)
        assert np.array_equal(got, ref), f'{key} differs (max {np.abs(got - ref).max()})'
    print(f'onnx weights: all {len(params)} tensors identical to the official .pth')

    if len(sys.argv) > 4:
        inp, out = np.load(sys.argv[3]), np.load(sys.argv[4])
        mine = srvgg(inp[0].astype(np.float32), params)
        err = np.abs(mine - out[0]).max()
        print(f'numpy forward vs reference output: max abs diff {err:.2e}')
        assert err < 1e-4


if __name__ == '__main__':
    main()
