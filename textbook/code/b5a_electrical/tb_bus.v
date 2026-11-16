// Модели общей линии для симуляции: два источника на одном проводе.
// Yosys это не принимает, в кристалле такого нет: запуск в Icarus Verilog.
`timescale 1ns/1ps
module tb_bus;
    reg  [1:0] sel = 2'd2;
    reg        en_a = 0, en_b = 0;
    reg  [3:0] a = 4'hA, b = 4'h5;
    wire [3:0] bus2, bus3;
    reg        low_a = 0, low_b = 0;
    tri1       line;                       // tri1: цепь с подтяжкой к 1
    integer bad = 0;

    bus_two     u2 (.sel(sel), .a(a), .b(b), .bus(bus2));
    bus_free    u3 (.en_a(en_a), .en_b(en_b), .a(a), .b(b), .bus(bus3));
    open_drain2 u4 (.low_a(low_a), .low_b(low_b), .line(line));

    initial begin
        // шина с выбором
        #1; if (bus2 !== 4'bzzzz) bad = bad + 1;       // никто не говорит: Z
        sel = 0; #1; if (bus2 !== 4'hA) bad = bad + 1;
        sel = 1; #1; if (bus2 !== 4'h5) bad = bad + 1;
        // независимые разрешения, конфликт
        en_a = 1; en_b = 0; #1; if (bus3 !== 4'hA) bad = bad + 1;
        en_a = 1; en_b = 1; #1; if (bus3 !== 4'bxxxx) bad = bad + 1;   // разные данные: X
        a = 4'h6; b = 4'h6; #1; if (bus3 !== 4'h6) bad = bad + 1;      // равные данные конфликта не дают
        // открытый сток
        #1; if (line !== 1'b1) bad = bad + 1;          // единица от подтяжки
        low_a = 1; #1; if (line !== 1'b0) bad = bad + 1;
        low_a = 0; low_b = 1; #1; if (line !== 1'b0) bad = bad + 1;
        low_a = 1; #1; if (line !== 1'b0) bad = bad + 1;                // «монтажное И»
        if (bad == 0) $display("bus: OK"); else $display("bus: ОШИБОК %0d", bad);
        $finish;
    end
endmodule

// Шина из двух источников: выбор по sel, значение 2 отключает обоих.
module bus_two (
    input  [1:0] sel,
    input  [3:0] a, b,
    output [3:0] bus
);
    assign bus = (sel == 2'd0) ? a : 4'bzzzz;
    assign bus = (sel == 2'd1) ? b : 4'bzzzz;
endmodule

// Ошибка: разрешения независимы, можно включить оба передатчика сразу.
module bus_free (
    input        en_a, en_b,
    input  [3:0] a, b,
    output [3:0] bus
);
    assign bus = en_a ? a : 4'bzzzz;
    assign bus = en_b ? b : 4'bzzzz;
endmodule

// Открытый сток: каждый участник либо тянет линию к нулю, либо отпускает её.
module open_drain2 (
    input  low_a, low_b,
    output line
);
    assign line = low_a ? 1'b0 : 1'bz;
    assign line = low_b ? 1'b0 : 1'bz;
endmodule
