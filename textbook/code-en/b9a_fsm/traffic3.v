// Traffic light: a Moore machine "in three blocks". Durations are parameters.
module traffic3 #(
    parameter G = 4,             // green clocks
    parameter Y = 2,             // yellow clocks
    parameter R = 4              // red clocks
) (
    input            clk,
    input            rst,
    output reg [2:0] lamp        // {red, yellow, green}
);
    localparam [1:0] S_GREEN = 2'd0, S_YELLOW = 2'd1, S_RED = 2'd2;

    reg [1:0] state, next;
    reg [7:0] t;                 // how many clocks have passed in the state

    wire last = (state == S_GREEN  && t == G - 1)
             || (state == S_YELLOW && t == Y - 1)
             || (state == S_RED    && t == R - 1);

    // Block 1. Registers: the state and the clock counter. No logic here, only storage.
    always @(posedge clk) begin
        if (rst) begin
            state <= S_GREEN;
            t     <= 8'd0;
        end else begin
            state <= next;
            t     <= last ? 8'd0 : t + 8'd1;
        end
    end

    // Block 2. Next-state logic. By default we stay where we are.
    always @(*) begin
        next = state;
        case (state)
            S_GREEN:  if (last) next = S_YELLOW;
            S_YELLOW: if (last) next = S_RED;
            S_RED:    if (last) next = S_GREEN;
            default:  next = S_GREEN;      // the unused code 3 leads back to the start
        endcase
    end

    // Block 3. Output logic: depends only on the state (Moore machine).
    always @(*) begin
        case (state)
            S_GREEN:  lamp = 3'b001;
            S_YELLOW: lamp = 3'b010;
            default:  lamp = 3'b100;
        endcase
    end
endmodule
