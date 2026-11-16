// Moore finite-state machine: traffic light (chapter "Synchronous Circuits, State Machines and Memory").
// Green is on for 4 clock cycles, yellow for 2, red for 4. The outputs depend only on the state.
module traffic_fsm (
    input            clk,
    input            rst,
    output reg [2:0] lamp,    // {red, yellow, green}
    output reg [1:0] state
);
    localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;

    reg [2:0] t;              // how many clock cycles have passed in the state

    // State memory and transition logic
    always @(posedge clk) begin
        if (rst) begin
            state <= GREEN;
            t     <= 3'd0;
        end else begin
            t <= t + 3'd1;
            case (state)
                GREEN:  if (t == 3'd3) begin state <= YELLOW; t <= 3'd0; end
                YELLOW: if (t == 3'd1) begin state <= RED;    t <= 3'd0; end
                RED:    if (t == 3'd3) begin state <= GREEN;  t <= 3'd0; end
                default: state <= GREEN;
            endcase
        end
    end

    // Moore outputs: depend only on the state
    always @* begin
        case (state)
            GREEN:   lamp = 3'b001;
            YELLOW:  lamp = 3'b010;
            default: lamp = 3'b100;
        endcase
    end
endmodule
