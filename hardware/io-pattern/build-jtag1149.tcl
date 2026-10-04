set_device -name GW2AR-18C GW2AR-LV18QN88C8/I7
add_file top.v
add_file board.cst
set_option -top_module top
set_option -output_base_name io-pattern-jtag1149
set_option -synthesis_tool gowinsynthesis
set_option -verilog_std v2001
# Pure JTAG 1149 SRAM mode requires no CRC, encryption or compression.
set_option -bit_crc_check 0
set_option -bit_compress 0
set_option -bit_encrypt 0
set_option -bit_security 0
run all
