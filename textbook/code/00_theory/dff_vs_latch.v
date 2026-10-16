// Защёлка (по уровню) и триггер (по фронту) рядом: глава «Триггеры».
module dff_vs_latch (
    input  clk,
    input  d,
    output reg q_latch,   // прозрачна, пока clk = 1
    output reg q_ff       // запоминает d только в момент фронта clk
);
    always @*              if (clk)  q_latch = d;
    always @(posedge clk)  q_ff <= d;
endmodule
