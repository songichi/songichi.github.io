//
class zi {
    constructor(zifu, strokes, base) {
        this.zifu = zifu;
        this.strokes = strokes;
        this.base = base;
    }
}
var hanziGroupList = [
    [new zi("大", 3, "大"), new zi("眔", 10, "大")],
    [new zi("小", 3, "小"), new zi("皛", 15, "小")],
    [new zi("心", 3, "心"), new zi("杺", 13, "心")],
    [new zi("就", 12, "就"), new zi("丩", 2, "就")],
    [new zi("無", 12, "無"), new zi("无", 4, "無")],
    [new zi("土", 3, "土"), new zi("嵞", 13, "土")],
    [new zi("會", 3, "會"), new zi("会", 13, "會")],
    [new zi("其", 8, "其"), new zi("丌", 3, "其")],
    [new zi("着", 11, "着"), new zi("丆", 2, "着"), new zi("著", 12, "着")],
    [new zi("的", 8, "的"), new zi("彐", 3, "的")],
    [new zi("得", 11, "得"), new zi("丷", 2, "得")],
    [new zi("有", 6, "有"), new zi("屮", 3, "有")],
];
export const hanziGroups = hanziGroupList;
export { zi };
//# sourceMappingURL=hanziData.js.map
