//declaring class
class typeObject {
    constructor(language, name, image, homeDisplay, color, colorS, quote, source, date) {
        this.language = language;
        this.name = name;
        this.image = image;
        this.homeDisplay = homeDisplay;
        this.color = color;
        this.colorS = colorS;
        this.quote = quote;
        this.source = source;
        this.date = date;
    }
}
var typeGroupList = [];
//data for types
typeGroupList = [
    new typeObject(["kana"], "こころ", "type/kokoro.png", false, "#033694", "#F7EDF4", "私はその人を常に先生と呼んでいた", "———『こころ』夏目漱石", new Date(2022, 10, 22, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "紅豆", "type/hongdou.png", true, "#f9efcc", "#cc3825", "還沒爲你把紅豆、熬成纏綿的傷口", "———『紅豆』林夕", new Date(2022, 10, 21, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana"], "もののけ姫", "type/mononokehime.png", true, "#c9f2c7", "#171f17", "はりつめた弓の、ふるえる弦よ", "———『もののけ姫』宮崎駿", new Date(2022, 10, 20, 0, 0, 0, 0)),
    new typeObject(["latin"], "INFERNO", "type/inferno.png", false, "#f44914", "#000000", "Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura", "———『La Commedia Divina』Dante Alighieri", new Date(2022, 10, 16, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "蕪城賦", "type/wuchengfu.png", false, "#fcffe0", "#170c06", "觀基扃之固護，將萬祀而一君", "———『蕪城賦』鮑照", new Date(2022, 10, 8, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana", "latin"], "Ｋの弁天", "type/knobenten.png", true, "#f0ffff", "#3e0b6b", "影ほど不思議なものはない", "———『Kの弁天』谷崎潤一郎", new Date(2022, 10, 7, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "天人五衰", "type/tenningosui.png", true, "#ce1906", "#ffffff", "天人の五衰も目の前に見えてあさましや", "———『天人五衰』三島由紀夫", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "雷峯塔", "type/leifengta.png", false, "#f9e532", "#000000", "雷峰颓塔紫烟中、潦倒斜曛似醉翁", "", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "濃妝淡抹", "type/nongzhuangdanmo.png", true, "#f7f5e2", "#f25e2f", "欲把西湖比西子，淡妝濃抹總相宜", "———『飲湖上初晴後雨二首·其二』蘇軾", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["latin"], "HAMLET", "type/hamlet.png", false, "#f9e532", "#000000", "O, from this time forth, my thoughts be bloody, or be nothing worth!", "———『Hamlet』William Shakespeare", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana"], "吾輩は猫である", "type/wagahai.png", false, "#ed6d03", "#ffffff", "吾輩は猫である。名前はまだない。", "———『吾輩は猫である』夏目漱石", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "觀自在菩薩", "type/guanzizai.png", true, "#153513", "#ffffff", "觀自在菩薩，行深般若波羅蜜多時", "———『心經』", new Date(2022, 10, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "國殤", "type/guoshang.png", true, "#11f7af", "#000000", "操吳戈兮被犀甲，車錯轂兮短兵接", "———『國殤』屈原", new Date(2022, 10, 4, 0, 0, 0, 0)),
];
export const typeCollectionList = typeGroupList;
export { typeObject };
//test commend
////
//# sourceMappingURL=typeData.js.map