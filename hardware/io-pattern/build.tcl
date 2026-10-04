set_device -name GW2AR-18C GW2AR-LV18QN88C8/I7
add_file top.v
add_file board.cst
set_option -top_module top
set_option -output_base_name io-pattern
set_option -synthesis_tool gowinsynthesis
set_option -verilog_std v2001
run all
