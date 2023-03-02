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
   
    new typeObject(["hanzi"], "秋興八首", "type/qiuxingbashou.png", true, "#E4F0D3", "#1E2E07", "夔府孤城落日斜、每依北斗望京華", "———『秋興八首*其二』杜甫", new Date(2023, 1, 26, 0, 45, 0, 0)),
    new typeObject(["hanzi"], "陳勝吳廣", "type/chenshengwuguang.png", false, "#F7F0E6", "#61291C", "王侯將相寧有種乎", "———『史記*陳涉世家』司馬遷", new Date(2023, 1, 4, 14, 15, 0, 0)),
    new typeObject(["hanzi"], "落花流水", "type/luohualiushui.png", true, "#FBFCDD", "#E05D23", "水點蒸發變做白雲、花瓣飄落下游生根", "———『落花流水』黃偉文", new Date(2023, 1, 2, 1, 0, 0, 0)),
    new typeObject(["hanzi"], "相思", "type/xiangsi.png", true, "#F3E0B1", "#9C1F46", "紅豆生南國、春來發幾枝", "———『相思』王維", new Date(2023, 0, 27, 21, 25, 0, 0)),
    new typeObject(["hanzi"], "綿綿", "type/mianmian.png", true, "#F4F3ED", "#0C694B", "一次愉快的睡眠、斷多少髮線", "———『綿綿』林夕", new Date(2023, 0, 23, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "奔馬", "type/honba.png", false, "#F5DAB8", "#B20C08", "日輪は瞼の裏に赫奕と昇った", "———『豊饒の海*奔馬』三島由紀夫", new Date(2022, 10, 23, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana"], "春の雪", "type/harunoyuki.png", true, "#E4F4E9", "#27AD70", "二人の顔へ雪はじかに当たり", "———『豊饒の海*春の雪』三島由紀夫", new Date(2022, 10, 5, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "雲中君", "type/yunzhongjun.png", false, "#FFE0F2", "#1634B8", "思夫君兮太息、極勞心兮忡忡", "———『楚辭*九歌*雲中君』屈原", new Date(2022, 9, 28, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "山鬼", "type/shangui.png", false, "#29211D", "#F8FCEA", "若有人兮山之阿、披薜荔兮戴女羅", "———『楚辭*九歌*山鬼』屈原", new Date(2022, 9, 24, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "無衣", "type/wuyi.png", true, "#0A3470", "#FFEF45", "豈曰無衣、與子同袍", "———『詩經*秦風*無衣』", new Date(2022, 9, 24, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "紅豆", "type/hongdou.png", true, "#f9efcc", "#cc3825", "還沒爲你把紅豆、熬成纏綿的傷口", "———『紅豆』林夕", new Date(2022, 9, 21, 0, 0, 0, 0)),
    new typeObject(["kana"], "こころ", "type/kokoro.png", false, "#3CE8C6", "#1F172B", "私はその人を常に先生と呼んでいた", "———『こころ』夏目漱石", new Date(2022, 9, 22, 0, 0, 0, 0)),
    new typeObject(["latin"], "INFERNO", "type/inferno.png", false, "#f44914", "#000000", "Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura", "———『La Commedia Divina』Dante Alighieri", new Date(2022, 9, 16, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "蕪城賦", "type/wuchengfu.png", false, "#fcffe0", "#170c06", "觀基扃之固護，將萬祀而一君", "———『蕪城賦』鮑照", new Date(2022, 9, 8, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana", "latin"], "Ｋの弁天", "type/knobenten.png", true, "#f0ffff", "#3e0b6b", "影ほど不思議なものはない", "———『Kの弁天』梶井基次郎", new Date(2022, 9, 7, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "天人五衰", "type/tenningosui.png", true, "#ce1906", "#ffffff", "天人の五衰も目の前に見えてあさましや", "———『豊饒の海*天人五衰』三島由紀夫", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "雷峯塔", "type/leifengta.png", false, "#f9e532", "#000000", "雷峰颓塔紫烟中、潦倒斜曛似醉翁", "", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "濃妝淡抹", "type/nongzhuangdanmo.png", true, "#f7f5e2", "#f25e2f", "欲把西湖比西子，淡妝濃抹總相宜", "———『飲湖上初晴後雨二首*其二』蘇軾", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["latin"], "HAMLET", "type/hamlet.png", false, "#f9e532", "#000000", "O, from this time forth, my thoughts be bloody, or be nothing worth", "———『Hamlet』William Shakespeare", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi", "kana"], "吾輩は猫である", "type/wagahai.png", false, "#ed6d03", "#ffffff", "吾輩は猫である。名前はまだない。", "———『吾輩は猫である』夏目漱石", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "觀自在菩薩", "type/guanzizai.png", true, "#153513", "#ffffff", "觀自在菩薩，行深般若波羅蜜多時", "———『心經』", new Date(2022, 9, 4, 0, 0, 0, 0)),
    new typeObject(["hanzi"], "國殤", "type/guoshang.png", true, "#11f7af", "#000000", "操吳戈兮被犀甲，車錯轂兮短兵接", "———『楚辭*九歌*國殤』屈原", new Date(2022, 9, 4, 0, 0, 0, 0)),
];
var homepageTypeCount = 0;
typeGroupList.forEach(type => {
    if (type.homeDisplay) {
        homepageTypeCount++;
    }
});
console.log(homepageTypeCount + " types are on the homepage, \n" + typeGroupList.length + " types in total");
export const typeCollectionList = typeGroupList;
export { typeObject };
//test commend
////
//# sourceMappingURL=typeData.js.map
