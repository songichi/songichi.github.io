/**
 * 默认字库 · 草体（Zi 结构）
 * 编辑本文件维护字、异体、书法家与出处。
 * 每条须含 unicode（U+XXXX）；id 由 dup 在加载时自动生成（默认 dup=1）。
 */

const CAO_ZI_DEFAULTS = {
  style: 'cao',
  calligrapher: '未录入',
  work: '未录入',
};

/** 简写：创建一条草体 Zi（unicode 未写时由 char 自动补全） */
function caoZi(char, extras = {}) {
  const cp = char.codePointAt(0) || 0;
  const unicode = extras.unicode || `U+${cp.toString(16).toUpperCase()}`;
  const codePoint = extras.codePoint || cp;
  return createZi({ char, codePoint, unicode, ...CAO_ZI_DEFAULTS, ...extras });
}

/**
 * 默认草体字库（顺序即练习默认顺序）
 * alternatives：常见简繁 / 异体；未列则仅主字
 * 所有unicode必须为正确unicode！！！
 */
const DEFAULT_ZI_CAO = createZiList([
  caoZi('是', { unicode: 'U+662F', calligrapher: '孙过庭', work: '书谱' }),
  caoZi('地', { unicode: 'U+5730' }),
  caoZi('明', { unicode: 'U+660E' }),
  caoZi('有', { unicode: 'U+6709' }),
  caoZi('示', { unicode: 'U+793A' }),

  caoZi('心', { unicode: 'U+5FC3' }),
  caoZi('長', { unicode: 'U+9577', alternatives: ['长'] }),
  caoZi('分', { unicode: 'U+5206' }),
  caoZi('令', { unicode: 'U+4EE4' }),
  caoZi('專', { unicode: 'U+5C08', alternatives: ['专'] }),
  caoZi('風', { unicode: 'U+98A8', alternatives: ['风'] }),
  caoZi('相', { unicode: 'U+76F8' }),
  caoZi('須', { unicode: 'U+9808', alternatives: ['须'] }),
  caoZi('与', { unicode: 'U+4E0E', alternatives: ['與'] }),
  caoZi('使', { unicode: 'U+4F7F' }),
  caoZi('即', { unicode: 'U+5373' }),
  caoZi('所', { unicode: 'U+6240' }),
  caoZi('解', { unicode: 'U+89E3' }),
  caoZi('節', { unicode: 'U+7BC0', alternatives: ['节'] }),
  caoZi('等', { unicode: 'U+7B49' }),
  caoZi('問', { unicode: 'U+554F', alternatives: ['问'] }),
  caoZi('包', { unicode: 'U+5305' }),
  caoZi('五', { unicode: 'U+4E94' }),
  caoZi('交', { unicode: 'U+4EA4' }),
  caoZi('此', { unicode: 'U+6B64' }),

  caoZi('聞', { unicode: 'U+805E', alternatives: ['闻'] }),
  caoZi('猶', { unicode: 'U+7336', alternatives: ['犹'] }),
  caoZi('服', { unicode: 'U+670D' }),
  caoZi('器', { unicode: 'U+5668' }),
  caoZi('章', { unicode: 'U+7AE0' }),
  caoZi('甚', { unicode: 'U+751A' }),
  caoZi('鳥', { unicode: 'U+9CE5', alternatives: ['鸟'] }),
  caoZi('永', { unicode: 'U+6C38' }),
  caoZi('成', { unicode: 'U+6210' }),
  caoZi('既', { unicode: 'U+65E2' }),
  caoZi('記', { unicode: 'U+8A18', alternatives: ['记'] }),
  caoZi('欲', { unicode: 'U+6B32' }),
  caoZi('乖', { unicode: 'U+4E56' }),
  caoZi('具', { unicode: 'U+5177' }),
  caoZi('劳', { unicode: 'U+52B3', alternatives: ['勞'] }),
  caoZi('属', { unicode: 'U+5C5E', alternatives: ['屬'] }),
  caoZi('巨', { unicode: 'U+5DE8' }),
  caoZi('高', { unicode: 'U+9AD8' }),
  caoZi('温', { unicode: 'U+6E29', alternatives: ['溫'] }),
  caoZi('前', { unicode: 'U+524D' }),

  caoZi('謂', { unicode: 'U+8B02', alternatives: ['谓'] }),
  caoZi('去', { unicode: 'U+53BB' }),
  caoZi('還', { unicode: 'U+9084', alternatives: ['还'] }),
  caoZi('常', { unicode: 'U+5E38' }),
  caoZi('則', { unicode: 'U+5247', alternatives: ['则'] }),
  caoZi('莫', { unicode: 'U+83AB' }),
  caoZi('衆', { unicode: 'U+8846', alternatives: ['众'] }),
  caoZi('单', { unicode: 'U+5355', alternatives: ['單'] }),
  caoZi('逢', { unicode: 'U+9022' }),
  caoZi('卒', { unicode: 'U+5352' }),
  caoZi('斷', { unicode: 'U+65B7', alternatives: ['断'] }),
  caoZi('設', { unicode: 'U+8A2D', alternatives: ['设'] }),
  caoZi('流', { unicode: 'U+6D41' }),
  caoZi('盡', { unicode: 'U+76E1', alternatives: ['尽'] }),
  caoZi('孤', { unicode: 'U+5B64' }),
  caoZi('望', { unicode: 'U+671B' }),
  caoZi('術', { unicode: 'U+8853', alternatives: ['术'] }),
  caoZi('色', { unicode: 'U+8272' }),
  caoZi('直', { unicode: 'U+76F4' }),
  caoZi('斯', { unicode: 'U+65AF' }),



  /** 以上有些unicode不对，以下都是对的 */

  caoZi('或', { unicode: 'U+6216' }),
  caoZi('顯', { unicode: 'U+986F', alternatives: ['显'] }),
  caoZi('老', { unicode: 'U+8001' }),
  caoZi('疑', { unicode: 'U+7591' }),
  caoZi('說', { unicode: 'U+8AAA', alternatives: ['说'] }),
  caoZi('揔', { unicode: 'U+63D4' }),
  caoZi('酸', { unicode: 'U+9178' }),
  caoZi('識', { unicode: 'U+8B58', alternatives: ['识'] }),
  caoZi('湌', { unicode: 'U+6E4C' }),
  caoZi('務', { unicode: 'U+52D9', alternatives: ['务'] }),
  caoZi('異', { unicode: 'U+7570', alternatives: ['异'] }),
  caoZi('處', { unicode: 'U+8655', alternatives: ['处'] }),
  caoZi('然', { unicode: 'U+7136' }),
  caoZi('對', { unicode: 'U+5C0D', alternatives: ['对'] }),
  caoZi('州', { unicode: 'U+5DDE' }),
  caoZi('區', { unicode: 'U+5340', alternatives: ['区'] }),
  caoZi('外', { unicode: 'U+5916' }),
  caoZi('創', { unicode: 'U+5275', alternatives: ['创'] }),
  caoZi('嚴', { unicode: 'U+56B4', alternatives: ['严'] }),
  caoZi('歸', { unicode: 'U+6B78', alternatives: ['归'] }),


  caoZi('在', { unicode: 'U+5728' }),
  caoZi('遊', { unicode: 'U+904A', calligrapher: '王羲之', work: '遊目帖' }),
  caoZi('當', { unicode: 'U+7576', alternatives: ['当'] }),
  caoZi('頭', { unicode: 'U+982D', alternatives: ['头'] }),
  caoZi('尋', { unicode: 'U+5C0B',  alternatives: ['寻'], calligrapher: '孙过庭', work: '书谱' }),
  caoZi('動', { unicode: 'U+52D5',  alternatives: ['动'], calligrapher: '孙过庭', work: '书谱' }),
  caoZi('非', { unicode: 'U+975E', calligrapher: '孙过庭', work: '书谱' }),
  caoZi('继', { unicode: 'U+7EE7', calligrapher: '孙过庭', work: '书谱' }),
  caoZi('虚', { unicode: 'U+865A', alternatives: ['虛'], calligrapher: '孙过庭', work: '书谱' }),
  caoZi('果', { unicode: 'U+679C',  calligrapher: '孙过庭', work: '书谱' }),
  
  caoZi('段', { unicode: 'U+6BB5',  calligrapher: '王羲之', work: '淳化阁帖' }),
  caoZi('差', { unicode: 'U+5DEE',  calligrapher: '孙过庭', work: '书谱'}),
  caoZi('宜', { unicode: 'U+5B9C',  calligrapher: '孙过庭', work: '书谱'}),
  caoZi('質', { unicode: 'U+8CEA',  alternatives: ['质'], calligrapher: '孙过庭', work: '书谱'}),
  caoZi('適', { unicode: 'U+9069',  alternatives: ['适'], calligrapher: '孙过庭', work: '书谱'}),
  caoZi('寫', { unicode: 'U+5BEB',  alternatives: ['写'], calligrapher: '孙过庭', work: '书谱'}),
  caoZi('勝', { unicode: 'U+52DD',  alternatives: ['胜'], calligrapher: '孙过庭', work: '书谱'}),
  caoZi('改', { unicode: 'U+6539',  calligrapher: '孙过庭', work: '书谱'}),
  caoZi('綵', { unicode: 'U+7DB5',  alternatives: ['綵'], calligrapher: '懷素', work: '停云馆帖'}),
  caoZi('遠', { unicode: 'U+9060',  alternatives: ['远'], calligrapher: '孙过庭', work: '书谱'}),
  
  caoZi('皆', { unicode: 'U+7686', calligrapher: '懷素', work: '真草千字文'}),
  caoZi('合', { unicode: 'U+5408', calligrapher: '孙过庭', work: '书谱'}),
  caoZi('憂', { unicode: 'U+6182', alternatives: ['忧'], calligrapher: '王羲之', work: '远宦帖'}),
  caoZi('淺', { unicode: 'U+6DFA', alternatives: ['浅'], calligrapher: '王羲之', work: '大觀帖'}),
  caoZi('圖', { unicode: 'U+5716', alternatives: ['图'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('軟', { unicode: 'U+8EDF', alternatives: ['软'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('度', { unicode: 'U+5EA6',  calligrapher: '王羲之', work: '十七帖'}),
  caoZi('超', { unicode: 'U+8D85',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('朝', { unicode: 'U+671D',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('義', { unicode: 'U+7FA9', alternatives: ['义'], calligrapher: '孫過庭', work: '書譜'}),
  
  caoZi('漢', { unicode: 'U+6F22', alternatives: ['汉'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('深', { unicode: 'U+6DF1', calligrapher: '孫過庭', work: '書譜'}),
  caoZi('取', { unicode: 'U+53D6', calligrapher: '孫過庭', work: '書譜'}),
  caoZi('致', { unicode: 'U+81F4', calligrapher: '孫過庭', work: '書譜'}),
  caoZi('都', { unicode: 'U+90FD', calligrapher: '王羲之', work: '遊目帖'}),
  caoZi('亂', { unicode: 'U+4E82',  alternatives: ['乱','亂'], calligrapher: '王羲之', work: '淳化阁帖'}),
  caoZi('慮', { unicode: 'U+616E',  alternatives: ['虑'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('幸', { unicode: 'U+5E78',  calligrapher: '王羲之', work: '淳化阁帖'}),
  caoZi('曲', { unicode: 'U+66F2',  calligrapher: '趙孟頫', work: '停云馆法帖'}),
  caoZi('邊', { unicode: 'U+908A',  alternatives: ['边'], calligrapher: '王羲之', work: '草诀百韵歌'}),
  
  caoZi('列', { unicode: 'U+5217',  calligrapher: '王羲之', work: '草诀百韵歌'}),
  caoZi('假', { unicode: 'U+5047',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('業', { unicode: 'U+696D',  alternatives: ['业'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('陪', { unicode: 'U+966A',  calligrapher: '邊武', work: '邊武草書千字文'}),
  caoZi('亮', { unicode: 'U+4EAE',  calligrapher: '米芾', work: '英光堂米帖上'}),
  caoZi('曾', { unicode: 'U+66FE',  alternatives: ['曽'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('興', { unicode: 'U+8208',  alternatives: ['兴'], calligrapher: '王羲之', work: '淳化阁帖'}),
  caoZi('金', { unicode: 'U+91D1',  calligrapher: '王羲之', work: '絳帖'}),
  caoZi('華', { unicode: 'U+83EF',  alternatives: ['华'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('遙', { unicode: 'U+9059',  alternatives: ['遥'], calligrapher: '趙孟頫', work: '真草千字文卷'}),
  
  caoZi('稱', { unicode: 'U+7A31',  alternatives: ['称'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('貫', { unicode: 'U+8CAB',  alternatives: ['贯'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('門', { unicode: 'U+9580',  alternatives: ['门'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('藏', { unicode: 'U+85CF',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('衡', { unicode: 'U+8861',  calligrapher: '趙孟頫', work: '歸去來兮並序'}),
  caoZi('製', { unicode: 'U+88FD',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('體', { unicode: 'U+9AD4',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('却', { unicode: 'U+5374',  alternatives: ['卻'], calligrapher: '趙孟頫', work: '致民瞻書札'}),
  caoZi('考', { unicode: 'U+8003',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('類', { unicode: 'U+985E',  alternatives: ['类'], calligrapher: '孫過庭', work: '書譜'}),
  
  caoZi('居', { unicode: 'U+5C45',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('齊', { unicode: 'U+9F4A',  alternatives: ['齐'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('營', { unicode: 'U+71DF',  alternatives: ['营'], calligrapher: '懷素', work: '懷素草書千字文'}),
  caoZi('駭', { unicode: 'U+99ED',  alternatives: ['骇'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('書', { unicode: 'U+66F8',  alternatives: ['书'], calligrapher: '孫過庭', work: '書譜'}),
  caoZi('意', { unicode: 'U+610F',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('要', { unicode: 'U+8981',  calligrapher: '孫過庭', work: '書譜'}),
  caoZi('反', { unicode: 'U+53CD',  calligrapher: '孫過庭', work: '書譜'}),


]);

/** id 在 database.js 加载 catalog 时由 unicode + dup 自动生成 */

/** 草体 catalog → practice entries */
function getDefaultZiCaoEntries() {
  return DEFAULT_ZI_CAO.map((zi) => zi.toEntry());
}

/** 草体主字顺序（设置面板 / localStorage 用） */
function getDefaultCaoCharList() {
  return DEFAULT_ZI_CAO.map((zi) => zi.char);
}
