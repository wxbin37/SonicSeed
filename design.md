QQ音乐 设计指南（Design Guidelines）
本指南基于 QQ音乐 Figma 设计稿及最新 Design Token 文件精确提取，适用于 Figma Make 工具中作为 AI 生成提示词使用，确保设计一致性。

Token 数据源：tokens/ 目录（Basic.tokens.json + Color/ + Corner/）

一、设计系统概览
1.1 产品名称和定位
产品名称：QQ音乐（QQMusic）
产品定位：腾讯旗下综合音乐流媒体平台，集音乐播放、歌单推荐、直播互动、排行榜、AI 功能于一体
设计理念：清新、年轻、沉浸式。以绿色为品牌基调，追求简洁有序的信息架构，通过丰富的卡片化布局呈现海量音乐内容
核心设计原则：
内容优先：以音乐内容（封面、歌单、歌手）为视觉核心，UI 元素退居辅助
皮肤可变：支持多主题皮肤（默认白 / 默认黑），使用三层 Design Token 统一管理
层级清晰：通过 Alpha 透明度阶梯建立清晰的信息层级
圆润亲和：大量使用圆角设计，营造温暖友好的视觉感受
1.2 适用平台和设备
主平台：移动端（iOS / Android）
设计基准：390pt（iPhone 标准屏幕宽度，1x 逻辑像素）
屏幕方向：竖屏为主
1.3 Token 架构（三层结构）
tokens/
├── Basic.tokens.json           ← 基础原子层 (Primitive Layer)
│   ├── Scale.Common.*          → 间距/尺寸基础刻度
│   ├── Scale.Line Height.*     → 行高基础刻度
│   ├── Scale.Corner.*          → 圆角基础刻度
│   ├── Fonts.Font.*            → 字体家族
│   ├── Fonts.Size.*            → 字号层级
│   ├── Fonts.Weight.*          → 字重
│   ├── Fonts.Alpha.*           → 字体透明度刻度
│   ├── Color.*                 → 基础色板 (Gray/Green/Red/Blue/Black/White)
│   └── Color.Alpha.*           → 色彩透明度刻度
│
├── Color/
│   ├── 默认白.tokens.json      ← 浅色主题语义别名层 (Semantic Layer - Light)
│   └── 默认黑.tokens.json      ← 深色主题语义别名层 (Semantic Layer - Dark)
│
└── Corner/
    ├── 大容器.tokens.json      ← 大组件圆角别名层 (Corner Alias - Large)
    └── 小容器.tokens.json      ← 小组件圆角别名层 (Corner Alias - Small)
二、尺寸刻度系统（Scale System）
2.1 通用刻度（Scale.Common）
基于 4px 基准的渐进式间距/尺寸系统：

Token 名称	值 (pt)	用途范围
Scale.Common.0	0	零间距
Scale.Common.25	1	微间距（描边等）
Scale.Common.50	2	极小间距
Scale.Common.100	4	基础间距单元
Scale.Common.200	8	小间距（标签内 padding）
Scale.Common.300	12	常规间距
Scale.Common.400	16	中等间距
Scale.Common.500	20	卡片内边距、页面左右边距
Scale.Common.600	24	列表项间距
Scale.Common.700	28	较大间距
Scale.Common.800	32	大间距
Scale.Common.900	36	模块标题区域
Scale.Common.1000	40	大间距
Scale.Common.1100	48	图标容器/按钮尺寸
Scale.Common.1200	56	较大组件
Scale.Common.1300	64	大组件
Scale.Common.1400	72	特大组件
Scale.Common.1500	96	超大尺寸
Scale.Common.1600	96	超大尺寸（同 1500）
Scale.Common.1700	256	封面/图片尺寸
Scale.Common.1800	512	全屏/大图尺寸
关键间距：

页面左右边距 = Scale.Common.500 = 20pt
列表项间距 = Scale.Common.300 = 12pt
卡片内边距 = Scale.Common.500 = 20pt
按钮/图标容器 = Scale.Common.1100 = 48pt
2.2 行高刻度（Scale.Line Height）
Token 名称	值 (pt)	典型搭配字号
Scale.Line Height.100	13	Caption2 (11pt)
Scale.Line Height.200	16	Caption1/Call Out2 (12pt)
Scale.Line Height.300	17	Call Out1 (13pt)
Scale.Line Height.400	19	Body2 (14pt)
Scale.Line Height.500	20	Body1 (15pt)
Scale.Line Height.600	22	H3/Headline (17pt)
Scale.Line Height.700	23	H2 (18pt)
Scale.Line Height.800	32	H1 (26pt)
Scale.Line Height.900	43	Large Title (36pt)
三、字体系统
3.1 字体家族（Font Family）
Token	值	用途
Fonts.Font.Primary	PingFang SC	所有中文文本和默认英文
备用字体栈（推荐）：

font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", sans-serif;
特殊字体（从设计稿提取，非 Token 定义）：

字体名称	用途
DIN Black	VIP 等级数字
Manrope	年份数字（如 "2023"）
Reddit Sans	英文标签（"LIVE"、"TOP 100"、"Billboard"）
DM Sans	歌曲序号（斜体，如 "01"、"03"）
Bw Glenn Sans	助眠模块装饰文字
3.2 字号层级（Font Size）
Token 名称	值 (pt)	用途
Fonts.Size.Large Title	36	超大标题、推荐卡片大标题
Fonts.Size.H1	26	一级标题、排行榜卡片内标题
Fonts.Size.H2	18	二级标题、模块标题
Fonts.Size.H3	17	三级标题、带播控的模块标题
Fonts.Size.Headline	17	标题文字（同 H3，语义不同）
Fonts.Size.Body1	15	正文一级、Tab 标签文字
Fonts.Size.Body2	14	正文二级、歌曲名、列表主文字
Fonts.Size.Call Out1	13	歌单标题、中等信息
Fonts.Size.Call Out2	12	歌手名、副信息、时长
Fonts.Size.Caption1	12	标注文字一（同 Call Out2）
Fonts.Size.Caption2	11	标注文字二、标签文字
3.3 字重（Font Weight）
Token 名称	值	CSS font-weight	用途
Fonts.Weight.Regular	Regular	400	正文、歌曲名、描述文字
Fonts.Weight.Semi Bold	Semibold	600	标题、Tab 选中态、按钮文字
扩展字重（从设计稿提取，非 Token 定义）：

Light (300) — 专辑名副标题
Medium (500) — 歌手名（特殊模块）
Bold (700) — 年份数字
ExtraBold (800) — LIVE 标签、排行榜标签
Black (900) — VIP 等级数字
3.4 字体透明度（Fonts.Alpha）
用于控制文字的透明度层级：

Token 名称	值 (%)	用途
Fonts.Alpha.50	2%	极淡（几乎不可见）
Fonts.Alpha.100	5%	分割线级别
Fonts.Alpha.200	10%	极淡背景
Fonts.Alpha.300	15%	灰色辅助文字
Fonts.Alpha.400	25%	轻引导文字
Fonts.Alpha.500	40%	辅助描述文字
Fonts.Alpha.600	50%	中等描述文字
Fonts.Alpha.700	55%	次要文字
Fonts.Alpha.800	70%	副标题文字
Fonts.Alpha.900	85%	近主色文字
Fonts.Alpha.1000	100%	主标题文字
3.5 字号与行高配对参考
字号 Token	字号 (pt)	推荐行高 Token	行高 (pt)	行高比
Large Title	36	Line Height.900	43	1.19
H1	26	Line Height.800	32	1.23
H2	18	Line Height.700	23	1.28
H3 / Headline	17	Line Height.600	22	1.29
Body1	15	Line Height.500	20	1.33
Body2	14	Line Height.400	19	1.36
Call Out1	13	Line Height.300	17	1.31
Call Out2 / Caption1	12	Line Height.200	16	1.33
Caption2	11	Line Height.100	13	1.18
四、色彩系统
4.1 基础色板（Color Primitives）
Gray 灰色系
Token	HEX	用途说明
Color.Gray.0	#FFFFFF	纯白
Color.Gray.200	#F1F4F7	浅灰背景
Color.Gray.500	#E6E9EB	标签/分割背景
Color.Gray.800	#1E1E1F	深灰/暗黑背景
Color.Gray.950	#0D0D0D	极深灰
Color.Gray.1000	#000000	纯黑（标注：主文字色）
Green 绿色系（品牌色）
Token	HEX	用途说明
Color.Green.100	#D9FDD3	极浅绿
Color.Green.300	#87EAA8	浅绿
Color.Green.400	#00F285	亮绿（暗色主题按钮高亮）
Color.Green.500	#00EB81	品牌绿（浅色主题按钮高亮）
Color.Green.600	#55C97C	中绿
Color.Green.800	#00CC70	品牌深绿（文字高亮）
Red 红色系
Token	HEX	用途说明
Color.Red.500	#FF5E5E	红点通知色
Color.Red.600	#FF4D4D	红心/收藏色
Blue 蓝色系
Token	HEX	用途说明
Color.Blue.50	#A3B1BF	搜索框灰蓝背景
Color.Blue.100	#A5EBFF	浅蓝
Color.Blue.200	#00C3CC	青色
Color.Blue.300	#00A0A7	深青色
Color.Blue.500	#6699FF	蓝色（排行榜下降指示）
Color.Blue.600	#0847A1	深蓝
Color.Blue.800	#135580	暗蓝
Color.Blue.900	#003B61	极深蓝
Black 透明度系列（黑色基底 + Alpha）
Token	Alpha	用途描述
Color.Black.50	5%	分割线
Color.Black.150	15%	灰色辅助文字
Color.Black.200	20%	引导文字
Color.Black.300	30%	搜索文字
Color.Black.500	50%	中等描述文字
Color.Black.700	70%	副标题文字
Color.Black.1000	100%	主文字色
White 透明度系列（白色基底 + Alpha）
Token	Alpha	用途描述
Color.White.50	5%	分割线（暗色）
Color.White.150	15%	灰色辅助文字（暗色）
Color.White.200	20%	引导文字（暗色）
Color.White.300	30%	搜索文字（暗色）
Color.White.500	50%	中等描述文字（暗色）
Color.White.700	70%	副标题文字（暗色）
Color.White.1000	100%	主文字色（暗色）
色彩透明度刻度（Color.Alpha）
Token	值 (%)
Color.Alpha.0	0%
Color.Alpha.50	5%
Color.Alpha.100	10%
Color.Alpha.150	15%
Color.Alpha.200	20%
Color.Alpha.300	30%
Color.Alpha.500	50%
Color.Alpha.700	70%
Color.Alpha.None	100%（不透明）
4.2 语义色彩层（Semantic Colors）— 默认白 / 默认黑
文字颜色
语义 Token	描述	默认白	默认黑	引用基础 Token
Text-500	主文字色	#000000 100%	#FFFFFF 100%	Black.1000 / White.1000
Text-400	副文字色	#000000 70%	#FFFFFF 70%	Black.700 / White.700
Text-300	中等文字色	#000000 50%	#FFFFFF 50%	Black.500 / White.500
Text-200	引导文字色	#000000 20%	#FFFFFF 20%	Black.200 / White.200
Text-100	灰色辅助文字	#000000 15%	#FFFFFF 15%	Black.150 / White.150
Search-Text	搜索占位文字	#000000 30%	#FFFFFF 30%	Black.300 / White.300
背景颜色
语义 Token	描述	默认白	默认黑	引用基础 Token
Background	页面背景底色	#F1F4F7	#0D0D0D	Gray.200 / Gray.950
Mask	模块/卡片背景	#FFFFFF	#1E1E1F	White.1000 / Gray.800
Button-Mask	标签/Chip 背景	#E6E9EB	#1E1E1F	Gray.500 / Gray.800
Background-Search	搜索框背景	#A3B1BF 20%	#FFFFFF 20%	—
品牌高亮色
语义 Token	描述	默认白	默认黑	引用基础 Token
Button-Highlight	按钮高亮填充色	#00EB81	#00F285	Green.500 / Green.400
Highlight	文字高亮色	#00CC70	#00CC70	Green.800 / Green.800
Highlight-Disabled	高亮禁用态	#00CC70 50%	#00F285 50%	—
skin_@10_highlight_color	高亮色 10% 背景	#00CC70 10%	#00F285 10%	—
图标与按钮色
语义 Token	描述	默认白	默认黑	引用基础 Token
Icon	Tab 栏/金刚位图标色	#000000	#FFFFFF	Black.1000 / White.1000
Button-Icon	高亮按钮上文字/图标	#000000	#000000	Black.1000 / Black.1000
Divider	分割线	#000000 5%	#FFFFFF 5%	Black.50 / White.50
固定色（所有主题不变）
语义 Token	描述	色值	引用基础 Token
Red Heart	红心/收藏图标	#FF4D4D	Red.600
Red	全局红点通知	#FF5E5E	Red.500
Blue	排行榜下降指示	#6699FF	Blue.500
4.3 色彩主题对照总览
语义 Token	默认白	默认黑
Text-500（主文字）	#000000	#FFFFFF
Text-400（副文字）	rgba(0,0,0,0.7)	rgba(255,255,255,0.7)
Text-300（中文字）	rgba(0,0,0,0.5)	rgba(255,255,255,0.5)
Background（页面背景）	#F1F4F7	#0D0D0D
Mask（模块背景）	#FFFFFF	#1E1E1F
Button-Highlight（高亮按钮）	#00EB81	#00F285
Highlight（文字高亮）	#00CC70	#00CC70
Icon（图标色）	#000000	#FFFFFF
4.4 色彩对比度要求
主要文字（Text-500）与背景的对比度 ≥ 4.5:1（WCAG AA）
大字标题可放宽至 ≥ 3:1（WCAG AA Large Text）
高亮按钮色（#00EB81）对比度不足纯文字用途，仅用于填充背景
红心色（#FF4D4D）在所有主题下保持可辨识度
五、圆角系统
5.1 基础圆角刻度（Scale.Corner）
Token 名称	值 (pt)
Scale.Corner.None	0
Scale.Corner.6	6
Scale.Corner.10	10
Scale.Corner.12	12
Scale.Corner.18	18
Scale.Corner.20	20
Scale.Corner.24	24
Scale.Corner.30	30
Scale.Corner.40	40
Scale.Corner.Round	1000（完全圆形）
5.2 圆角语义别名（Corner Aliases）
QQ音乐圆角系统按容器尺寸分为大容器和小容器两套模式：

语义 Token	小容器 (pt)	大容器 (pt)	引用基础 Token
S（小圆角）	6	10	Corner.6 / Corner.10
Default（默认圆角）	12	20	Corner.12 / Corner.20
M（中圆角）	18	30	Corner.18 / Corner.30
L（大圆角）	24	40	Corner.24 / Corner.40
比例关系：大容器圆角值 ≈ 小容器 × 1.67

5.3 圆角使用指南
圆角值	对应 Token	用途示例
0pt	Scale.Corner.None	无圆角元素
6pt	小容器.S	标签/Chip（"正在追"、"劲歌金曲"）
10pt	大容器.S	大组件小圆角
12pt	小容器.Default	歌曲封面（50×50pt）、搜索结果图片、专辑封面
18pt	小容器.M	小组件中圆角
20pt	大容器.Default	歌单卡片（155×155pt）、排行榜卡片、直播封面
24pt	小容器.L	小组件大圆角
30pt	大容器.M	底部播控栏顶部圆角
40pt	大容器.L	最大圆角容器、弹窗
1000pt	Scale.Corner.Round	圆形元素（歌手头像、唱片）
5.4 圆角使用原则
元素越大，圆角越大：小标签 6pt → 封面 12pt → 卡片 20pt → 播控栏 30pt
胶囊形：使用 Scale.Corner.Round（1000pt）或高度一半作为圆角值
圆形：使用 Scale.Corner.Round（border-radius: 1000pt 等同于 50%）
嵌套组件：外层使用大容器 Token，内层使用小容器 Token
六、间距与布局
6.1 画布基准
设计宽度：390pt（iPhone 标准屏幕）
像素比：设计稿中数值直接为 pt 值（1x 逻辑像素）
屏幕方向：竖屏为主
6.2 间距系统
基于 Scale.Common Token 的间距使用：

用途	Scale Token	值 (pt)
微间距（图标与文字紧凑）	Common.100	4
标签内 padding	Common.200	8
常规间距	Common.300	12
中等间距	Common.400	16
页面左右边距（核心）	Common.500	20
列表项间距	Common.300	12
模块内容间距	Common.400 ~ Common.500	16 ~ 20
模块间垂直间距	Common.800	32
大间距	Common.1000	40
6.3 页面布局
页面左右边距：Scale.Common.500 = 20pt
内容区域宽度：390pt - 20pt × 2 = 350pt
6.4 栅格系统（Grid System）
QQ音乐首页采用流式布局：

布局模式	列数	列宽 (pt)	列间距 (pt)	适用模块
三等分卡片	3	155	15	歌单、歌手、排行榜、直播
两行×三列	3×2	155	15	热门节目（两行歌单）
列表项	1	350（满宽）	—	歌曲列表、播客列表
Banner	1+1	约 300+165	15	首页推荐大卡片
注意：三列卡片模块第三张通常部分露出右侧，暗示可横向滑动。

七、组件库规范
7.1 顶部搜索栏（Search Bar）
属性	值 (pt)	Token 引用
高度	30	—
背景	胶囊形	Background-Search
搜索图标	24×24	—
占位文字	Body2 (14pt) Regular	Text-300
热搜标签	Body2 (14pt)	Text-200
右侧图标	麦克风 + 扫码，各 30×30	—
左右边距	20pt	Scale.Common.500
7.2 Tab 导航栏（Horizontal Tab Bar）
属性	值 (pt)	Token 引用
容器高度	30	—
Tab 圆角	1000 (胶囊)	Scale.Corner.Round
选中态背景	—	Button-Highlight
选中态文字	Body1 (15pt) SemiBold	Button-Icon
未选中文字	Body1 (15pt) Regular	Text-400
左侧起始	20pt	Scale.Common.500
Tab 项：推荐、乐馆、听书、AI唱、会员、金币、AI作歌

7.3 模块标题栏（Section Header）
属性	值 (pt)	Token 引用
高度	30	—
标题文字	H2 (18pt) SemiBold	Text-500
左侧边距	20pt	Scale.Common.500
关闭按钮	30×30 容器内 15×15 图标	Text-500
7.4 歌曲列表项（Song List Item）
属性	值 (pt)	Token 引用
总高度	50	—
封面尺寸	50×50	—
封面圆角	12（小容器.Default）	小容器.Default
封面到文字间距	10	Scale.Common.300
歌曲名	Body2 (14pt) Regular	Text-500
歌手/副信息	Call Out2 (12pt) Regular	Text-300
收藏按钮	24×24	—
列表项间距	12	Scale.Common.300
标签（Chip）：

属性	值 (pt)	Token 引用
高度	14	—
内边距	上下 3，左右 4	—
圆角	6（小容器.S）	小容器.S
背景	—	Button-Mask
文字	8pt Regular	Text-500 @60%
7.5 卡片组件（Card）
歌单/节目方形卡片
属性	值 (pt)	Token 引用
尺寸	155×155	—
圆角	20（大容器.Default）	大容器.Default
底部渐变蒙版	44pt 高	linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)
播放量文字	10pt SemiBold 白色	—
卡片下方标题	Call Out1 (13pt) Regular	Text-500
直播卡片
属性	值 (pt)	Token 引用
封面尺寸	155×180	—
封面圆角	20	大容器.Default
LIVE 标签	16pt ExtraBold(800)，Reddit Sans	白色固定
标题	Body2 (14pt) Regular	Text-500
类别标签	Call Out2 (12pt) Regular	Text-300
歌手推荐卡片
属性	值 (pt)	Token 引用
外层容器	155×155，圆角 20	大容器.Default
背景色	每张独立色（#7FA4F8 / #FFA9A3 / #E3B58F）	—
歌手头像	约 56×56，圆形	Scale.Corner.Round
排行榜卡片
属性	值 (pt)	Token 引用
尺寸	155×155	—
圆角	20	大容器.Default
背景	#000000	—
榜单名	H1 (26pt) SemiBold 白色	—
TOP 标签	Caption2 (11pt) ExtraBold 白色	—
7.6 推荐大卡片（Banner Card）
左侧个性化推荐
属性	值 (pt)	Token 引用
尺寸	约 300×165	—
圆角	20	大容器.Default
背景	多色拼接渐变	—
"猜你喜欢"	Call Out2 (12pt) SemiBold 白色	—
右侧 Daily 30 卡片
属性	值 (pt)	Token 引用
尺寸	约 165×165	—
圆角	20	大容器.Default
"Daily 3O"	21pt ExtraBold(800) Reddit Sans 白色	—
7.7 至臻专辑卡片（Premium Album）
属性	值 (pt)	Token 引用
容器宽度	350	—
专辑封面	约 129×129，圆角 12	小容器.Default
封面阴影	box-shadow: 0 0 24pt rgba(0,0,0,0.12)	—
封面玻璃效果	backdrop-filter: blur(6pt)	—
歌手名	Call Out1 (13pt) Medium	Text-500
专辑名	Call Out1 (13pt) Light	Text-500
曲目列表	Call Out2 (12pt) Regular	—
收藏按钮	24×24	—
7.8 底部播控栏（Mini Player Bar）
属性	值 (pt)	Token 引用
总高度	约 137	—
背景	毛玻璃效果	Mask + blur(5pt)
顶部圆角	30（大容器.M）	大容器.M
封面	50×50，圆角 12	小容器.Default
封面描边	2pt Button-Highlight	Button-Highlight
歌曲名	Body2 (14pt) Regular	Text-500
播放按钮	24×24（触控 30×30）	Icon
收藏按钮	24×24（触控 30×30）	Icon
7.9 底部 Tab 栏（Bottom Navigation）
属性	值 (pt)	Token 引用
容器高度	约 73（含安全区）	—
图标尺寸	24×24（在 30×30 容器内）	—
标签文字	8pt Regular / SemiBold(选中)	Icon
Tab 数量	5（首页/直播/搜索/星光/我的）	—
选中态	文字加粗 + 图标切实心版本	—
7.10 收藏按钮（Like Button）
变体	图标	数字颜色	Token 引用
未收藏	空心心形	Text-300	—
已收藏	实心心形	#FF4D4D	Red Heart
无数字	仅心形	—	—
八、交互状态
8.1 Tab 选中状态
属性	未选中	选中	Token
背景	透明	品牌绿填充	Button-Highlight
文字颜色	70% 主色	纯黑	Text-400 → Button-Icon
字重	Regular (400)	SemiBold (600)	Fonts.Weight.*
圆角	—	胶囊形	Scale.Corner.Round
8.2 底部 Tab 选中状态
属性	未选中	选中	Token
图标	线性描边	实心填充	—
字重	Regular (400)	SemiBold (600)	Fonts.Weight.*
文字颜色	图标色	图标色	Icon
8.3 收藏按钮状态
属性	未收藏	已收藏	Token
图标	空心心形	实心心形	—
数字颜色	50% 主色	红心色	Text-300 → Red Heart
8.4 播放按钮状态
属性	暂停态	播放态
图标	播放三角形	暂停双竖线
尺寸	24×24	24×24
8.5 建议的过渡动画
⚠️ 以下为基于最佳实践的建议，设计稿中未明确标注

交互	动画	时长	缓动
Tab 切换	背景色过渡	200ms	ease-out
收藏点击	缩放弹跳	300ms	spring(0.5, 80, 10)
列表项点击	背景色高亮	150ms	ease-in-out
页面滚动	惯性滚动	—	系统默认
横向滑动卡片	惯性 + 吸附	300ms	ease-out
底部播控栏出现	上滑 + 渐显	250ms	ease-out
九、图标系统
9.1 图标风格
主要风格：线性描边（Outlined），1pt 描边宽度
选中态：实心填充（Filled）
特殊图标：混合风格（如播放按钮、LIVE 标签）
图标颜色：跟随 Token，默认 Icon 或 Text-500
9.2 图标尺寸规范
尺寸 (pt)	Touch Target (pt)	用途
24×24	30×30	底部 Tab 图标、播控按钮、收藏按钮
22×22	22×22	播放控制小按钮
15×15	30×30	关闭按钮
13×12	24×24	收藏心形小图标
9.3 图标颜色规范
场景	颜色 Token
底部 Tab 栏	Icon
播控栏按钮	Icon 或 Text-500
模块关闭按钮	Text-500
卡片内白色图标	固定 #FFFFFF
高亮按钮内图标	Button-Icon
十、阴影与效果系统
10.1 阴影规范
阴影名称	值	用途
专辑封面阴影	box-shadow: 0 0 24pt rgba(0,0,0,0.12)	至臻专辑封面浮层
小装饰阴影	box-shadow: 1.3pt 1.3pt 1.3pt	波形条装饰
10.2 毛玻璃效果
场景	背景	模糊值
底部播控栏	Mask 色	blur(5pt)
封面玻璃质感	rgba(0,0,0,0.10)	blur(6pt)
卡片内标签	rgba(255,255,255,0.20)	blur(12.5pt)
10.3 常用渐变
名称	值	用途
卡片底部蒙版	linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)	歌单/直播卡片底部
播控栏背景过渡	linear-gradient(180deg, rgba(255,255,255,0.8) 0%, #FFF 50%)	播控栏上方
文字渐隐	linear-gradient(180deg, #FFF 0%, transparent 100%)	文字淡出效果
十一、使用注意事项
11.1 Figma Make 提示词使用指南
颜色引用：始终使用语义 Token 名称（如 Text-500、Background、Button-Highlight），而非硬编码色值，确保主题切换能力
字号引用：使用 Token 名称（如 Fonts.Size.Body2），而非具体数值
圆角引用：使用语义别名（如 大容器.Default、小容器.S），而非具体数值
间距引用：使用 Scale.Common.* Token 名称
横向滚动：三列卡片模块第三张通常部分露出右侧，暗示可横向滑动
图片占位：所有封面图片应有圆角裁切，图片加载失败时显示 Button-Mask 背景
11.2 设计一致性检查清单
[ ] 页面背景使用 Background Token
[ ] 所有模块左右边距使用 Scale.Common.500（20pt）
[ ] 标题使用 Fonts.Size.H2 (18pt) SemiBold
[ ] 歌曲封面使用 小容器.Default 圆角 (12pt)
[ ] 卡片使用 大容器.Default 圆角 (20pt)
[ ] Tab 选中态使用 Button-Highlight 背景 + 胶囊圆角
[ ] 文字层级遵循 Text-500 → Text-400 → Text-300 → Text-200 → Text-100
[ ] 底部播控栏使用 大容器.M (30pt) 顶部圆角 + 毛玻璃效果
[ ] 所有组件间距使用 Scale.Common.* Token 而非任意值
11.3 响应式适配建议
⚠️ 当前设计为固定 390pt 宽度，以下为适配建议

缩放策略：使用 viewport 缩放，保持设计稿比例
字体缩放：可使用 clamp() 函数约束最小/最大字号
卡片宽度：使用 calc((100vw - 40pt) / 2) 动态计算双列宽度
横向滚动模块：使用 overflow-x: auto + scroll-snap-type: x mandatory
十二、CSS 变量完整映射
12.1 默认白主题
:root[data-theme="light"] {
  /* === 文字颜色 (Text Colors) === */
  --text-500: #000000;                           /* 主文字色 100% */
  --text-400: rgba(0, 0, 0, 0.70);              /* 副文字色 70% */
  --text-300: rgba(0, 0, 0, 0.50);              /* 中等文字色 50% */
  --text-200: rgba(0, 0, 0, 0.20);              /* 引导文字色 20% */
  --text-100: rgba(0, 0, 0, 0.15);              /* 灰色辅助文字 15% */
  --search-text: rgba(0, 0, 0, 0.30);           /* 搜索占位 30% */
  --divider: rgba(0, 0, 0, 0.05);               /* 分割线 5% */

  /* === 背景颜色 (Background Colors) === */
  --background: #F1F4F7;                          /* 页面背景 → Gray.200 */
  --mask: #FFFFFF;                                /* 模块背景 → White.1000 */
  --button-mask: #E6E9EB;                         /* 标签背景 → Gray.500 */
  --background-search: rgba(163, 177, 191, 0.20); /* 搜索框背景 → Blue.50 @20% */

  /* === 品牌高亮色 (Highlight Colors) === */
  --button-highlight: #00EB81;                    /* 按钮高亮 → Green.500 */
  --highlight: #00CC70;                           /* 文字高亮 → Green.800 */
  --highlight-disabled: rgba(0, 204, 112, 0.50); /* 高亮禁用 → Green.800 @50% */
  --highlight-10: rgba(0, 204, 112, 0.10);       /* 高亮10%背景 */

  /* === 固定色 (Static Colors) === */
  --red-heart: #FF4D4D;                           /* 红心收藏 → Red.600 */
  --red: #FF5E5E;                                 /* 红点通知 → Red.500 */
  --blue: #6699FF;                                /* 排行下降 → Blue.500 */

  /* === 图标/按钮 (Icon & Button) === */
  --icon: #000000;                                /* 图标色 → Black.1000 */
  --button-icon: #000000;                         /* 按钮内图标 → Gray.1000 */
}
12.2 默认黑主题
:root[data-theme="dark"] {
  /* === 文字颜色 === */
  --text-500: #FFFFFF;
  --text-400: rgba(255, 255, 255, 0.70);
  --text-300: rgba(255, 255, 255, 0.50);
  --text-200: rgba(255, 255, 255, 0.20);
  --text-100: rgba(255, 255, 255, 0.15);
  --search-text: rgba(255, 255, 255, 0.30);
  --divider: rgba(255, 255, 255, 0.05);

  /* === 背景颜色 === */
  --background: #0D0D0D;                          /* → Gray.950 */
  --mask: #1E1E1F;                                /* → Gray.800 */
  --button-mask: #1E1E1F;                         /* → Gray.800 */
  --background-search: rgba(255, 255, 255, 0.20); /* → White @20% */

  /* === 品牌高亮色 === */
  --button-highlight: #00F285;                    /* → Green.400 */
  --highlight: #00CC70;                           /* → Green.800 */
  --highlight-disabled: rgba(0, 242, 133, 0.50);
  --highlight-10: rgba(0, 242, 133, 0.10);

  /* === 固定色（不变） === */
  --red-heart: #FF4D4D;
  --red: #FF5E5E;
  --blue: #6699FF;

  /* === 图标/按钮 === */
  --icon: #FFFFFF;                                /* → White.1000 */
  --button-icon: #000000;                         /* → Black.1000（不变） */
}
12.3 圆角变量
/* === 小容器圆角 (Small Container) === */
:root[data-container="small"] {
  --corner-s: 6px;          /* 小容器.S → Corner.6 */
  --corner-default: 12px;   /* 小容器.Default → Corner.12 */
  --corner-m: 18px;         /* 小容器.M → Corner.18 */
  --corner-l: 24px;         /* 小容器.L → Corner.24 */
}

/* === 大容器圆角 (Large Container) === */
:root[data-container="large"] {
  --corner-s: 10px;         /* 大容器.S → Corner.10 */
  --corner-default: 20px;   /* 大容器.Default → Corner.20 */
  --corner-m: 30px;         /* 大容器.M → Corner.30 */
  --corner-l: 40px;         /* 大容器.L → Corner.40 */
}

/* === 特殊圆角 === */
:root {
  --corner-none: 0px;       /* Scale.Corner.None */
  --corner-round: 1000px;   /* Scale.Corner.Round - 完全圆形 */
}
12.4 间距变量
:root {
  /* === Scale.Common 间距 === */
  --space-0: 0px;
  --space-25: 1px;
  --space-50: 2px;
  --space-100: 4px;
  --space-200: 8px;
  --space-300: 12px;
  --space-400: 16px;
  --space-500: 20px;    /* 页面左右边距 */
  --space-600: 24px;
  --space-700: 28px;
  --space-800: 32px;
  --space-900: 36px;
  --space-1000: 40px;
  --space-1100: 48px;
  --space-1200: 56px;
  --space-1300: 64px;
  --space-1400: 72px;
  --space-1500: 96px;
  --space-1600: 96px;
  --space-1700: 256px;
  --space-1800: 512px;
}
12.5 字体变量
:root {
  /* === 字体家族 === */
  --font-primary: "PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;

  /* === 字号 === */
  --font-size-large-title: 36px;
  --font-size-h1: 26px;
  --font-size-h2: 18px;
  --font-size-h3: 17px;
  --font-size-headline: 17px;
  --font-size-body1: 15px;
  --font-size-body2: 14px;
  --font-size-callout1: 13px;
  --font-size-callout2: 12px;
  --font-size-caption1: 12px;
  --font-size-caption2: 11px;

  /* === 字重 === */
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  /* === 行高 === */
  --line-height-100: 13px;
  --line-height-200: 16px;
  --line-height-300: 17px;
  --line-height-400: 19px;
  --line-height-500: 20px;
  --line-height-600: 22px;
  --line-height-700: 23px;
  --line-height-800: 32px;
  --line-height-900: 43px;
}
十三、Token 架构参考 — 完整引用链
语义 Token → 基础 Token 映射
┌─────────────────────────────────────────────────────────────────────────┐
│                    QQ音乐 Design Token 引用链                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  语义层 (Semantic)              基础层 (Primitive)                       │
│  ─────────────────              ────────────────                         │
│                                                                         │
│  【默认白 / 默认黑】                                                      │
│                                                                         │
│  Text-500 ─────────────→ Color.Black.1000 / Color.White.1000           │
│  Text-400 ─────────────→ Color.Black.700  / Color.White.700            │
│  Text-300 ─────────────→ Color.Black.500  / Color.White.500            │
│  Text-200 ─────────────→ Color.Black.200  / Color.White.200            │
│  Text-100 ─────────────→ Color.Black.150  / Color.White.150            │
│  Search-Text ──────────→ Color.Black.300  / Color.White.300            │
│  Divider ──────────────→ Color.Black.50   / Color.White.50             │
│                                                                         │
│  Background ───────────→ Color.Gray.200   / Color.Gray.950             │
│  Mask ─────────────────→ Color.White.1000 / Color.Gray.800             │
│  Button-Mask ──────────→ Color.Gray.500   / Color.Gray.800             │
│                                                                         │
│  Button-Highlight ─────→ Color.Green.500  / Color.Green.400            │
│  Highlight ────────────→ Color.Green.800  / Color.Green.800            │
│  Icon ─────────────────→ Color.Black.1000 / Color.White.1000           │
│  Button-Icon ──────────→ Color.Gray.1000  / Color.Black.1000           │
│                                                                         │
│  Red Heart ────────────→ Color.Red.600    (所有主题)                     │
│  Red ──────────────────→ Color.Red.500    (所有主题)                     │
│  Blue ─────────────────→ Color.Blue.500   (所有主题)                     │
│                                                                         │
│  【大容器 / 小容器】                                                      │
│                                                                         │
│  小容器.S ─────────────→ Scale.Corner.6   / Scale.Corner.10            │
│  小容器.Default ───────→ Scale.Corner.12  / Scale.Corner.20            │
│  小容器.M ─────────────→ Scale.Corner.18  / Scale.Corner.30            │
│  小容器.L ─────────────→ Scale.Corner.24  / Scale.Corner.40            │
│                                                                         │
│  大容器.S ─────────────→ Scale.Corner.10  / Scale.Corner.10            │
│  大容器.Default ───────→ Scale.Corner.20  / Scale.Corner.20            │
│  大容器.M ─────────────→ Scale.Corner.30  / Scale.Corner.30            │
│  大容器.L ─────────────→ Scale.Corner.40  / Scale.Corner.40            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
文档基于 Figma 设计稿 (70_19653) + tokens/ 目录（Basic.tokens.json, Color/, Corner/）精确提取 更新时间: 2026-04-10