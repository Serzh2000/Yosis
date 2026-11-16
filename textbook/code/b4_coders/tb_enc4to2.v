`timescale 1ns/1ps
// Тестбенч: на всех унитарных кодах шифратор через case и шифратор из ИЛИ дают номер линии.
module tb_enc4to2;
    reg  [3:0] x;
    wire [1:0] y_case, y_or;
    integer i, bad = 0;
    enc4to2    u_case (.x(x), .y(y_case));
    enc4to2_or u_or   (.x(x), .y(y_or));
    initial begin
        for (i = 0; i < 4; i = i + 1) begin
            x = 4'b0001 << i; #1;
            if (y_case !== i[1:0] || y_or !== i[1:0]) bad = bad + 1;
        end
        x = 4'b0110; #1;                         // две единицы: ИЛИ-шифратор врёт (11), case молчит (00)
        if (y_or !== 2'b11) bad = bad + 1;
        if (y_case !== 2'b00) bad = bad + 1;
        if (bad == 0) $display("enc4to2: OK"); else $display("enc4to2: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
