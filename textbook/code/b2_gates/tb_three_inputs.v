// Тестбенч: тревога горит ровно в трёх строках из восьми: 101, 110, 111.
`timescale 1ns/1ps
module tb_three_inputs;
    reg door, night, armed;
    wire alarm, led_n, all3, odd3, two_of_3;
    integer i, errors, alarms;

    three_inputs dut (.door(door), .night(night), .armed(armed), .alarm(alarm), .led_n(led_n),
                      .all3(all3), .odd3(odd3), .two_of_3(two_of_3));

    initial begin
        errors = 0;
        alarms = 0;
        for (i = 0; i < 8; i = i + 1) begin
            {door, night, armed} = i[2:0];
            #5;
            if (alarm) alarms = alarms + 1;
            if (alarm !== (i == 5 || i == 6 || i == 7) || led_n !== ~alarm) begin
                errors = errors + 1;
                $display("ERROR: door=%b night=%b armed=%b alarm=%b", door, night, armed, alarm);
            end
            if (all3 !== (i == 7) || odd3 !== (i == 1 || i == 2 || i == 4 || i == 7) ||
                two_of_3 !== (i == 3 || i == 5 || i == 6 || i == 7)) begin
                errors = errors + 1;
                $display("ERROR: three-input functions, row %0d", i);
            end
        end
        if (alarms !== 3) begin errors = errors + 1; $display("ERROR: %0d alarm rows", alarms); end
        if (errors == 0) $display("OK: three_inputs, alarm in 3 rows of 8");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
