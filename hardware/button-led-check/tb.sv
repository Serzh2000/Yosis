`timescale 1ns/1ps
module tb;
    reg button_a_n = 1;
    reg button_b_n = 1;
    wire [5:0] led_n;
    top dut (.button_a_n(button_a_n), .button_b_n(button_b_n), .led_n(led_n));
    task check;
        input a_n, b_n;
        input [5:0] expected;
        begin
            button_a_n = a_n;
            button_b_n = b_n;
            #10;
            if (led_n !== expected)
                $fatal(1, "buttons=%b%b led_n=%b expected=%b", a_n, b_n, led_n, expected);
            $display("PASS buttons=%b%b led_n=%b", a_n, b_n, led_n);
        end
    endtask
    initial begin
        $dumpfile("button-led-check.vcd");
        $dumpvars(0, tb);
        check(1, 1, 6'b011111); // No button: LED5 (XNOR).
        check(0, 1, 6'b101010); // A: LED0, LED2, LED4.
        check(1, 0, 6'b101001); // B: LED1, LED2, LED4.
        check(0, 0, 6'b000100); // Both: LED0, LED1, LED3, LED4, LED5.
        $display("All four button combinations passed.");
        $finish;
    end
endmodule
