// Вход кнопки, замыкающей контакт на землю: подтяжка к питанию задаётся в файле .cst, а не в Verilog.
module btn_in (
    input  btn_n,                // 1 = отпущена (подтяжка), 0 = нажата
    output pressed
);
    assign pressed = ~btn_n;     // логическую «1» делаем из нажатия
endmodule
