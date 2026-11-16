// Control state machine of a successive-approximation ADC (chapter "Digital and the Analog World").
// An external comparator says whether the input voltage is greater than what the DAC gives (code dac).
// In 8 clock cycles the machine finds the code by bisection: bit by bit, starting from the most significant.
module sar_adc (
    input            clk,
    input            start,      // start the measurement
    input            cmp,        // 1 if Uin >= Udac
    output reg [7:0] dac,        // code currently sent to the DAC
    output reg [7:0] result,     // finished result
    output reg       done        // 1 for one clock cycle when result is ready
);
    reg [7:0] acc  = 8'd0;       // high bits found so far
    reg [7:0] mask = 8'd0;       // bit under test (a running one)
    reg       busy = 1'b0;

    // Keep the one in the tested bit only if Uin is not less than the trial value
    wire [7:0] acc_n = cmp ? (acc | mask) : acc;

    always @(posedge clk) begin
        done <= 1'b0;
        if (!busy) begin
            if (start) begin
                busy <= 1'b1;
                acc  <= 8'd0;
                mask <= 8'h80;
                dac  <= 8'h80;              // try half of the scale first
            end
        end else begin
            acc <= acc_n;
            if (mask[0]) begin              // the least significant bit has been tested
                busy   <= 1'b0;
                done   <= 1'b1;
                result <= acc_n;
            end else begin
                mask <= mask >> 1;
                dac  <= acc_n | (mask >> 1); // next trial
            end
        end
    end
endmodule

// Demo without external parts: the input "voltage" is a constant, the comparator is built in.
module sar_demo (
    input        clk,
    input        start,
    output [7:0] dac,
    output [7:0] result,
    output       done
);
    localparam [7:0] VIN = 8'd179;           // measured "voltage"
    wire cmp = (VIN >= dac);                 // comparator: Uin >= Udac
    sar_adc u_adc (.clk(clk), .start(start), .cmp(cmp), .dac(dac), .result(result), .done(done));
endmodule
