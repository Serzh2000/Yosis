// Три состояния на Verilog: буфер, и «правильная» шина на мультиплексоре.

// 1) Буфер с тремя состояниями: oe = 1 передаёт d, oe = 0 отпускает линию (Z).
module tri_buf (
    input  oe,
    input  d,
    output pin
);
    assign pin = oe ? d : 1'bz;
endmodule

// 2) Внутри кристалла общих проводов нет: выбор источника делает мультиплексор.
module bus_mux (
    input        sel,            // 0 --- говорит a, 1 --- говорит b
    input  [3:0] a, b,
    output [3:0] bus
);
    assign bus = sel ? b : a;    // одно присваивание: один источник в каждый момент
endmodule
