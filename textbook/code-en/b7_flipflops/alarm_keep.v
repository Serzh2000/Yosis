// "Security Panel" project stage: remembering the alarm.
// If sensor = 1 for at least one cycle, alarm stays 1 until key arrives (reset beats the sensor).
module alarm_keep (
    input      clk,
    input      key,       // guard key: reset
    input      sensor,    // "door open and system armed"
    output reg alarm = 1'b0
);
    always @(posedge clk) begin
        if (key)         alarm <= 1'b0;    // reset beats the sensor
        else if (sensor) alarm <= 1'b1;    // remember
    end
endmodule
