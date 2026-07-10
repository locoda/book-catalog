# QUESTIONS.md — 编目疑点

## 词表提案

当前 217 个作品 `subjects: []` 未标主题词。建议新增以下受控词：

- 行为经济学 / 认知偏误
- 韩国社会议题
- 日语悬疑 / 推理
- 拉美文学
- 自我成长 / 自助
- 体育/竞技
- 当代英文小说（一般 Fiction）
- 日文 BL / 大众文学
- 非虚构随笔 / 纪实
- 回忆录
- 哲学入门
- 文学批评
- 艺术史 / 艺术评论
- 科普 / 自然科学
- 社会学
- 政治 / 法律
- 心理学
- 诗歌
- 后现代 / 实验小说
- 历史
- 书信集 / 访谈录
- 绘本 / 图像

## 文件级疑点

### 数据缺失
- [ai-lian] 一穂ミチ BL 作品，原题名、出版年、callno 均为 TODO，全字段待确认
- [kamakura-eki-toho-8-fun] 越智月子『鎌倉駅徒歩8分、空室あり』初版年标记为 2024（推测），日文原版年份未精准确认

### neodb_uuid 缺失（82 个文件）
以下 82 个文件由于批次写入时未保留原始 UUID，`neodb_uuid` 字段值为 `TODO`：
详细列表见 §UUID 缺失清单。

### 原题名推断（未核实日文/韩文原题）
以下作品的日文/韩文原题名是在著录过程中根据中文译名反向推断的，未对照原版书目核实：
- [kaibutsu-no-ori] 白井智之→「怪物の檻」（推断）
- [karada-wo-uru-onnatachi] 铃木凉美→「身体を売る女たち」（推断）
- [futtara-doshaburi] 一穂ミチ→「ふったらどしゃぶり」（推断）
- [sumoru-waruzu] 一穂ミチ→「スモールワールズ」（推断）
- [watashi-no-utsukushii-niwa] 凪良汐→「わたしの美しい庭」（推断）
- [daedosiui-sarangbeop-2] 朴相映→「대도시의 사랑법 2」（推断）
- [ilchawoni-doego-sipeo] 朴相映→「일차원이 되고 싶어」（推断）
- [sinroeui-moyang] 朴相映→「신뢰의 모양」（推断）
- [meonbada] 孔枝泳→「먼바다」（推断）
- [buru-sukai] 漥美澄→「ブルースカイ」（推断）
- [nakazuri] 朝比奈明日香→「中吊り」（推断）
- [tsubasa-no-hane] 朝比奈あすか→「翼の羽」（推断）
- [shiyu] 铃木凉美→「資優」（推断）
- [jiten-shinagara-koten] 山本文绪→「自転しながら公転する」（推断）
- [saigo-no-kogi] 西原理惠子→「最後の講義」（推断）
- [yube-no-kare-ashita-no-pan] 木皿泉→「昨夜のカレー、明日のパン」（推断）
- [kino-no-shokutaku] 角田光代→「昨日の食卓」（推断）
- [furuhonya-de] 角田光代→「古本屋で」（推断）

### 初版年推断（未查证）
以下作品的年份为在著录过程中根据中文版出版年反向推算，可能偏晚或偏早：
- [danke-heute-nicht] Cordula Nussbaum，推断 2021
- [daheim] Judith Hermann，推断 2021
- [hinode-koen-de] 青山美智子，推断 2024
- [minato-no-hotelu] 寺地春奈，推断 2022
- [kosaten] 白石一文，推断 2020
- [uogashi-no-nyaa] 西加奈子，推断 2014
- [eiri] 沼田真佑，推断 2017
- [shuten-no-shojo] 柚木麻子，推断 2017
- [shigoto-ga-mitsukaranai] 吉田修一，推断 2018
- [oishii-gohan-ga] 高瀨隼子，推断 2022
- [ohitorisama-no-saigo] 上野千鹤子，推断 2015

### 语言码修正记录（已执行，需馆长确认）
以下作品 orig_lang 从原始导入值修正，部分基于推断：
- tu-ran-xiang-qi-yi-zhen-qiao-men-sheng: zh-CN → he（Etgar Keret 希伯来语）
- tui-gao-tu-shu-guan: zh-CN → fr（David Foenkinos 法语）
- wai-mian-shi-xia-tian: zh-TW → ko（金愛爛 韩语）
- wai-po-de-dao-qian-xin: zh-CN → sv（Fredrik Backman 瑞典语）
- wan-shi-jie-xiao: ko → en（David Graeber 英语）
- wo-men-de-shi-dai: zh-CN → ja（濑尾麻衣子 日语）
- 等多批约 120 个文件 orig_lang 修正

### 多作者文件
以下作品有两个及以上 creators，需确认署名顺序是否与原版一致：
- [wo-men-lai-yi-sheng-cun-de-yin-yu] Lakoff + Johnson
- [futtara-doshaburi] 一穂ミチ + 竹美家らら
- [xue-hui-ti-wen] Browne + Keeley
- [yi-jian-shi-ke] Carmon + Knizhnik
- [wo-bu-hui-xie-xiao-shuo] 中田永一 + 中村航

### 语言异常：mine 版本语言不在封闭集（待馆长确认，未自动改动）
- [futtara-doshaburi] mine 版本 lang=ja（题名「ふったらどしゃぶり~When it rains, it pours~完全版」），不在 zh-Hans/zh-Hant/en 封闭集内
- [naito-gaden] mine 版本 lang=ja（题名「ナイトガーデン 完全版」），同上
- 两条记录均 `confirmed: true`，著者同为一穂ミチ+竹美家らら。是你确实读的日文原版，还是应该标记为另一个语言版本？若确实读日文原版，需要馆长决定是否放开封闭集（改规则）还是把这两条标为特例。

### 已解决
- ~~[jin-kao-xiang-de-hao-ri-zi] 李佳穎《進烤箱的好日子》，台湾誠品/博客來原版，繁体中文原创（非译作），获2025台北国际书展大奖小说类首奖~~ orig_lang zh-Hans → zh-Hant；title/expression 题名简体"进"→繁体"進"；people/li-jiaying.yaml 的 zh 表记 李佳颖 → 李佳穎（馆长指出后核实修正，年份2024本身无误）
- ~~语言标签迁移：全库 orig_lang / expressions[].lang / readings[].lang 中的 zh-CN → zh-Hans、zh-TW → zh-Hant（461 个 work 文件，共 426 处取值），改用 BCP47 文字子标签区分简繁~~
- ~~[cuentos-de-amor-de-locura] orig_lang=es~~ v0.3 新增 O 分类
- ~~[agonie-des-eros] orig_lang=de~~ 同上
- ~~[bai] 与 bai-jin-shu-ju 重复，已删除~~
- ~~[audition] 出版年已确认 2025~~
- ~~people 重复：gail-honeyman, susan-sontag, cha-theresa, fredrik-backman, dubravka-ugresic, paulo-coelho, jason-roberts 7 组重复已合并删除~~
- ~~people 缺 sort：erich-fromm, maggie-nelson, rf-kuang 已补充~~
- ~~语言码统一：zh-cn→zh-CN, zh-tw→zh-TW, zh→zh-CN, romaji→Latn, no→nb~~
- ~~作者 ID 统一为 lastname-firstname：92 个重命名~~
- ~~英文 subjects 全部清理，仅保留受控词表中 13 个中文词~~
