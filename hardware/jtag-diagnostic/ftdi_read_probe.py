"""Read-only, single-device Gowin JTAG diagnostic through Windows D2XX.

Only FPGA IR opcodes IDCODE, USERCODE and STATUS are permitted. This tool has
no bitstream parser, configuration/erase/reload instructions or EEPROM API.
Importing this file does not load a DLL or touch USB; --probe is required.
"""

from __future__ import annotations

import argparse
import ctypes
import json
import math
import os
from pathlib import Path
import sys
import time
from datetime import datetime, timezone


BOARD_SERIAL = "2025030317"
BOARD_LOCATION = 529
BOARD_USB_ID = 0x04036010
EXPECTED_IDCODE = 0x0000081B
READ_REGISTERS = {0x11: "IDCODE", 0x13: "USERCODE", 0x41: "STATUS"}


def tms_commands(bits: list[int], tdi: int = 0) -> bytes:
    """Emit TMS on falling TCK edges, LSB first, at most six clocks per command."""
    if not bits or any(bit not in (0, 1) for bit in bits) or tdi not in (0, 1):
        raise ValueError("TMS/TDI must contain binary values")
    result = bytearray()
    for offset in range(0, len(bits), 6):
        chunk = bits[offset:offset + 6]
        value = sum(bit << index for index, bit in enumerate(chunk))
        # Keep the last TMS level stable after the final clock as openFPGALoader does.
        value |= chunk[-1] << len(chunk)
        value |= tdi << 7
        result.extend((0x4B, len(chunk) - 1, value))
    return bytes(result)


def ir_read_instruction(opcode: int) -> bytes:
    """From Run-Test/Idle, shift one allowed 8-bit IR and return to Idle."""
    if opcode not in READ_REGISTERS:
        raise ValueError(f"FPGA opcode 0x{opcode:02x} is forbidden by this read-only tool")
    return (
        tms_commands([1, 1, 0, 0])  # Select-DR -> Select-IR -> Capture-IR -> Shift-IR.
        + bytes((0x1B, 6, opcode & 0x7F))  # First seven instruction bits.
        + bytes((0x4B, 0, 0x03 | ((opcode >> 7) << 7)))  # Last bit + Exit1-IR.
        + tms_commands([1, 0])  # Update-IR -> Run-Test/Idle.
        + tms_commands([0] * 6)  # Gowin's settling clocks after an instruction.
    )


def dr_read32_commands() -> bytes:
    """Capture exactly 32 DR bits; the last bit changes TMS to enter Exit1-DR."""
    return (
        tms_commands([1, 0, 0], 1)
        + bytes((0x39, 2, 0, 0xFF, 0xFF, 0xFF))  # Three full bytes, 24 clocks.
        + bytes((0x3B, 6, 0x7F))  # Seven more bits, 7 clocks.
        + bytes((0x6B, 0, 0x83))  # Bit 31, TMS=1, TDI=1; 1 clock.
        + tms_commands([1, 0], 1)
        + bytes((0x87,))  # Flush the five MPSSE response bytes immediately.
    )


def decode_dr32(response: bytes) -> int:
    if len(response) != 5:
        raise ValueError(f"32-bit DR shift expects 5 MPSSE bytes, received {len(response)}")
    # MPSSE bit responses are left aligned; the final TMS-clock sample is bit 7.
    final_byte = (response[3] >> 1) | (response[4] & 0x80)
    return int.from_bytes(response[:3] + bytes((final_byte,)), "little")


class D2xx:
    def __init__(self, dll_path: str, trace: list[dict]):
        if os.name != "nt":
            raise RuntimeError("This diagnostic needs Windows D2XX and the current FTDI driver")
        self.dll_path = str(Path(dll_path).resolve())
        self.dll = ctypes.WinDLL(self.dll_path)
        self.trace = trace
        self.handle = ctypes.c_void_p()
        self.original_latency: int | None = None
        self.mpsse_verified = False
        u32, u8, ptr = ctypes.c_uint32, ctypes.c_uint8, ctypes.c_void_p
        self.signatures = {
            "FT_CreateDeviceInfoList": [ctypes.POINTER(u32)],
            "FT_GetDeviceInfoDetail": [u32] + [ctypes.POINTER(u32)] * 4
                + [ptr, ptr, ctypes.POINTER(ptr)],
            "FT_OpenEx": [ptr, u32, ctypes.POINTER(ptr)],
            "FT_Close": [ptr],
            "FT_SetTimeouts": [ptr, u32, u32],
            "FT_SetUSBParameters": [ptr, u32, u32],
            "FT_GetLatencyTimer": [ptr, ctypes.POINTER(u8)],
            "FT_SetLatencyTimer": [ptr, u8],
            "FT_SetBitMode": [ptr, u8, u8],
            "FT_Purge": [ptr, u32],
            "FT_Write": [ptr, ptr, u32, ctypes.POINTER(u32)],
            "FT_Read": [ptr, ptr, u32, ctypes.POINTER(u32)],
            "FT_GetQueueStatus": [ptr, ctypes.POINTER(u32)],
        }
        for name, arguments in self.signatures.items():
            function = getattr(self.dll, name)
            function.argtypes, function.restype = arguments, u32

    def call(self, name: str, *arguments) -> None:
        if name not in self.signatures:
            raise ValueError(f"D2XX API {name} is outside the diagnostic allowlist")
        status = int(getattr(self.dll, name)(*arguments))
        self.trace.append({"api": name, "status": status})
        if status != 0:
            raise RuntimeError(f"{name} returned D2XX status {status}")

    def devices(self) -> list[dict]:
        count = ctypes.c_uint32()
        self.call("FT_CreateDeviceInfoList", ctypes.byref(count))
        result = []
        for index in range(count.value):
            flags, kind, usb_id, location = [ctypes.c_uint32() for _ in range(4)]
            serial, description = ctypes.create_string_buffer(64), ctypes.create_string_buffer(128)
            handle = ctypes.c_void_p()
            self.call("FT_GetDeviceInfoDetail", index, ctypes.byref(flags), ctypes.byref(kind),
                      ctypes.byref(usb_id), ctypes.byref(location), serial, description,
                      ctypes.byref(handle))
            result.append({"index": index, "flags": flags.value, "type": kind.value,
                           "usb_id": f"0x{usb_id.value:08x}", "location": location.value,
                           "serial": serial.value.decode("ascii", "replace"),
                           "description": description.value.decode("ascii", "replace")})
        return result

    def open_board(self, devices: list[dict]) -> dict:
        candidates = [device for device in devices
                      if device["usb_id"] == f"0x{BOARD_USB_ID:08x}"
                      and device["location"] == BOARD_LOCATION
                      and device["serial"] in (BOARD_SERIAL, BOARD_SERIAL + "A")
                      and (device["serial"].endswith("A")
                           or device["description"].rstrip().endswith(" A"))]
        if len(candidates) != 1:
            raise RuntimeError(f"Expected one Tang Nano 20K interface A, found {len(candidates)}; "
                               "inspect --list, no fallback device will be opened")
        device = candidates[0]
        if device["flags"] & 1:
            raise RuntimeError("Board interface A is already open by another process")
        # FT_OPEN_BY_LOCATION: does not depend on duplicate serial descriptors.
        self.call("FT_OpenEx", ctypes.c_void_p(BOARD_LOCATION), 4, ctypes.byref(self.handle))
        return device

    def configure(self, frequency: int) -> int:
        latency = ctypes.c_uint8()
        self.call("FT_GetLatencyTimer", self.handle, ctypes.byref(latency))
        self.original_latency = latency.value
        self.call("FT_SetTimeouts", self.handle, 1000, 1000)
        self.call("FT_SetUSBParameters", self.handle, 4096, 4096)
        self.call("FT_SetBitMode", self.handle, 0, 0)
        self.call("FT_Purge", self.handle, 3)
        self.call("FT_SetLatencyTimer", self.handle, 2)
        self.call("FT_SetBitMode", self.handle, 0x0B, 2)
        time.sleep(0.05)
        self.call("FT_Purge", self.handle, 3)
        # Invalid-command echo proves that the selected interface speaks MPSSE.
        self.write(bytes((0xAA, 0x87)), "MPSSE synchronization")
        response = self.read_exact(2, "MPSSE synchronization")
        if response != bytes((0xFA, 0xAA)):
            raise RuntimeError(f"Unexpected MPSSE sync response {response.hex()}; stopping before JTAG")
        # FT2232-compatible 12 MHz clock base, divide-by-five enabled. Avoid the
        # clock-only 0x8E/0x8F commands with known Sipeed firmware quirks.
        divisor = max(0, math.ceil(12_000_000 / (2 * frequency)) - 1)
        self.write(bytes((0x8B, 0x85, 0x86, divisor & 0xFF, divisor >> 8,
                          0x80, 0x08, 0x0B, 0x87)), "MPSSE clock and JTAG directions")
        self.mpsse_verified = True
        return 12_000_000 // (2 * (divisor + 1))

    def write(self, payload: bytes, label: str) -> None:
        count = ctypes.c_uint32()
        buffer = ctypes.create_string_buffer(payload)
        self.call("FT_Write", self.handle, buffer, len(payload), ctypes.byref(count))
        self.trace.append({"tx": payload.hex(" "), "label": label,
                           "requested": len(payload), "written": count.value})
        if count.value != len(payload):
            raise RuntimeError(f"Short USB write: {count.value}/{len(payload)}")

    def queue_size(self) -> int:
        count = ctypes.c_uint32()
        self.call("FT_GetQueueStatus", self.handle, ctypes.byref(count))
        return count.value

    def read_exact(self, length: int, label: str) -> bytes:
        deadline = time.monotonic() + 2
        result = bytearray()
        while len(result) < length:
            waiting = self.queue_size()
            if waiting:
                request = min(waiting, length - len(result))
                buffer, count = ctypes.create_string_buffer(request), ctypes.c_uint32()
                self.call("FT_Read", self.handle, buffer, request, ctypes.byref(count))
                chunk = buffer.raw[:count.value]
                result.extend(chunk)
                self.trace.append({"rx": chunk.hex(" "), "label": label,
                                   "requested": request, "read": count.value})
            elif time.monotonic() >= deadline:
                raise RuntimeError(f"USB read timeout for {label}: {len(result)}/{length} bytes")
            else:
                time.sleep(0.01)
        time.sleep(0.01)
        extra = self.queue_size()
        if extra:
            raise RuntimeError(f"Unexpected {extra} extra USB response bytes after {label}")
        return bytes(result)

    def read_register(self, opcode: int) -> dict:
        name = READ_REGISTERS.get(opcode)
        if name is None:
            raise ValueError("Only identity and status registers are allowed")
        self.write(ir_read_instruction(opcode) + dr_read32_commands(), name)
        raw = self.read_exact(5, name)
        value = decode_dr32(raw)
        return {"register": name, "opcode": f"0x{opcode:02x}",
                "raw_mpsse_bytes": raw.hex(" "), "value": f"0x{value:08x}"}

    def close(self) -> list[str]:
        errors = []
        if self.handle.value:
            actions = []
            if self.mpsse_verified:
                actions.append(lambda: self.write(tms_commands([1] * 6) + tms_commands([0])
                                                  + bytes((0x80, 0x08, 0, 0x87)),
                                                  "cleanup: TAP idle and release JTAG pins"))
            actions.append(lambda: self.call("FT_SetBitMode", self.handle, 0, 0))
            if self.original_latency is not None:
                actions.append(lambda: self.call("FT_SetLatencyTimer", self.handle, self.original_latency))
            actions.append(lambda: self.call("FT_Close", self.handle))
            for action in actions:
                try:
                    action()
                except Exception as error:
                    errors.append(str(error))
            self.handle = ctypes.c_void_p()
        return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--list", action="store_true", help="List D2XX devices without opening any")
    mode.add_argument("--probe", action="store_true", help="Read identity and status from the fixed board")
    parser.add_argument("--dll", default=r"C:\Windows\System32\ftd2xx.dll")
    parser.add_argument("--frequency", type=int, default=100_000, choices=(10_000, 100_000, 500_000))
    parser.add_argument("--repeat", type=int, default=3, choices=range(1, 11))
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("read-probe-report.json"))
    args = parser.parse_args()
    trace: list[dict] = []
    report = {"timestamp": datetime.now(timezone.utc).isoformat(), "mode": "read-only",
              "allowed_fpga_instructions": READ_REGISTERS, "trace": trace, "registers": []}
    api = None
    result = 0
    try:
        api = D2xx(args.dll, trace)
        report["dll"] = api.dll_path
        report["devices"] = api.devices()
        print(json.dumps(report["devices"], ensure_ascii=False, indent=2))
        if args.probe:
            report["opened_device"] = api.open_board(report["devices"])
            report["actual_frequency_hz"] = api.configure(args.frequency)
            api.write(tms_commands([1] * 6) + tms_commands([0]), "reset JTAG TAP into Idle")
            for iteration in range(args.repeat):
                for opcode in (0x11, 0x13, 0x41):
                    register = api.read_register(opcode)
                    register["iteration"] = iteration
                    report["registers"].append(register)
                    print(f"{iteration}: {register['register']} {register['value']} raw={register['raw_mpsse_bytes']}")
                    if opcode == 0x11 and int(register["value"], 16) != EXPECTED_IDCODE:
                        raise RuntimeError("IDCODE differs from GW2AR-18C; no further instructions sent")
            report["read_success"] = True
    except Exception as error:
        report["error"] = str(error)
        print(str(error), file=sys.stderr)
        result = 1
    finally:
        if api is not None:
            report["cleanup_errors"] = api.close()
            if report["cleanup_errors"]:
                result = 1
        report["tx_bytes"] = sum(event.get("written", 0) for event in trace)
        report["rx_bytes"] = sum(event.get("read", 0) for event in trace)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Report: {args.report.resolve()}")
    return result


if __name__ == "__main__":
    raise SystemExit(main())
