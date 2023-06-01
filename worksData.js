//declaring class
class worksObject {
    constructor(name, expandable, client, source, ratio, date) {
        this.name = name;
        this.expandable = expandable;
        this.client = client;
        this.source = source;
        this.ratio = ratio;
        this.date = date;
    }
}
var worksGroupList = [];
worksGroupList = [
    new worksObject("仮面の告白", true, "", "works/kamennokokuhaku_book.png", 15, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("yukiguni", true, "", "works/yukiguni_book.png", 15, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("1912：文学奇迹之年", false, "中信大方", "works/1922.png", 21, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("去海上吧————2022西葡语文学节", false, "中信大方", "works/quhaishangba.png", 22, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("", false, "中信大方", "works/jianjia.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("", false, "中信大方", "works/pianruo.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0)),
    new worksObject("", false, "中信大方", "works/accent toutu.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0)),
];
//change the aspect ratios to the appriopriate numbers
console.log(worksGroupList.length + " works");
export const worksCollectionList = worksGroupList;
export { worksObject };
//# sourceMappingURL=worksData.js.map