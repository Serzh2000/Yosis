# Сборка примеров открытыми инструментами (Yosys + nextpnr + Apicula + openFPGALoader)
# Использование:
#   make PROJECT=02_blink TOP=blink          -- синтез, трассировка, битстрим
#   make PROJECT=02_blink TOP=blink load     -- загрузить в SRAM (до выключения)
#   make PROJECT=02_blink TOP=blink flash    -- записать во Flash (навсегда)

PROJECT ?= 02_blink
TOP     ?= blink
DEVICE  := GW2AR-LV18QN88C8/I7
FAMILY  := GW2A-18C
# У каждого проекта свой файл выводов рядом с .v
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
