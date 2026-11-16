# Building the examples with open-source tools (Yosys + nextpnr + Apicula + openFPGALoader)
# Usage:
#   make PROJECT=02_blink TOP=blink          -- synthesis, place and route, bitstream
#   make PROJECT=02_blink TOP=blink load     -- load into SRAM (until power-off)
#   make PROJECT=02_blink TOP=blink flash    -- write to Flash (permanent)

PROJECT ?= 02_blink
TOP     ?= blink
DEVICE  := GW2AR-LV18QN88C8/I7
FAMILY  := GW2A-18C
# Each project has its own pin file next to the .v
CST     ?= $(PROJECT)/$(TOP).cst
BUILD   := build/$(PROJECT)

all: $(BUILD)/$(TOP).fs

$(BUILD)/$(TOP).json: $(PROJECT)/$(TOP).v
	mkdir -p $(BUILD)
	yosys -p "read_verilog $<; synth_gowin -top $(TOP) -json $@"

$(BUILD)/$(TOP)_pnr.json: $(BUILD)/$(TOP).json $(CST)
	nextpnr-himbaechel --json $< --write $@ --device $(DEVICE) \
	    --vopt family=$(FAMILY) --vopt cst=$(CST) --freq 27

$(BUILD)/$(TOP).fs: $(BUILD)/$(TOP)_pnr.json
	gowin_pack -d $(FAMILY) -o $@ $<

load: $(BUILD)/$(TOP).fs
	openFPGALoader -b tangnano20k $<

flash: $(BUILD)/$(TOP).fs
	openFPGALoader -b tangnano20k -f $<

clean:
	rm -rf build

.PHONY: all load flash clean
