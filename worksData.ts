//declaring class
class worksObject {
    name: string;
    media: string
    expandable: boolean;
    client: string;
    source: string;
    ratio: number;
    date: Date;
    desc: string;
    
    
  
    constructor(
      name: string,
      media: string,
      expandable: boolean,
      client: string,
      source: string,
      ratio: number,
      date: Date,
      desc: string,
      

    ) {
      this.name = name;
      this.media = media
      this.expandable = expandable;
      this.client = client;
      this.source = source;
      this.ratio = ratio;
      this.date = date;
      this.desc = desc;
      
      
    }
  }
  var worksGroupList: worksObject[] = [];
  
  worksGroupList = [
    //new worksObject("Carraway", "西文字体 | Latin Typeface", false, "中信大方", "works/Carraway_typeface.png", 5, new Date(2023, 2, 1, 20, 19, 0, 0), "封面设计，内书为新潮社『仮面の告白』"),
    new worksObject("拒绝所有的岸", "主视觉海报 | Key Visual", false, "中信大方", "works/jujuesuoyoudean.png", 21.6, new Date(2023, 2, 1, 20, 19, 0, 0), "封面设计，内书为新潮社『仮面の告白』"),
    new worksObject("仮面の告白", "书籍封面 | Book Cover",true, "", "works/kamennokokuhaku_book.png", 15, new Date(2023, 2, 1, 20, 19, 0, 0), "封面设计，内书为新潮社『仮面の告白』"),
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