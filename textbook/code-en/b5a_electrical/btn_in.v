// Input of a button that shorts the contact to ground: the pull-up is set in the .cst file, not in Verilog.
module btn_in (
    input  btn_n,                // 1 = released (pull-up), 0 = pressed
    output pressed
);
    assign pressed = ~btn_n;     // make a logical "1" out of the press
endmodule
