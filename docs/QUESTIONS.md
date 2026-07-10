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

## 阅读日期（readings[].date）疑似大面积占位假数据 —— 重要，需馆长决定如何处理

审计 orig_lang/year 时意外发现：全库 `readings[].date` 里有 **7 个日期被 ≥3 本毫不相关的书共用**，共涉及 **160 条阅读记录**（461 部作品里差不多每 3 本就有 1 本中招）。最典型的几个：

- `2025-03-01`：76 本书共用同一天
- `2020-05-01`：41 本书共用同一天
- `2022-01-01`：26 本书共用同一天

这些日期大概率是 NeoDB 批量导入时的系统占位符（不是你真实标记的阅读日期），而不是巧合。证据之一：本轮核实 `le-jeune-homme`（Annie Ernaux《Le jeune homme》，2022年出版）和`machi-to-sono-futashika-na-kabe`（村上春树《街とその不確かな壁》，2023年出版）两本完全不相关的书，"最早阅读记录"都精确到"2020-05-01"同一天——而这两本书 2020 年时都还没出版，不可能那时候读过。

**按 TASK.md/CATALOGING.md 的规则，`readings` 是"事实数据，原样保留，不修改不删除"，所以本轮没有动这些字段，只做记录。** 但这意味着：目前网站上凡是依赖 readings 日期算出来的信息（作者页"阅读 20xx–20xx"统计、按年份排序等）在这 160 条记录上都是不可信的。README 里说"标了 `placeholder: true` 的条目阅读事件是示意数据"，但这 160 条里没有一条实际标了 `placeholder: true`——也就是说占位数据没有被正确标记，混进了"事实数据"里。

建议馆长决定：(a) 这些日期是否还能找回真实值（比如从 NeoDB/微信读书原始导出里重新核对），(b) 找不回的话是否应该统一打上 `placeholder: true` 并在页面上做区分，还是 (c) 暂时保持现状、以后遇到再逐条修。这个决定超出编目规则覆盖范围，需要人来定。

## 文件级疑点

### 数据缺失
- [kamakura-eki-toho-8-fun] 越智月子『鎌倉駅徒歩8分、空室あり』初版年标记为 2024（推测），日文原版年份未精准确认

### neodb_uuid 缺失（82 个文件）
以下 82 个文件由于批次写入时未保留原始 UUID，`neodb_uuid` 字段值为 `TODO`：
详细列表见 §UUID 缺失清单。（部分已在后台被其他流程回填，具体以文件实际值为准。）

### 原题名推断 / 初版年推断 —— 联网核实结果（本轮已修正，标注来源见下）
上一轮"根据中文译名反推日文/韩文原题"和"根据中文版年份反推初版年"的做法，经联网核实发现**约七成存在明显错误**——不少原题是被凭空拼出来的、和真实书名毫无关系；这不是简单的用字/年份误差，而是系统性地"编造了看起来合理但不存在的原题"，违反了"不猜"的禁令。现已逐条核实修正（书名/年份，来源为出版社官网/日亚/教保文库/알라딘/Gallimard 等一手书目页），批末汇报另附来源明细：

- [kaibutsu-no-ori] 「怪物の檻」（虚构，无此书）→ 修正为『ぼくは化け物きみは怪物』，2024
- [karada-wo-uru-onnatachi] 「身体を売る女たち」（虚构，与同作者另一本书混淆）→ 修正为『愛と子宮に花束を　夜のオネエサンの母娘論』，2017
- [sumoru-waruzu] 书名『スモールワールズ』本身准确，年份 2022 → 修正为 2021（单行本初版年，2022 查无来源）
- [watashi-no-utsukushii-niwa] 书名『わたしの美しい庭』准确，年份 2023 → 修正为 2019
- [daedosiui-sarangbeop-2] 「대도시의 사랑법 2」（虚构续作，实际无"2"这一分册）→ 修正为『대도시의 사랑법』（2019 연작소설集，mine 版本对应其中收录的短篇《재희》），年份 2022 → 2019
- [ilchawoni-doego-sipeo] 核实无误，书名、2021 均准确
- [sinroeui-moyang] 「신뢰의 모양」（虚构）→ 修正为『믿음에 대하여』，年份 2022 本身无误
- [meonbada] 「먼바다」书写有误（连写）→ 修正为『먼 바다』（空格），年份 2020 无误
- [buru-sukai] 「ブルースカイ」（虚构，与同作者另一本书混淆）→ 修正为『ぼくは青くて透明で』，2023 → 2024；顺带发现 mine 版本题名"湛藍透明的我"是繁体字却误标 zh-Hans，已订正为 zh-Hant；作者罗马字/假名转写"Kubomi Sumire/くぼみすみれ"经核实为误读，正确应为"Kubo Misumi/くぼ みすみ"（窪美澄），已将 people/kubomi-sumire.yaml 更名为 people/kubo-misumi.yaml 并同步更新引用
- [nakazuri] 「中吊り」核实无误
- [tsubasa-no-hane] 「翼の羽」（虚构）→ 修正为『翼の翼』，2023 → 2021。⚠️ 文件名/slug 因 confirmed 冻结未同步改名，slug "tsubasa-no-hane"（翼の羽的罗马字）与订正后题名"翼の翼"不再对应，馆长如需一致需手动解冻改名
- [shiyu] 「資優」（中文版书名误当日文原题）→ 修正为『ギフテッド』，2023 → 2022（第167回芥川赏入围作）
- [jiten-shinagara-koten] 书名准确，年份 2022（文库年）→ 修正为 2020（新潮社单行本初版年）
- [saigo-no-kogi] 核实无误，『最後の講義』2020 准确
- [yube-no-kare-ashita-no-pan] 核实无误，2013 准确
- [kino-no-shokutaku] 「昨日の食卓」（张冠李戴到角田光代另一本书）→ 修正为『ゆうべの食卓』，2024 → 2023；mine 版本题名"昨夜的餐桌風景"为繁体却误标 zh-Hans，已订正为 zh-Hant
- [furuhonya-de] 「古本屋で」（张冠李戴）→ 修正为『さがしもの』，2023 → 2005；mine 版本题名"在舊書店重逢"同样繁体误标 zh-Hans，已订正为 zh-Hant
- [danke-heute-nicht] Cordula Nussbaum，德文原书查无《Danke, heute nicht》，内容比对高度疑似对应『LMAA – 66 Miniplädoyers für mehr Mut, Leichtigkeit und Gelassenheit』（Gabal Verlag，2018）但未找到中文版版权页直接确证，**暂未修改**，需馆长手上有中文版实体书核对版权页后确认
- [daheim] Judith Hermann，核实无误，2021 准确
- [hinode-koen-de] 「日の出公園で」（虚构）→ 修正为『リカバリー・カバヒコ』，2024 → 2023
- [minato-no-hotelu] 「港のホテルの中庭で」（虚构）→ 修正为『ミナトホテルの裏庭には』，2022 → 2016
- [kosaten] 「交差点」（虚构）→ 修正为『かさなりあう人へ』，2020 → 2023
- [uogashi-no-nyaa] 「魚河岸のにゃあ」（虚构）→ 修正为『漁港の肉子ちゃん』，2014 → 2011。⚠️ mine 版本题名"鱼河岸小店"未找到与该书对应的官方中文版信息来源，是否为同一本书的简体版本待确认，暂保留原值未动
- [eiri] 核实无误，『影裏』2017 准确（第157回芥川赏）
- [shuten-no-shojo] 「終点の少女」（张冠李戴）→ 修正为『終点のあの子』，2017 → 2010
- [shigoto-ga-mitsukaranai] 「仕事が見つからない一年」（张冠李戴/虚构）→ 修正为『続 横道世之介』，2018 → 2019
- [oishii-gohan-ga] 核实无误，『おいしいごはんが食べられますように』2022 准确（第167回芥川赏）
- [ohitorisama-no-saigo] 核实无误，2015 准确
- [balgeun-bam] 年份 2021 核实无误；最早阅读记录 2020-07-01 早于出版年的矛盾，成因是阅读日期为占位假数据（见下方"阅读日期占位数据"条目），非 year 错误
- [hai-bian-de-fang-jian] 黄丽群《海邊的房間》原版为 2012 台湾联合文学初版（繁体），原年份 2021 实为简体重版年份，已修正为 2012；书名本身简繁混书（题名用简体"边"），已订正为繁体"海邊的房間"
- [kioku-shoten] 『記憶書店』为简称，实际全名『記憶書店うたかた堂の淡々』，已补全；年份 2022 查无对应版本，讲谈社单行本实为 2020，已修正
- [le-jeune-homme] Annie Ernaux，年份 2022 核实无误（Gallimard 2022-05-05）；最早阅读记录 2020-05-01 早于出版年的矛盾，成因是阅读日期为占位假数据
- [machi-to-sono-futashika-na-kabe] 村上春樹，年份 2023 核实无误（新潮社 2023-04-13）；最早阅读记录 2020-05-01（与 le-jeune-homme 完全相同的占位日期）早于出版年的矛盾，成因同上
- [sarajigo-sipeun-nal] 김진솔（笔名 니나킴），원판为2016年콜라보出版社初版，年份 2023 实为台版"新增彩蛋版"重印年，已修正为 2016
- [ai-lian] 全字段 TODO → 通过 neodb_uuid 反查确认为一穂ミチ『ラブ〜キス2〜』（新書館ディアプラス文庫，2019），是『キス』（2017）的续作第2卷；已补全 title/year/expressions/callno（JF-ICH-2019-AI）。馆内暂无『キス』第1卷记录，馆长如收藏可另行编目
- [daedosiui-sarangbeop-2] 见上（已与"原题名推断"合并说明）

以上均为一次性联网核实批次的结果，来源清单较长，未逐条罗列在本文件中，如需可要求补充详细引用。

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

### 重复 work 记录（已合并）
- ~~[huin] 与 [huin-2] 重复~~ 两条记录都是韩江《흰》(2016)，只是"mine"版本不同（huin=简体《失语者》2022-01-01读，huin-2=繁体《白》2025-01-01读），callno 撞车（都是 OF-HAN-2016-HUIN，是这次跑 callno 唯一性校验时发现的）。按 schema 本就支持"读过多个版本可多个 mine"，已合并进 huin.yaml（两个 mine 版本 + 两条 readings 都保留），删除 huin-2.yaml。huin-2 的 neodb_uuid（7Zzb00mceTenPcRNdAzsad）随文件删除丢失，只保留了 huin 的 uuid，馆长如需两个 uuid 都留痕请告知。

### 人物权威记录：name 字段误写成原文/中文（已修正为规范英文惯称）
馆长指出"上野千鶴子、角田光代、村上龍显示中文，作者名是不是该跟着阅读版本走"——回答：不应该，`name` 字段按 §3 规则应恒定为英文惯称，与你读的是哪个语言版本无关（不然同一作者会在不同作品页显示不同名字）。核查全库发现 8 条 `name` 字段误写成日文/韩文/中文原文，不符合规范，已按"英译本署名 / 系统音译（姓名罗马字，名 姓 西式序）"修正：
- ~~[cho-namjoo] 조남주 → Cho Nam-Joo（sort 同步补逗号：Cho, Nam-Joo）~~
- ~~[machida-sonoko] 町田苑香 → Sonoko Machida~~
- ~~[murata-sayaka] 村田沙耶香 → Sayaka Murata（forms 补齐缺失的 ja 原文形式）~~
- ~~[nagira-yuu] 凪良ゆう → Yuu Nagira（forms 补齐 ja 原文形式；原 zh 表记"凪良汐"未找到可靠来源确认，已移除，未替换新猜测——若馆长知道官方中译本作者名，请补充）~~
- ~~[nhk-josei-hinkon] "NHK 女性贫困取材班"（简繁混用）→ name: NHK Women's Poverty Reporting Team（无确认的官方英译名，为描述性英文译名，非"英译本署名"，如馆长有更准确表述请指正）；ja 表记订正为「NHK「女性の貧困」取材班」~~
- ~~[ueno-chizuko] 上野千鶴子 → Chizuko Ueno（forms 补齐 ja 原文形式）~~
- ~~[kakuta-mitsuyo] 角田光代 → Mitsuyo Kakuta（forms 补齐 ja 原文形式）~~
- ~~[murakami-ryu] 村上龍 → Ryu Murakami（sort 同步补逗号：Murakami, Ryū）~~

### 已解决
- ~~[kame-no-kora-wa-abara-bone] 川崎悟司《跟动物交换身体》，callno JF-KAW-2019-KAME~~ 馆长指出应为非虚构（比较解剖学科普插画书），修正为 JN-KAW-2019-KAME（confirmed 记录，馆长本人指示覆盖冻结规则）
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
