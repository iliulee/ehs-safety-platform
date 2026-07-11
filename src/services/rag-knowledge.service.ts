import { db, generateId, now } from '@/db'
import type { KnowledgeDocument, KnowledgeChunk, RetrievalHit, ChunkProgress } from '@/types'
import { tokenize, BM25Searcher } from './bm25.service'
import { chunkText } from './chunker.service'
import { extractTextFromFile } from './text-extractor.service'

export type ImportProgressCallback = (progress: ChunkProgress) => void

const BUILT_IN_DOCS: Array<{
  title: string
  category: string
  source: string
  content: string
}> = [
  {
    title: '《中华人民共和国安全生产法》核心条款',
    category: 'law',
    source: '法律法规',
    content: `第二十一条 生产经营单位的主要负责人对本单位安全生产工作负有下列职责：
（一）建立健全并落实本单位全员安全生产责任制，加强安全生产标准化建设；
（二）组织制定并实施本单位安全生产规章制度和操作规程；
（三）组织制定并实施本单位安全生产教育和培训计划；
（四）保证本单位安全生产投入的有效实施；
（五）组织建立并落实安全风险分级管控和隐患排查治理双重预防工作机制，督促、检查本单位的安全生产工作，及时消除生产安全事故隐患；
（六）组织制定并实施本单位的生产安全事故应急救援预案；
（七）及时、如实报告生产安全事故。

第二十五条 生产经营单位的安全生产管理机构以及安全生产管理人员履行下列职责：
（一）组织或者参与拟订本单位安全生产规章制度、操作规程和生产安全事故应急救援预案；
（二）组织或者参与本单位安全生产教育和培训，如实记录安全生产教育和培训情况；
（三）组织开展危险源辨识和评估，督促落实本单位重大危险源的安全管理措施；
（四）组织或者参与本单位应急救援演练；
（五）检查本单位的安全生产状况，及时排查生产安全事故隐患，提出改进安全生产管理的建议；
（六）制止和纠正违章指挥、强令冒险作业、违反操作规程的行为；
（七）督促落实本单位安全生产整改措施。

第四十三条 生产经营单位进行爆破、吊装、动火、临时用电以及国务院应急管理部门会同国务院有关部门规定的其他危险作业，应当安排专门人员进行现场安全管理，确保操作规程的遵守和安全措施的落实。

第五十七条 从业人员在作业过程中，应当严格落实岗位安全责任，遵守本单位的安全生产规章制度和操作规程，服从管理，正确佩戴和使用劳动防护用品。`,
  },
  {
    title: '《建设工程安全生产管理条例》要点',
    category: 'law',
    source: '法律法规',
    content: `第二十一条 施工单位主要负责人依法对本单位的安全生产工作全面负责。施工单位应当建立健全安全生产责任制度和安全生产教育培训制度，制定安全生产规章制度和操作规程，保证本单位安全生产条件所需资金的投入，对所承担的建设工程进行定期和专项安全检查，并做好安全检查记录。

第二十四条 建设工程实行施工总承包的，由总承包单位对施工现场的安全生产负总责。总承包单位应当自行完成建设工程主体结构的施工。总承包单位依法将建设工程分包给其他单位的，分包合同中应当明确各自的安全生产方面的权利、义务。总承包单位和分包单位对分包工程的安全生产承担连带责任。

第二十六条 施工单位应当在施工组织设计中编制安全技术措施和施工现场临时用电方案，对下列达到一定规模的危险性较大的分部分项工程编制专项施工方案，并附具安全验算结果，经施工单位技术负责人、总监理工程师签字后实施，由专职安全生产管理人员进行现场监督：
（一）基坑支护与降水工程；（二）土方开挖工程；（三）模板工程；（四）起重吊装工程；（五）脚手架工程；（六）拆除、爆破工程。
对前款所列工程中涉及深基坑、地下暗挖工程、高大模板工程的专项施工方案，施工单位还应当组织专家进行论证、审查。`,
  },
  {
    title: '危险性较大的分部分项工程范围及管理要求',
    category: 'pce',
    source: '建质〔2018〕31号',
    content: `一、基坑工程
（一）开挖深度超过3m（含3m）的基坑（槽）的土方开挖、支护、降水工程。
（二）开挖深度虽未超过3m，但地质条件、周围环境和地下管线复杂，或影响毗邻建、构筑物安全的基坑（槽）的土方开挖、支护、降水工程。

二、模板工程及支撑体系
（一）各类工具式模板工程：包括滑模、爬模、飞模、隧道模等工程。
（二）混凝土模板支撑工程：搭设高度5m及以上，或搭设跨度10m及以上，或施工总荷载10kN/m²及以上，或集中线荷载15kN/m及以上，或高度大于支撑水平投影宽度且相对独立无联系构件的混凝土模板支撑工程。
（三）承重支撑体系：用于钢结构安装等满堂支撑体系。

三、起重吊装及起重机械安装拆卸工程
（一）采用非常规起重设备、方法，且单件起吊重量在10kN及以上的起重吊装工程。
（二）采用起重机械进行安装的工程。
（三）起重机械安装和拆卸工程。

四、脚手架工程
（一）搭设高度24m及以上的落地式钢管脚手架工程；
（二）提升高度150m及以上附着式升降脚手架工程或附着式升降操作平台工程；
（三）分段架体搭设高度20m及以上的悬挑式脚手架工程。

超过一定规模的危大工程（需专家论证）：
开挖深度超过5m（含5m）的深基坑工程；搭设高度8m及以上、搭设跨度18m及以上、施工总荷载15kN/m²及以上、集中线荷载20kN/m及以上的混凝土模板支撑工程；采用非常规起重设备且单件起吊重量100kN及以上的起重吊装工程；搭设高度50m及以上落地式钢管脚手架工程；提升高度200m及以上附着式升降脚手架工程。

专项施工方案应当包括以下内容：
1.工程概况：危大工程概况和特点、施工平面布置、施工要求和技术保证条件；
2.编制依据：相关法律、法规、规范性文件、标准、规范及施工图设计文件、施工组织设计等；
3.施工计划：包括施工进度计划、材料与设备计划；
4.施工工艺技术：技术参数、工艺流程、施工方法、操作要求、检查要求等；
5.施工安全保证措施：组织保障措施、技术措施、监测监控措施等；
6.施工管理及作业人员配备和分工：施工管理人员、专职安全生产管理人员、特种作业人员等；
7.验收要求：验收标准、验收程序、验收内容、验收人员等；
8.应急处置措施；
9.计算书及相关施工图纸。`,
  },
  {
    title: 'JGJ46-2005施工现场临时用电安全技术规范要点',
    category: 'standard',
    source: '行业标准',
    content: `1.0.3 建筑施工现场临时用电工程专用的电源中性点直接接地的220/380V三相四线制低压电力系统，必须符合下列规定：
1 采用三级配电系统；
2 采用TN-S接零保护系统；
3 采用二级漏电保护系统。

3.1.1 临时用电设备在5台及5台以上或设备总容量在50kW及50kW以上者，应编制临时用电施工组织设计。

6.1.1 配电柜后面的维护通道宽度，单列布置或双列面对面布置不小于0.8m，双列背对背布置不小于1.5m。

7.2.5 开关箱中的漏电保护器，其额定漏电动作电流不应大于30mA，额定漏电动作时间不应大于0.1s。使用于潮湿或有腐蚀介质场所的漏电保护器应采用防溅型产品，其额定漏电动作电流不应大于15mA，额定漏电动作时间不应大于0.1s。

8.1.3 每台用电设备必须有各自专用的开关箱，严禁用同一个开关箱直接控制2台及2台以上用电设备（含插座），即实行"一机、一闸、一漏、一箱"。

8.1.11 配电箱、开关箱周围应有足够2人同时工作的空间和通道，不得堆放任何妨碍操作、维修的物品，不得有灌木、杂草。

TN-S接零保护系统要求：电气设备的金属外壳必须与保护零线连接。保护零线应由工作接地线、配电室（总配电箱）电源侧零线或总漏电保护器电源侧零线处引出。

电缆线路应采用埋地或架空敷设，严禁沿地面明设，并应避免机械损伤和介质腐蚀。埋地电缆路径应设方位标志。`,
  },
  {
    title: 'JGJ130-2011扣件式钢管脚手架安全技术规范要点',
    category: 'standard',
    source: '行业标准',
    content: `6.2.1 脚手架立杆基础应平整夯实，底座、垫板均应准确放在定位线上，垫板应采用长度不少于2跨、厚度不小于50mm、宽度不小于200mm的木垫板。

6.3.2 脚手架必须设置纵、横向扫地杆。纵向扫地杆应采用直角扣件固定在距钢管底端不大于200mm处的立杆上。横向扫地杆应采用直角扣件固定在紧靠纵向扫地杆下方的立杆上。

6.3.3 立杆接长除顶层顶步可采用搭接外，其余各层各步接头必须采用对接扣件连接。

6.4.3 对高度24m及以下的单、双排脚手架，宜采用刚性连墙件与建筑物可靠连接，亦可采用钢筋与顶撑配合使用的附墙连接方式。严禁使用只有钢筋的柔性连墙件。对高度24m以上的双排脚手架，必须采用刚性连墙件与建筑物可靠连接。

6.6.2 剪刀撑的设置应符合下列规定：
1 每道剪刀撑跨越立杆的根数宜按规定确定，每道剪刀撑宽度不应小于4跨，且不应小于6m，斜杆与地面的倾角宜在45°~60°之间；
2 高度在24m以下的单、双排脚手架，均必须在外侧两端、转角及中间间隔不超过15m的立面上，各设置一道剪刀撑，并应由底至顶连续设置。

7.3.12 脚手架及其地基基础应在下列阶段进行检查和验收：
1 基础完工后及脚手架搭设前；
2 作业层上施加荷载前；
3 每搭设完6m~8m高度后；
4 达到设计高度后；
5 遇有六级强风及以上风或大雨后；冻结地区解冻后；
6 停用超过一个月后。

作业层上非主节点处的横向水平杆，宜根据支承脚手板的需要等间距设置，最大间距不应大于纵距的1/2。`,
  },
  {
    title: 'JGJ80-2016建筑施工高处作业安全技术规范要点',
    category: 'standard',
    source: '行业标准',
    content: `3.0.1 高处作业的安全技术措施及其所需料具，必须列入工程的施工组织设计。

4.1.1 坠落高度基准面2m及以上进行临边作业时，应在临空一侧设置防护栏杆，并应采用密目式安全立网或工具式栏板封闭。

4.3.1 防护栏杆应由横杆及立杆组成，横杆应设2~3道：下杆离地高度宜为0.3m~0.6m，上杆离地高度宜为1.0m~1.2m；立杆间距不宜大于2.0m，立杆离坡边距离宜大于0.5m。

4.3.2 防护栏杆宜加挂密目安全网和挡脚板；挡脚板高度不应小于180mm，挡脚板下沿离地高度不应大于10mm。

4.2.1 在洞口作业时，应采取防坠落措施，并应符合下列规定：
1 当竖向洞口短边边长小于500mm时，应采取封堵措施；当短边边长大于或等于500mm时，应在临空一侧设置高度不小于1.2m的防护栏杆，并应采用密目式安全立网或工具式栏板封闭，设置挡脚板。

5.1.1 移动式操作平台的面积不应超过10m²，高度不应超过5m，高宽比不应大于2:1，施工荷载不应超过1.5kN/m²。

5.2.1 悬挑式操作平台的设置应符合下列规定：悬挑式操作平台的搁置点、拉结点、支撑点应设置在稳定的主体结构上，且应可靠连接。

6.1.1 扣件式钢管脚手架搭设人员必须是经过考核合格的专业架子工，上岗人员应定期体检，合格者方可持证上岗。

安全带使用要求：安全带应高挂低用，挂钩应扣在牢固处，严禁扣在移动或不牢固的物件上。高处作业人员应按规定佩戴安全带，安全带的各种部件不得任意拆除。

遇有六级以上强风、浓雾、暴雨、大雪等恶劣天气，不得进行露天攀登与悬空高处作业。`,
  },
  {
    title: 'JGJ59-2011建筑施工安全检查标准要点',
    category: 'standard',
    source: '行业标准',
    content: `3.0.1 建筑施工安全检查评定中，保证项目应全数检查。

3.0.2 建筑施工安全检查评定应符合下列规定：
1 保证项目均应达标；
2 保证项目中每项均得满分的，汇总表得分值在80分及以上为优良；在70分及以上为合格；70分以下为不合格。

安全管理检查评分表保证项目：安全生产责任制、施工组织设计及专项施工方案、安全技术交底、安全检查、安全教育、应急救援。

文明施工检查评分表保证项目：现场围挡、封闭管理、施工场地、材料管理、现场办公与住宿、现场防火。

扣件式钢管脚手架检查评分表保证项目：施工方案、立杆基础、架体与建筑结构拉结、杆件间距与剪刀撑、脚手板与防护栏杆、交底与验收。

基坑工程检查评分表保证项目：施工方案、基坑支护、降排水、基坑开挖、坑边荷载、安全防护。

模板支架检查评分表保证项目：施工方案、支架基础、支架构造、支架稳定、施工荷载、交底与验收。

高处作业检查评分表检查项目：安全帽、安全网、安全带、临边防护、洞口防护、通道口防护、攀登作业、悬空作业、移动式操作平台、悬挑式物料钢平台。

施工用电检查评分表保证项目：外电防护、接地与接零保护系统、配电线路、配电箱与开关箱。`,
  },
  {
    title: '深基坑工程安全施工要点',
    category: 'measure',
    source: '安全措施',
    content: `深基坑开挖前准备：
1.必须编制专项施工方案，开挖深度超过5m（含5m）的必须组织专家论证，经施工单位技术负责人审批、总监理工程师审查签字后方可实施；
2.查明基坑周边的建构筑物、地下管线、道路分布情况，制定保护措施；
3.对周边可能受影响的建筑物、管线布置监测点，确定监测方案和预警值；
4.进行安全教育和安全技术交底，特种作业人员持证上岗；
5.准备应急物资和设备。

基坑开挖安全要求：
1.严格按照专项方案规定的开挖顺序、方法和分层厚度开挖，严禁超挖；
2.遵循"开槽支撑、先撑后挖、分层开挖、严禁超挖"原则；
3.基坑周边严禁超堆荷载，坑边2m范围内不得堆放土方、材料和停放重型机械；
4.基坑周边1.2m范围内设置不低于1.2m高的防护栏杆，设18cm高挡脚板，挂密目安全网，设置安全警示标志；
5.设置人员上下专用通道或爬梯，严禁攀爬支撑或土壁；
6.开挖过程中应有专人监测边坡稳定情况，发现裂缝、渗水、位移异常立即停止作业，撤离人员；
7.设置有效排水措施，坑顶设截水沟，坑内设集水井和排水沟；
8.深基坑施工应进行第三方监测，监测数据超过预警值时立即停工。

内支撑体系要求：
1.支撑系统的选材和安装必须符合设计要求；
2.钢支撑应按设计要求施加预压力；
3.支撑安装应遵循先撑后挖原则，严禁先挖后撑；
4.支撑拆除必须按设计要求的顺序进行，更换支撑时应先装新撑再拆旧撑。`,
  },
  {
    title: '动火作业安全管理要求',
    category: 'measure',
    source: '安全措施',
    content: `动火作业分级：
一级动火：禁火区域内（易燃易爆场所、储存仓库等），由项目负责人组织编制防火安全技术方案，填写动火申请表，报企业安全管理部门审批；
二级动火：在具有一定危险因素的非禁火区域内，由项目责任工程师组织拟定防火安全技术措施，填写动火申请表，报项目安全管理部门和项目负责人审批；
三级动火：在非固定的、无明显危险因素的场所进行用火作业，由所在班组填写动火申请表，经项目责任工程师和安全管理部门审批。

动火作业"十不烧"原则：
1.焊工无上岗证不烧；2.动火审批手续未办不烧；3.不了解焊接地点周围情况不烧；
4.不了解焊接物内部情况不烧；5.装过易燃易爆物品的容器未经清洗置换不烧；
6.用可燃材料作保温隔音的部位不烧；7.密闭或有压力的容器管道不烧；
8.焊接部位旁有易燃易爆物品未清理不烧；9.附近有与明火作业相抵触的作业不烧；
10.禁火区内未办理动火审批手续不烧。

动火作业安全措施：
1.动火前清理作业点周围10m范围内的易燃易爆物品；
2.配备灭火器材，设置看火人（监护人）；
3.高处动火应采取防火花飞溅措施，下方设专人监护；
4.动火后检查确认无火种残留方可离开；
5.动火证当日有效，动火地点变换应重新办理。`,
  },
  {
    title: '安全技术交底编写要求',
    category: 'measure',
    source: '安全措施',
    content: `安全技术交底应分部分项、分工种进行，交底应在施工作业前进行，内容应具体、有针对性，严禁交底走过场。

交底主要内容：
1.施工作业特点和危险源：告知作业人员本项工作存在哪些危险因素，可能导致什么伤害；
2.针对危险因素制定的具体预防措施：包括技术措施和管理措施；
3.相应的安全操作规程和标准：列出应遵守的操作规程和标准条款；
4.作业中应注意的安全事项：包括个人防护、操作注意事项；
5.发生事故后应及时采取的避难和急救措施：包括应急疏散路线、急救方法、报警电话；
6.安全防护设施和个人防护用品的使用要求：正确佩戴安全帽、安全带、防护眼镜等。

交底要求：
1.交底必须书面形式，双方签字确认；
2.交底应逐级进行：项目技术负责人→施工员→班组长→作业人员；
3.交底内容应全面、具体、有针对性，不能用"注意安全"等笼统表述代替具体措施；
4.应向所有参与作业的人员交底，不能遗漏；
5.交底记录应存档备查。

交底示例（钢筋绑扎作业）：
1.作业人员必须正确佩戴安全帽，高处作业必须系好安全带，高挂低用；
2.搬运钢筋时注意前后左右，防止碰伤人；
3.绑扎立柱、墙体钢筋时，不得站在钢筋骨架上或攀登骨架上下；
4.绑扎圈梁、挑檐、外墙、边柱钢筋时，应搭设操作台架和张挂安全网；
5.雷雨时必须停止露天作业，预防雷击伤人。`,
  },
]

class RagKnowledgeService {
  private searcher: BM25Searcher | null = null
  private chunkCache: Map<string, KnowledgeChunk> = new Map()
  private initPromise: Promise<void> | null = null

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<void> {
    await this.seedBuiltInDocs()
    await this.rebuildIndex()
  }

  private async seedBuiltInDocs(): Promise<void> {
    const count = await db.knowledgeDocuments.where('isBuiltIn').equals(1).count()
    if (count >= BUILT_IN_DOCS.length) return

    for (const doc of BUILT_IN_DOCS) {
      const existing = await db.knowledgeDocuments
        .where('title')
        .equals(doc.title)
        .first()
      if (existing) continue

      const chunks = chunkText(doc.content, doc.title)
      const docId = generateId()
      const ts = now()

      const docRecord: KnowledgeDocument = {
        id: docId,
        title: doc.title,
        fileName: doc.title,
        fileType: 'txt',
        fileSize: doc.content.length,
        fullText: doc.content,
        chunkCount: chunks.length,
        category: doc.category,
        source: doc.source,
        isBuiltIn: true,
        importStatus: 'done',
        createdAt: ts,
        updatedAt: ts,
      }
      await db.knowledgeDocuments.put(docRecord)

      for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i]
        const tokens = tokenize(content)
        const chunk: KnowledgeChunk = {
          id: generateId(),
          docId,
          docTitle: doc.title,
          chunkIndex: i,
          content,
          tokens,
          category: doc.category,
          isBuiltIn: true,
          createdAt: ts,
          updatedAt: ts,
        }
        await db.knowledgeChunks.put(chunk)
      }
    }
  }

  private async rebuildIndex(): Promise<void> {
    this.searcher = new BM25Searcher()
    this.chunkCache.clear()
    const allChunks = await db.knowledgeChunks.toArray()
    for (const chunk of allChunks) {
      this.searcher.addDoc(chunk.id!, chunk.tokens)
      this.chunkCache.set(chunk.id!, chunk)
    }
  }

  async importFile(
    file: File,
    category: string = 'custom',
    onProgress?: ImportProgressCallback,
  ): Promise<KnowledgeDocument> {
    await this.ensureInitialized()

    const ts = now()
    const docId = generateId()
    const title = file.name.replace(/\.(docx|pdf|txt|md)$/i, '')
    const fileType = file.name.toLowerCase().split('.').pop() as 'docx' | 'pdf' | 'txt' | 'md'

    onProgress?.({ phase: 'reading', processed: 0, total: 100, currentFile: file.name })

    let fullText = ''
    try {
      onProgress?.({ phase: 'parsing', processed: 20, total: 100, currentFile: file.name })
      fullText = await extractTextFromFile(file)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '文件解析失败'
      await db.knowledgeDocuments.put({
        id: docId,
        title,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fullText: '',
        chunkCount: 0,
        category,
        isBuiltIn: false,
        importStatus: 'error',
        errorMsg,
        createdAt: ts,
        updatedAt: ts,
      })
      throw new Error(errorMsg)
    }

    if (!fullText.trim()) {
      throw new Error('文件内容为空或无法提取文本')
    }

    onProgress?.({ phase: 'chunking', processed: 50, total: 100, currentFile: file.name })
    const chunks = chunkText(fullText, title)

    onProgress?.({ phase: 'tokenizing', processed: 70, total: 100, currentFile: file.name })

    const docRecord: KnowledgeDocument = {
      id: docId,
      title,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      fullText,
      chunkCount: chunks.length,
      category,
      isBuiltIn: false,
      importStatus: 'processing',
      createdAt: ts,
      updatedAt: ts,
    }
    await db.knowledgeDocuments.put(docRecord)

    const chunkRecords: KnowledgeChunk[] = []
    for (let i = 0; i < chunks.length; i++) {
      const tokens = tokenize(chunks[i])
      chunkRecords.push({
        id: generateId(),
        docId,
        docTitle: title,
        chunkIndex: i,
        content: chunks[i],
        tokens,
        category,
        isBuiltIn: false,
        createdAt: ts,
        updatedAt: ts,
      })
    }

    onProgress?.({ phase: 'saving', processed: 90, total: 100, currentFile: file.name })
    await db.knowledgeChunks.bulkPut(chunkRecords)

    docRecord.importStatus = 'done'
    docRecord.updatedAt = now()
    await db.knowledgeDocuments.put(docRecord)

    if (this.searcher) {
      for (const chunk of chunkRecords) {
        this.searcher.addDoc(chunk.id!, chunk.tokens)
        this.chunkCache.set(chunk.id!, chunk)
      }
    }

    onProgress?.({ phase: 'saving', processed: 100, total: 100, currentFile: file.name })
    return docRecord
  }

  async importFiles(
    files: File[],
    category: string = 'custom',
    onProgress?: ImportProgressCallback,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] }
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        await this.importFile(file, category, (p) => {
          onProgress?.({
            ...p,
            processed: i * 100 + Math.floor(p.processed * 0.8),
            total: files.length * 100,
          })
        })
        result.success++
      } catch (err) {
        result.failed++
        result.errors.push(`${file.name}: ${err instanceof Error ? err.message : '导入失败'}`)
      }
    }
    return result
  }

  async listDocuments(category?: string): Promise<KnowledgeDocument[]> {
    await this.ensureInitialized()
    if (category) {
      return db.knowledgeDocuments.where('category').equals(category).reverse().sortBy('createdAt')
    }
    return db.knowledgeDocuments.orderBy('createdAt').reverse().toArray()
  }

  async listChunks(docId: string): Promise<KnowledgeChunk[]> {
    return db.knowledgeChunks.where('docId').equals(docId).sortBy('chunkIndex')
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.ensureInitialized()
    const doc = await db.knowledgeDocuments.get(docId)
    if (!doc) return
    if (doc.isBuiltIn) {
      throw new Error('内置法规文档不能删除')
    }
    const chunks = await db.knowledgeChunks.where('docId').equals(docId).toArray()
    const chunkIds = chunks.map((c) => c.id!)

    try {
      await db.transaction('rw', [db.knowledgeDocuments, db.knowledgeChunks], async () => {
        await db.knowledgeChunks.bulkDelete(chunkIds)
        await db.knowledgeDocuments.delete(docId)
      })
    } catch (err) {
      throw new Error('删除数据库记录失败：' + (err instanceof Error ? err.message : '未知错误'))
    }

    if (this.searcher) {
      for (const chunkId of chunkIds) {
        this.searcher.removeDoc(chunkId)
        this.chunkCache.delete(chunkId)
      }
    }
  }

  async retrieve(query: string, topK: number = 5): Promise<RetrievalHit[]> {
    await this.ensureInitialized()
    if (!this.searcher) return []

    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const searchResults = this.searcher.search(queryTokens, topK * 2)
    const hits: RetrievalHit[] = []
    const seenDocs = new Set<string>()

    for (const result of searchResults) {
      const chunk = this.chunkCache.get(result.id)
      if (!chunk) continue
      if (seenDocs.has(chunk.docId) && hits.filter((h) => h.chunk.docId === chunk.docId).length >= 2) {
        continue
      }
      hits.push({
        chunk,
        score: result.score,
        docTitle: chunk.docTitle,
      })
      seenDocs.add(chunk.docId)
      if (hits.length >= topK) break
    }

    return hits
  }

  async retrieveWithContext(query: string, topK: number = 4): Promise<{ context: string; hits: RetrievalHit[] }> {
    const hits = await this.retrieve(query, topK)
    if (hits.length === 0) return { context: '', hits: [] }

    const contextParts = hits.map((h, idx) => {
      return `[参考资料${idx + 1}]《${h.docTitle}》\n${h.chunk.content}`
    })
    return { context: contextParts.join('\n\n'), hits }
  }

  async generateWithRAG(
    prompt: string,
    extraContext?: string,
    stream = false,
    onChunk?: (chunk: string) => void,
  ): Promise<{ content: string; hits: RetrievalHit[] }> {
    const { aiService } = await import('./ai.service')
    const { context, hits } = await this.retrieveWithContext(prompt)

    const systemPrompt = `你是一位专业的建筑施工安全管理专家，擅长编写安全专项方案、安全技术交底、安全管理制度、应急预案等工程安全文档。

请严格基于以下参考资料回答问题。回答要求：
1. 语言严谨、专业，符合工程文档规范，适合直接用于正式文档；
2. 结构清晰，使用分级标题和分点论述；
3. 内容具体、可操作，避免空洞表述，给出具体的数值要求（如高度、距离、参数等）；
4. 引用参考资料中的具体条款时，在相关段落末尾标注[参考资料X]；
5. 如果参考资料不足以覆盖问题，可以基于专业知识补充，但要在补充段落末尾注明"[专业补充]"；
6. 优先使用参考资料中的内容，减少猜测和泛泛而谈。

参考资料：
${context || '（暂无匹配的参考资料，将基于专业知识回答）'}

${extraContext ? `\n额外上下文（来自项目信息）：\n${extraContext}\n` : ''}`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    const content = await aiService.chat(messages, stream, onChunk)
    return { content, hits }
  }

  async getStats(): Promise<{ docs: number; chunks: number; builtIn: number; custom: number }> {
    await this.ensureInitialized()
    const [docs, chunks, builtIn] = await Promise.all([
      db.knowledgeDocuments.count(),
      db.knowledgeChunks.count(),
      db.knowledgeDocuments.where('isBuiltIn').equals(1).count(),
    ])
    return { docs, chunks, builtIn, custom: docs - builtIn }
  }
}

export const ragKnowledgeService = new RagKnowledgeService()
