//declaring class
class mazurka {
    constructor(opus, number, tempo, length, key, keyIndex, segmentNum) {
        this.opus = opus;
        this.number = number;
        this.tempo = tempo;
        this.length = length;
        this.key = key;
        this.keyIndex = keyIndex;
        this.segmentNum = segmentNum;
    }
}


var mazurkaList = [];

//data for mazurkas
mazurkaList = [
    new mazurka(50, 1, 156, 155, true, 1, 120),
    new mazurka(50, 2, 100, 193, true, 8, 120),
    new mazurka(50, 3, 108, 325, false, 4, 180),
    new mazurka(56, 1, 120, 266, true, 5, 216),
    new mazurka(56, 2, 156, 324, true, 0, 84),
    new mazurka(56, 3, 108, 352, false, 9, 216),
    //new typeObject(["hanzi"], "曖昧", "type/aimei.png", true, "#EDDDC3", "#D64D6A", "徘徊在似苦又甜之间、望不穿这暖昧的眼", "———『曖昧』林夕", new Date(2023, 2, 1, 20, 19, 0, 0)),
   
];

var mazurkaCount = 0;
// mazurkaList.forEach(type => {
//     if (true) {
//         mazurkaCount++;
//     }
// });
console.log("mazurkaCount");
console.log(" mazurkas: " + mazurkaList.length);

window.mazurkaData = {
    data:  mazurkaList,
  };
window.mazurka = mazurka;
// export const mazurkaCollection = mazurkaList;
// export { mazurka };
//test commen,
////
//# sourceMappingURL=typeData.js.map