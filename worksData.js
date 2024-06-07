//declaring class
class worksObject {
    constructor(name, media, expandable, client, source, ratio, date, desc) {
        this.name = name;
        this.media = media;
        this.expandable = expandable;
        this.client = client;
        this.source = source;
        this.ratio = ratio;
        this.date = date;
        this.desc = desc;
    }
}
var worksGroupList = [];
worksGroupList = [
    //new worksObject("Carraway", "西文字体 | Latin Typeface", false, "中信大方", "works/Carraway_typeface.png", 10, new Date(2024, 5, 28, 16, 20, 0, 0), "封面设计"),
    new worksObject("肖邦夜曲", "唱片封面 | Key Visual", true, "", "works/chopin_nocturnes.webp", 10, new Date(2024, 5, 28, 16, 20, 0, 0), "封面设计"),
    new worksObject("青年，以肉身进入世界", "主视觉海报 | Key Visual", false, "中信大方", "works/nvxingchengshiweilai.png", 21.6, new Date(2023, 12, 1, 20, 19, 0, 0), ""),
    new worksObject("拒绝所有的岸", "主视觉海报 | Key Visual", false, "中信大方", "works/jujuesuoyoudean.png", 21.6, new Date(2023, 2, 1, 20, 19, 0, 0), "封面设计，内书为新潮社『仮面の告白』"),
    new worksObject("仮面の告白", "书籍封面 | Book Cover", true, "", "works/kamennokokuhaku_book.png", 15, new Date(2023, 2, 1, 20, 19, 0, 0), "封面设计，内书为新潮社『仮面の告白』"),
    new worksObject("1922：文学奇迹之年", "主视觉海报 | Key Visual", false, "中信大方", "works/1922.png", 21, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
    new worksObject("去海上吧！2022西葡语文学节", "主视觉海报 | Key Visual", false, "中信大方", "works/quhaishangba.png", 22, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
    new worksObject("蒹葭蒼蒼", "主视觉海报 | Key Visual", false, "中信大方", "works/jianjia.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
    //new worksObject("", "活动主视觉", false, "中信大方", "works/pianruo.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
    new worksObject("重音社 Accent Society", "主视觉海报 | Key Visual", false, "中信大方", "works/accent toutu.webp", 14, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
    new worksObject("跳岛FM单集海报", "系列海报 | Poster Series", false, "中信大方", "works/tiaodao poster.webp", 15, new Date(2023, 2, 1, 20, 19, 0, 0), ""),
];
//change the aspect ratios to the appriopriate numbers
console.log(worksGroupList.length + " works");
export const worksCollectionList = worksGroupList;
export { worksObject };
//# sourceMappingURL=worksData.js.map
