"""Tang Nano 20K SRAM-only diagnostic; Windows D2XX, no flash-writing code.

The default is offline inspection. --program enables a temporary SRAM load and
mandatory full readback with SecurityBit OFF. --restore-existing-flash only
requests FPGA reload; it neither erases nor writes the existing flash.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time

from ftdi_read_probe import D2xx, EXPECTED_IDCODE, tms_commands


CONFIG_COMMANDS = {0x02, 0x03, 0x05, 0x08, 0x09, 0x0A, 0x11, 0x12, 0x13, 0x15, 0x17, 0x3A, 0x3C, 0x41}
ROW_COUNT = 1342
ROW_BITS = 3376
MAX_USB_PACKET = 512
MAX_DATA_CHUNK = MAX_USB_PACKET - 3
REVERSE = bytes(int(f"{value:08b}"[::-1], 2) for value in range(256))


def reverse_bytes(data: bytes) -> bytes:
    return data.translate(REVERSE)


def pack_fs_bits(bits: str) -> bytes:
    """FS characters are in transmission order; MPSSE clocks each byte LSB first."""
    if not bits or len(bits) % 8 or set(bits) - {"0", "1"}:
        raise ValueError("FS row must be non-empty, binary and byte aligned")
    return bytes(REVERSE[int(bits[offset:offset + 8], 2)] for offset in range(0, len(bits), 8))


def config_ir(opcode: int) -> bytes:
    if opcode not in CONFIG_COMMANDS:
        raise ValueError(f"Forbidden FPGA opcode: 0x{opcode:02x}")
    return (tms_commands([1, 1, 0, 0]) + bytes((0x1B, 6, opcode & 0x7F))
            + bytes((0x4B, 0, 0x03 | ((opcode >> 7) << 7)))
            + tms_commands([1, 0]) + tms_commands([0] * 6))


def dr_write_chunks(data: bytes, chunk_size: int = MAX_DATA_CHUNK):
    """One continuous DR shift. Only its final bit exits Shift-DR."""
    if not data or not 1 <= chunk_size <= MAX_DATA_CHUNK:
        raise ValueError("Invalid DR data or packet size")
    yield tms_commands([1, 0, 0])
    # Leave the final byte for seven data bits plus one TMS-clocked final bit.
    for offset in range(0, len(data) - 1, chunk_size):
        chunk = data[offset:min(offset + chunk_size, len(data) - 1)]
        length_minus_one = len(chunk) - 1
        yield bytes((0x19, length_minus_one & 0xFF, length_minus_one >> 8)) + chunk
    last = data[-1]
    yield (bytes((0x1B, 6, last & 0x7F, 0x4B, 0, 0x03 | (last & 0x80)))
           + tms_commands([1, 0]) + bytes((0x87,)))


def dr_read_row_commands() -> bytes:
    # 421 complete bytes + 7 bits + one TMS bit = 3376 bits, exactly one row.
    return (tms_commands([1, 0, 0], 1)
            + bytes((0x39, 0xA4, 0x01)) + bytes((0xFF,)) * 421
            + bytes((0x3B, 6, 0x7F, 0x6B, 0, 0x83))
            + tms_commands([1, 0], 1) + bytes((0x87,)))


def decode_read_row(raw: bytes) -> bytes:
    if len(raw) != 423:
        raise ValueError(f"Readback row requires 423 MPSSE bytes, got {len(raw)}")
    return raw[:421] + bytes(((raw[421] >> 1) | (raw[422] & 0x80),))


@dataclass
class Bitstream:
    path: Path
    sha256: str
    wire_data: bytes
    expected_rows: list[bytes]
    crc_enabled: bool
    file_usercode: int
    upstream_checksum: int

    def summary(self):
        return {"path": str(self.path), "sha256": self.sha256, "idcode": f"0x{EXPECTED_IDCODE:08x}",
                "wire_bytes": len(self.wire_data), "rows": len(self.expected_rows), "row_bits": ROW_BITS,
                "crc_check": self.crc_enabled, "security_bit": False,
                "file_usercode": f"0x{self.file_usercode:08x}",
                "upstream_checksum": f"0x{self.upstream_checksum:08x}"}


def load_bitstream(path: Path) -> Bitstream:
    path = path.resolve()
    raw_file = path.read_bytes()
    text = raw_file.decode("ascii")
    metadata, rows = {}, []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("//"):
            if ":" in line:
                key, value = line[2:].split(":", 1)
                metadata[key.strip()] = value.strip()
        elif line:
            pack_fs_bits(line)  # Validate every row before USB is opened.
            rows.append(line)
    if any(metadata.get(key, "OFF") != "OFF" for key in ("Compress", "Encryption", "SecurityBit", "SecureMode")):
        raise ValueError("Only uncompressed, unencrypted SecurityBit OFF files can be verified")
    if rows[:3] != ["1" * 160, "1" * 16, f"{0xA5C3:016b}"]:
        raise ValueError("Unsupported FS preamble")
    headers = {}
    header_end = None
    for index, row in enumerate(rows[3:], 3):
        opcode = int(row[:8], 2)
        if opcode not in (0x06, 0x10, 0x51, 0xD2, 0x12, 0x3B):
            raise ValueError(f"Unsupported FS header opcode 0x{opcode:02x}; pure JTAG1149 files are not supported")
        if opcode in headers:
            raise ValueError("Duplicate FS header command")
        value = int(row, 2)
        headers[opcode] = (value, len(row))
        if opcode == 0x3B:
            header_end = index
            break
    if header_end is None or any(opcode not in headers for opcode in (0x06, 0x10, 0x12, 0x3B)):
        raise ValueError("Incomplete FS header")
    if headers[0x06] != (0x060000000000081B, 64):
        raise ValueError("Bitstream is not for GW2A(R)-18C IDCODE 0000081B")
    # Accept only the known uncompressed mode plus optional loading rate bits.
    if headers[0x10][1] != 64 or headers[0x10][0] & ~(0x1000000000000000 | 0xFF0000):
        raise ValueError("Unsupported compression/encryption/mode settings in FS header")
    count_word, count_width = headers[0x3B]
    if (count_width != 32 or count_word & 0xFFFF != ROW_COUNT
            or count_word & ~(0x3B000000 | (1 << 23) | 0xFFFF)):
        raise ValueError("Bitstream must contain exactly 1342 GW2A-18C configuration rows")
    crc_enabled = bool(count_word & (1 << 23))
    frames = rows[header_end + 1:header_end + 1 + ROW_COUNT]
    drop_bits = 64 if crc_enabled else 48
    if len(frames) != ROW_COUNT or any(len(frame) != ROW_BITS + drop_bits for frame in frames):
        raise ValueError("Unexpected configuration row lengths")
    if any(frame[-48:] != "1" * 48 for frame in frames):
        raise ValueError("Unexpected row padding")
    footer = rows[header_end + 1 + ROW_COUNT:]
    if len(footer) != 6 or len(footer[0]) != 160 or len(footer[1]) != 64:
        raise ValueError("Unexpected FS footer or additional memory slots")
    if int(footer[1][:8], 2) != 0x0A or footer[2:] != ["1" * 64, f"{0x08000000:032b}", "1" * 64, "1" * 16]:
        raise ValueError("Unsupported FS footer; SecurityBit must be OFF")
    if crc_enabled:
        # Apicula independently validates the header/each chained frame CRC.
        from apycula import bslib
        _, _, _, slots = bslib.read_bitstream(str(path))
        if slots:
            raise ValueError("Additional memory slots are not supported by this diagnostic")
    payloads = [frame[:-drop_bits] for frame in frames]
    checksum = sum(int(payload[offset:offset + 16], 2)
                   for payload in payloads for offset in range(0, ROW_BITS, 16)) & 0xFFFF
    return Bitstream(path, hashlib.sha256(raw_file).hexdigest(), b"".join(pack_fs_bits(row) for row in rows),
                     [pack_fs_bits(payload) for payload in payloads], crc_enabled,
                     int(footer[1], 2) & 0xFFFFFFFF, checksum)


class SramSession:
    def __init__(self, api: D2xx, report: dict):
        self.api, self.report = api, report
        self.id_confirmed = False
        self.touched_configuration = False

    def register(self, opcode: int) -> int:
        register = self.api.read_register(opcode)
        self.report["registers"].append(register)
        return int(register["value"], 16)

    def confirm_id(self):
        if self.register(0x11) != EXPECTED_IDCODE:
            raise RuntimeError("FPGA IDCODE mismatch; no configuration commands sent")
        self.id_confirmed = True

    def command(self, opcode: int):
        if not self.id_confirmed:
            raise RuntimeError("IDCODE must be confirmed before any configuration command")
        self.api.write(config_ir(opcode), f"IR 0x{opcode:02x}")
        self.report["config_opcodes"].append(f"0x{opcode:02x}")

    def idle_clocks(self, count: int):
        # Use explicit TMS commands rather than buggy BL616 clock-only commands.
        while count:
            chunk = min(count, 1008)
            self.api.write(tms_commands([0] * chunk), f"Idle clocks {chunk}")
            count -= chunk

    def poll(self, mask: int, expected: int, label: str, deadline_seconds=2):
        deadline = time.monotonic() + deadline_seconds
        while True:
            status = self.register(0x41)
            if status & 0x0F:
                raise RuntimeError(f"FPGA configuration error during {label}: 0x{status:08x}")
            if status & mask == expected:
                return status
            if time.monotonic() >= deadline:
                raise RuntimeError(f"Timeout during {label}: 0x{status:08x}")
            self.idle_clocks(60)
            time.sleep(0.01)

    def disable(self):
        self.command(0x3A)
        self.command(0x02)
        return self.poll(0x80, 0, "configuration disable")

    def erase_sram(self):
        self.confirm_id()
        status = self.register(0x41)
        if status & 0x0F:
            raise RuntimeError(f"Configuration has error flags before erase: 0x{status:08x}")
        self.touched_configuration = True
        self.command(0x15)
        self.poll(0x80, 0x80, "configuration enable")
        self.command(0x05)
        self.command(0x02)
        self.poll(0x20, 0x20, "SRAM erase")
        self.command(0x09)
        self.command(0x02)
        self.disable()

    def shift_data(self, data: bytes, label: str):
        for index, command in enumerate(dr_write_chunks(data)):
            self.api.write(command, f"{label}: packet {index}")

    def program(self, bitstream: Bitstream):
        self.erase_sram()
        # This is precisely the standard openFPGALoader SRAM data-transfer flow.
        self.command(0x15)
        self.command(0x12)
        self.command(0x17)
        self.shift_data(bitstream.wire_data, "configuration FS")
        self.command(0x0A)
        self.shift_data(bitstream.upstream_checksum.to_bytes(4, "little"), "upstream checksum")
        self.command(0x08)
        self.disable()
        status = self.poll(0x2000, 0x2000, "configuration completion")
        self.report["post_program_status"] = f"0x{status:08x}"
        if status & 0x4000:
            raise RuntimeError("SecurityBit unexpectedly ON; required SRAM readback unavailable")
        self.report["post_program_usercode"] = f"0x{self.register(0x13):08x}"

    def verify_sram(self, bitstream: Bitstream, readback_path: Path):
        status = self.register(0x41)
        if status & 0x4000:
            raise RuntimeError("Cannot read back SRAM with SecurityBit ON")
        self.command(0x15)
        self.poll(0x80, 0x80, "readback enable")
        self.command(0x12)
        self.command(0x03)
        rows, mismatch_rows, differing_bits, ones = [], [], 0, 0
        reversed_matching_rows, reversed_differing_bits = 0, 0
        for row_number, expected in enumerate(bitstream.expected_rows):
            self.api.write(dr_read_row_commands(), f"SRAM read row {row_number}")
            observed = decode_read_row(self.api.read_exact(423, f"SRAM read row {row_number}"))
            rows.append(observed)
            ones += sum(byte.bit_count() for byte in observed)
            differences = sum((a ^ b).bit_count() for a, b in zip(expected, observed))
            differing_bits += differences
            reversed_row = reverse_bytes(observed)[::-1]
            reversed_difference = sum((a ^ b).bit_count() for a, b in zip(expected, reversed_row))
            reversed_differing_bits += reversed_difference
            reversed_matching_rows += int(reversed_difference == 0)
            if differences:
                first_offset = next(offset for offset, pair in enumerate(zip(expected, observed))
                                    if pair[0] != pair[1])
                mismatch_rows.append({"row": row_number, "different_bits": differences,
                                      "first_different_byte": first_offset,
                                      "expected_byte": f"{expected[first_offset]:02x}",
                                      "observed_byte": f"{observed[first_offset]:02x}",
                                      "first_expected_bytes": expected[:16].hex(),
                                      "first_observed_bytes": observed[:16].hex()})
            if row_number % 128 == 0:
                print(f"Readback {row_number + 1}/{ROW_COUNT} rows; mismatches {len(mismatch_rows)}", flush=True)
        self.disable()
        readback_path.parent.mkdir(parents=True, exist_ok=True)
        readback_path.write_bytes(b"".join(rows))
        total_bits = ROW_COUNT * ROW_BITS
        self.report["readback"] = {"path": str(readback_path.resolve()), "rows": ROW_COUNT,
                                   "bit_order": "MPSSE chronological LSB-first bytes",
                                   "sha256": hashlib.sha256(b"".join(rows)).hexdigest(),
                                   "matching_rows": ROW_COUNT - len(mismatch_rows),
                                   "mismatch_rows": len(mismatch_rows), "different_bits": differing_bits,
                                   "one_bits": ones, "total_bits": total_bits,
                                   "ones_fraction": ones / total_bits,
                                   "reversed_row_diagnostic": {"matching_rows": reversed_matching_rows,
                                                                "different_bits": reversed_differing_bits},
                                   "first_mismatches": mismatch_rows[:16], "passed": not mismatch_rows}
        if mismatch_rows:
            raise RuntimeError(f"SRAM readback differs in {len(mismatch_rows)}/{ROW_COUNT} rows, "
                               f"{differing_bits} bits; see raw readback and report")

    def restore_existing_flash(self):
        self.confirm_id()
        self.command(0x3C)
        self.command(0x02)
        self.idle_clocks(600)
        time.sleep(0.2)
        self.report["restored_status"] = f"0x{self.poll(0x2000, 0x2000, 'existing flash reload'):08x}"
        self.report["restored_usercode"] = f"0x{self.register(0x13):08x}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--inspect", type=Path, help="Validate FS offline; no USB access")
    modes.add_argument("--program", type=Path, help="Temporary SRAM load followed by mandatory full readback")
    modes.add_argument("--restore-existing-flash", action="store_true", help="Reload existing flash without writing it")
    parser.add_argument("--dll", default=r"C:\Windows\System32\ftd2xx.dll")
    parser.add_argument("--frequency", type=int, default=100_000, choices=(10_000, 100_000, 500_000))
    parser.add_argument("--report", type=Path, default=Path(__file__).with_name("sram-program-report.json"))
    parser.add_argument("--readback", type=Path, default=Path(__file__).with_name("sram-readback.bin"))
    args = parser.parse_args()
    report = {"timestamp": datetime.now(timezone.utc).isoformat(), "mode": "SRAM-only",
              "registers": [], "config_opcodes": [], "trace": [], "flash_written": False}
    api = session = None
    result = 0
    try:
        bitstream = load_bitstream(args.inspect or args.program) if not args.restore_existing_flash else None
        if bitstream:
            report["bitstream"] = bitstream.summary()
            print(json.dumps(report["bitstream"], indent=2), flush=True)
        if args.inspect:
            report["offline_validation_passed"] = True
        else:
            api = D2xx(args.dll, report["trace"])
            report["devices"] = api.devices()
            report["opened_device"] = api.open_board(report["devices"])
            report["actual_frequency_hz"] = api.configure(args.frequency)
            api.write(tms_commands([1] * 6) + tms_commands([0]), "reset TAP into Idle")
            session = SramSession(api, report)
            if args.restore_existing_flash:
                session.restore_existing_flash()
            else:
                session.program(bitstream)
                session.verify_sram(bitstream, args.readback)
            report["success"] = True
    except Exception as error:
        report["error"] = str(error)
        print(str(error), file=sys.stderr, flush=True)
        result = 1
        if session and session.touched_configuration:
            try:
                api.write(tms_commands([1] * 6) + tms_commands([0]), "recover TAP after error")
                session.disable()
            except Exception as cleanup_error:
                report["configuration_cleanup_error"] = str(cleanup_error)
    finally:
        if api:
            report["cleanup_errors"] = api.close()
            if report["cleanup_errors"]:
                result = 1
        report["tx_bytes"] = sum(event.get("written", 0) for event in report["trace"])
        report["rx_bytes"] = sum(event.get("read", 0) for event in report["trace"])
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Report: {args.report.resolve()}", flush=True)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
