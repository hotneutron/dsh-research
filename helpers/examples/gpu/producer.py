"""Disposable CUDA-driver qualification kernel, using the existing POSIX GPU lease protocol."""
from __future__ import annotations

import ctypes as c
import fcntl
import hashlib
import json
import os
from pathlib import Path
import socket
import sys
import tempfile

PTX = """.version 8.0
.target sm_90
.address_size 64
.visible .entry add(.param .u64 a, .param .u64 b, .param .u64 out) {
 .reg .u64 %rd<5>;
 .reg .u32 %r<2>;
 .reg .f32 %f<4>;
 ld.param.u64 %rd0, [a];
 ld.param.u64 %rd1, [b];
 ld.param.u64 %rd2, [out];
 mov.u32 %r0, %tid.x;
 mul.wide.u32 %rd3, %r0, 4;
 add.u64 %rd4, %rd0, %rd3;
 ld.global.f32 %f0, [%rd4];
 add.u64 %rd4, %rd1, %rd3;
 ld.global.f32 %f1, [%rd4];
 add.f32 %f2, %f0, %f1;
 add.u64 %rd4, %rd2, %rd3;
 st.global.f32 [%rd4], %f2;
 ret;
}
"""


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(spec_path, operation):
    if operation not in {"positive", "negative", "incomplete"}:
        raise ValueError("Unsupported qualification operation")
    spec_path = Path(spec_path).resolve()
    root = Path.cwd().resolve()
    spec_path.relative_to(root / "snapshots")
    spec = json.loads(spec_path.read_text())
    if Path(spec["project_root"]).resolve() != root:
        raise ValueError("Frozen producer root differs from canonical cwd")
    if spec["ptx_sha256"] != sha(PTX.encode()) or os.environ.get("CUDA_VISIBLE_DEVICES") != spec["device_uuid"]:
        raise ValueError("Frozen kernel/device identity differs")
    if socket.gethostname() != spec["host"]:
        raise ValueError("Frozen host differs")
    lease_root = Path(spec["lease_root"]).resolve()
    if not lease_root.is_dir():
        raise ValueError("Existing registered lease namespace is unavailable")
    resource = "gpu:" + spec["device_uuid"]
    lease_path = lease_root / sha(resource.encode())
    fd = os.open(lease_path, os.O_CREAT | os.O_RDWR, 0o600)
    context = c.c_void_p()
    cuda = None
    synchronized = destroyed = lease_owned = False
    raw = {"schema_version": 1, "kind": "gpu_producer_terminal", "host": spec["host"], "device_uuid": spec["device_uuid"],
           "spec_sha256": sha(spec_path.read_bytes()), "ptx_sha256": sha(PTX.encode()), "pid": os.getpid(),
           "boot_id": Path("/proc/sys/kernel/random/boot_id").read_text().strip(), "lease_path": str(lease_path)}
    stat = Path(f"/proc/{os.getpid()}/stat").read_text()
    raw["start_ticks"] = stat[stat.rfind(")") + 2:].split()[19]
    def call(name, *args):
        code = getattr(cuda, name)(*args)
        if code != 0:
            raise RuntimeError(f"CUDA {name} failed: {code}")
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        lease_owned = True
        cuda = c.CDLL("libcuda.so.1")
        call("cuInit", c.c_uint(0))
        count = c.c_int(); call("cuDeviceGetCount", c.byref(count))
        device = None
        for ordinal in range(count.value):
            candidate = c.c_int(); call("cuDeviceGet", c.byref(candidate), c.c_int(ordinal))
            uuid = (c.c_ubyte * 16)(); call("cuDeviceGetUuid_v2", c.byref(uuid), candidate)
            text = bytes(uuid).hex()
            actual_uuid = "GPU-" + "-".join([text[:8], text[8:12], text[12:16], text[16:20], text[20:]])
            if actual_uuid == spec["device_uuid"]: device = candidate; break
        if device is None:
            raise ValueError("CUDA driver resolved another GPU")
        call("cuCtxCreate_v2", c.byref(context), c.c_uint(0), device)
        driver = c.c_int()
        call("cuDriverGetVersion", c.byref(driver))
        module = c.c_void_p(); function = c.c_void_p()
        call("cuModuleLoadData", c.byref(module), c.c_char_p(PTX.encode()))
        call("cuModuleGetFunction", c.byref(function), module, c.c_char_p(b"add"))
        a = (c.c_float * 256)(*range(256)); b = (c.c_float * 256)(*[2 * x for x in range(256)]); result = (c.c_float * 256)()
        addresses = [c.c_uint64() for _ in range(3)]
        for address, values in zip(addresses, [a, b, result]):
            call("cuMemAlloc_v2", c.byref(address), c.c_size_t(c.sizeof(values)))
        for address, values in zip(addresses[:2], [a, b]):
            call("cuMemcpyHtoD_v2", address, c.byref(values), c.c_size_t(c.sizeof(values)))
        args = (c.c_void_p * 3)(*[c.cast(c.byref(address), c.c_void_p) for address in addresses])
        call("cuLaunchKernel", function, c.c_uint(1), c.c_uint(1), c.c_uint(1), c.c_uint(256), c.c_uint(1), c.c_uint(1),
             c.c_uint(0), c.c_void_p(), args, c.c_void_p())
        call("cuCtxSynchronize"); synchronized = True
        call("cuMemcpyDtoH_v2", c.byref(result), addresses[2], c.c_size_t(c.sizeof(result)))
        correct = all(result[x] == 3 * x for x in range(256))
        raw.update(driver_version=driver.value, elements=256, correct=correct, complete_unit=operation != "incomplete")
        for address in addresses: call("cuMemFree_v2", address)
        call("cuModuleUnload", module)
    finally:
        if cuda is not None and context.value:
            for _ in range(3):
                if getattr(cuda, "cuCtxDestroy_v2")(context) == 0:
                    destroyed = True
                    break
            if not destroyed:
                # Do not unlock and then emit a normal released receipt while
                # teardown is unresolved. Process exit remains a host/native
                # reconciliation boundary, never successful settlement proof.
                raise RuntimeError("GPU context teardown unresolved; no released receipt; reconcile producer termination")
        if not lease_owned:
            os.close(fd)
    raw.update(lease_was_owned=lease_owned, device_synchronized=synchronized, context_destroyed=destroyed, lease_released=False)
    parent = root / "local_artifacts/autoresearch/dsh/gpu-qualification/producer"
    ancestor = parent
    while not ancestor.exists(): ancestor = ancestor.parent
    ancestor.resolve().relative_to(root)
    parent.mkdir(parents=True, exist_ok=True)
    parent.resolve().relative_to(root)
    folder = Path(tempfile.mkdtemp(prefix=operation + "-", dir=parent))
    out = folder / "resource-owned.json"
    data = (json.dumps(raw, sort_keys=True, allow_nan=False) + "\n").encode()
    with out.open("xb") as handle: handle.write(data); handle.flush(); os.fsync(handle.fileno())
    # Release only after successful teardown and retained receipt construction.
    os.close(fd)
    raw["lease_released"] = True
    out = folder / "resource-released.json"
    data = (json.dumps(raw, sort_keys=True, allow_nan=False) + "\n").encode()
    with out.open("xb") as handle: handle.write(data); handle.flush(); os.fsync(handle.fileno())
    return {"score": -1 if operation == "negative" else 1 if raw["correct"] else 0,
            "gpu_receipt_uri": out.relative_to(root).as_posix(), "gpu_receipt_sha256": sha(data), "gpu_receipt_size": len(data)}


if __name__ == "__main__":
    if len(sys.argv) != 3: raise SystemExit("Usage: producer.py <frozen-spec> <qualification-operation>")
    print(json.dumps(run(Path(sys.argv[1]), sys.argv[2]), sort_keys=True, allow_nan=False))
