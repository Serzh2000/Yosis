"""Software checks: no DLL is loaded and no hardware is accessed."""

import unittest

from ftdi_read_probe import decode_dr32, dr_read32_commands, ir_read_instruction, tms_commands


TAP = {
    "reset": ("idle", "reset"), "idle": ("idle", "select-dr"),
    "select-dr": ("capture-dr", "select-ir"), "capture-dr": ("shift-dr", "exit1-dr"),
    "shift-dr": ("shift-dr", "exit1-dr"), "exit1-dr": ("pause-dr", "update-dr"),
    "pause-dr": ("pause-dr", "exit2-dr"), "exit2-dr": ("shift-dr", "update-dr"),
    "update-dr": ("idle", "select-dr"), "select-ir": ("capture-ir", "reset"),
    "capture-ir": ("shift-ir", "exit1-ir"), "shift-ir": ("shift-ir", "exit1-ir"),
    "exit1-ir": ("pause-ir", "update-ir"), "pause-ir": ("pause-ir", "exit2-ir"),
    "exit2-ir": ("shift-ir", "update-ir"), "update-ir": ("idle", "select-dr"),
}


def mpsse_clocks(data):
    result, offset = [], 0
    while offset < len(data):
        command = data[offset]
        offset += 1
        if command == 0x87:
            continue
        if command in (0x4B, 0x6B):
            count, payload = data[offset] + 1, data[offset + 1]
            offset += 2
            result.extend(((payload >> bit) & 1, (payload >> 7) & 1) for bit in range(count))
        elif command in (0x1B, 0x3B):
            count, payload = data[offset] + 1, data[offset + 1]
            offset += 2
            result.extend((0, (payload >> bit) & 1) for bit in range(count))
        elif command in (0x19, 0x39):
            count = data[offset] + (data[offset + 1] << 8) + 1
            offset += 2
            for byte in data[offset:offset + count]:
                result.extend((0, (byte >> bit) & 1) for bit in range(8))
            offset += count
        else:
            raise AssertionError(f"Unexpected MPSSE command {command:02x}")
    return result


def simulate(clocks, state="idle"):
    shifted_ir, shifted_dr, updates = [], [], []
    for tms, tdi in clocks:
        if state == "shift-ir":
            shifted_ir.append(tdi)
        elif state == "shift-dr":
            shifted_dr.append(tdi)
        state = TAP[state][tms]
        if state == "update-ir":
            updates.append(sum(bit << offset for offset, bit in enumerate(shifted_ir)))
    return state, shifted_ir, shifted_dr, updates


class ProbeSoftwareTest(unittest.TestCase):
    def test_reset_from_every_tap_state(self):
        clocks = mpsse_clocks(tms_commands([1] * 6) + tms_commands([0]))
        for state in TAP:
            self.assertEqual(simulate(clocks, state)[0], "idle")

    def test_instruction_allowlist_and_eight_bit_boundaries(self):
        for opcode in (0x11, 0x13, 0x41):
            state, ir, dr, updates = simulate(mpsse_clocks(ir_read_instruction(opcode)))
            self.assertEqual(state, "idle")
            self.assertEqual(len(ir), 8)
            self.assertEqual(dr, [])
            self.assertEqual(updates, [opcode])
        for forbidden in (0x00, 0x03, 0x05, 0x09, 0x12, 0x15, 0x17, 0x3A, 0x3C, 0x71):
            with self.assertRaises(ValueError):
                ir_read_instruction(forbidden)

    def test_data_scan_has_exactly_thirty_two_clocks(self):
        state, ir, dr, updates = simulate(mpsse_clocks(dr_read32_commands()))
        self.assertEqual(state, "idle")
        self.assertEqual(ir, [])
        self.assertEqual(dr, [1] * 32)
        self.assertEqual(updates, [])

    def test_decode_every_bit_position_and_known_values(self):
        values = [0, 0xFFFFFFFF, 0x81B, 0x8896, 0x6020] + [1 << bit for bit in range(32)]
        for value in values:
            little = value.to_bytes(4, "little")
            raw = little[:3] + bytes(((little[3] & 0x7F) << 1, little[3] & 0x80))
            self.assertEqual(decode_dr32(raw), value)
        with self.assertRaises(ValueError):
            decode_dr32(b"\x00" * 4)


if __name__ == "__main__":
    unittest.main()
