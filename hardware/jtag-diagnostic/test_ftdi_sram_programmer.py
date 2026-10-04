"""Offline sequence and packing checks: no D2XX DLL or USB access."""

import unittest

from ftdi_sram_programmer import (CONFIG_COMMANDS, ROW_BITS, config_ir, decode_read_row,
                                  dr_read_row_commands, dr_write_chunks, pack_fs_bits)
from test_ftdi_read_probe import mpsse_clocks, simulate


class SramSoftwareTest(unittest.TestCase):
    def test_byte_packing_preserves_all_text_bits_in_clock_order(self):
        for value in range(256):
            text = f"{value:08b}"
            packed = pack_fs_bits(text)
            actual_bits = "".join(str((packed[0] >> bit) & 1) for bit in range(8))
            self.assertEqual(actual_bits, text)

    def test_flash_and_external_flash_instructions_are_forbidden(self):
        for opcode in (0x71, 0x75, 0x3D, 0x16, 0x7A, 0x3F, 0x00):
            self.assertNotIn(opcode, CONFIG_COMMANDS)
            with self.assertRaises(ValueError):
                config_ir(opcode)

    def test_all_config_instructions_shift_exactly_eight_bits(self):
        for opcode in CONFIG_COMMANDS:
            state, ir, dr, updates = simulate(mpsse_clocks(config_ir(opcode)))
            self.assertEqual((state, len(ir), dr, updates), ("idle", 8, [], [opcode]))

    def test_write_packets_keep_dr_continuous_at_boundary_lengths(self):
        for length in (1, 2, 508, 509, 510, 511, 512, 1024):
            data = bytes(offset % 256 for offset in range(length))
            packets = list(dr_write_chunks(data))
            self.assertTrue(all(len(packet) <= 512 for packet in packets))
            state, ir, bits, updates = simulate(mpsse_clocks(b"".join(packets)))
            self.assertEqual(state, "idle")
            self.assertEqual(ir, [])
            self.assertEqual(updates, [])
            self.assertEqual(bits, [(byte >> bit) & 1 for byte in data for bit in range(8)])

    def test_read_row_has_exact_3376_data_clocks(self):
        command = dr_read_row_commands()
        self.assertLessEqual(len(command), 512)
        state, ir, bits, updates = simulate(mpsse_clocks(command))
        self.assertEqual((state, ir, updates), ("idle", [], []))
        self.assertEqual(bits, [1] * ROW_BITS)

    def test_read_row_decoding_last_bit_is_not_lost(self):
        for value in range(256):
            body = bytes(offset % 256 for offset in range(421))
            raw = body + bytes(((value & 0x7F) << 1, value & 0x80))
            self.assertEqual(decode_read_row(raw), body + bytes((value,)))
        with self.assertRaises(ValueError):
            decode_read_row(bytes(422))


if __name__ == "__main__":
    unittest.main()
