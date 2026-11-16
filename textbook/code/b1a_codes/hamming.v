// Пример 5. Код Хэмминга (7,4): кодер и декодер как отдельные модули.
// Позиции 1..7: p1 p2 d1 p3 d2 d3 d4 (слово word[0] --- позиция 1).
module hamming_enc (
    input  [3:0] d,          // d[0]=d1, d[1]=d2, d[2]=d3, d[3]=d4
    output [6:0] word        // семь бит для канала
);
    wire p1 = d[0] ^ d[1] ^ d[3];   // p1 = d1 ^ d2 ^ d4 (позиции 1,3,5,7)
    wire p2 = d[0] ^ d[2] ^ d[3];   // p2 = d1 ^ d3 ^ d4 (позиции 2,3,6,7)
    wire p3 = d[1] ^ d[2] ^ d[3];   // p3 = d2 ^ d3 ^ d4 (позиции 4,5,6,7)
    assign word = {d[3], d[2], d[1], p3, d[0], p2, p1};
endmodule

module hamming_dec (
    input  [6:0] word,       // принятое слово, возможно с одной ошибкой
    output [2:0] syndrome,   // номер повреждённой позиции, 0 = ошибки нет
    output [3:0] d           // исправленные данные
);
    wire s1 = word[0] ^ word[2] ^ word[4] ^ word[6];    // проверка позиций 1,3,5,7
    wire s2 = word[1] ^ word[2] ^ word[5] ^ word[6];    // проверка позиций 2,3,6,7
    wire s3 = word[3] ^ word[4] ^ word[5] ^ word[6];    // проверка позиций 4,5,6,7
    assign syndrome = {s3, s2, s1};

    // перевернуть бит с номером syndrome (если syndrome = 0, ничего не меняется)
    wire [6:0] fixed = (syndrome == 3'd0) ? word : (word ^ (7'd1 << (syndrome - 3'd1)));
    assign d = {fixed[6], fixed[5], fixed[4], fixed[2]};   // позиции 7,6,5,3
endmodule
