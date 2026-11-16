// D-защёлка: прозрачна при c = 1, при c = 0 хранит последнее значение.
// В always @* нет ветки else -> синтезатор создаёт память (латч).
module d_latch (
    input      c,    // разрешение (уровень)
    input      d,
    output reg q
);
    always @* begin
        if (c) q = d;        // при c = 0 q не присваивается -> хранит
    end
endmodule
