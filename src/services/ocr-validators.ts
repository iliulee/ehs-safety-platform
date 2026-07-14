/**
 * OCR 字段语义校验器（第三层校验）
 * 字符识别 + 字段提取之后，基于业务规则做最后一层校验
 * 校验失败 → confidence 降为 0，不进入"一键填入"
 */

export interface ValidationResult {
  /** 校验状态 */
  status: 'valid' | 'invalid' | 'pending'
  /** 失败原因（status=invalid 时必填） */
  reason?: string
}

/** 常见姓氏白名单（百家姓 + 常见复姓，共 500+） */
const COMMON_SURNAMES = new Set<string>([
  // 单姓（百家姓前 100）
  '赵','钱','孙','李','周','吴','郑','王','冯','陈',
  '褚','卫','蒋','沈','韩','杨','朱','秦','尤','许',
  '何','吕','施','张','孔','曹','严','华','金','魏',
  '陶','姜','戚','谢','邹','喻','柏','水','窦','章',
  '云','苏','潘','葛','奚','范','彭','郎','鲁','韦',
  '昌','马','苗','凤','花','方','俞','任','袁','柳',
  '酆','鲍','史','唐','费','廉','岑','薛','雷','贺',
  '倪','汤','滕','殷','罗','毕','郝','邬','安','常',
  '乐','于','时','傅','皮','卞','齐','康','伍','余',
  '元','卜','顾','孟','平','黄','和','穆','萧','尹',
  '姚','邵','湛','汪','祁','毛','禹','狄','米','贝',
  '明','臧','计','伏','成','戴','谈','宋','茅','庞',
  '熊','纪','舒','屈','项','祝','董','梁','杜','阮',
  '蓝','闵','席','季','麻','强','贾','路','娄','危',
  '江','童','颜','郭','梅','盛','林','刁','钟','徐',
  '邱','骆','高','夏','蔡','田','樊','胡','凌','霍',
  '虞','万','支','柯','昝','管','卢','莫','经','房',
  '裘','缪','干','解','应','宗','丁','宣','贲','邓',
  '郁','单','杭','洪','包','诸','左','石','崔','吉',
  '钮','龚','程','嵇','邢','滑','裴','陆','荣','翁',
  '荀','羊','於','惠','甄','麴','家','封','芮','羿',
  '储','靳','汲','邴','糜','松','井','段','富','巫',
  '乌','焦','巴','弓','牧','隗','山','谷','车','侯',
  '宓','蓬','全','郗','班','仰','秋','仲','伊','宫',
  '宁','仇','栾','暴','甘','钭','厉','戎','祖','武',
  '符','刘','景','詹','束','龙','叶','幸','司','韶',
  '郜','黎','荔','薄','印','宿','白','怀','蒲','邰',
  '从','鄂','索','咸','籍','赖','卓','蔺','屠','蒙',
  '池','乔','阴','鬱','胥','能','苍','双','闻','昕',
  '党','翟','谭','贡','劳','逄','姬','申','扶','堵',
  '冉','宰','郦','雍','却','璩','桑','桂','濮','牛',
  '寿','通','边','扈','燕','冀','郏','浦','尚','农',
  '温','别','庄','晏','柴','瞿','阎','充','慕','连',
  '茹','习','宦','艾','鱼','容','向','古','易','慎',
  '戈','廖','庾','终','暨','居','衡','步','都','耿',
  '满','弘','匡','国','文','寇','广','禄','阙','东',
  '欧','殳','沃','利','蔚','越','夔','隆','师','巩',
  '厍','聂','晁','勾','敖','融','冷','訾','辛','阚',
  '那','简','饶','空','曾','毋','沙','乜','养','鞠',
  '须','丰','巢','关','蒯','相','查','后','荆','红',
  '游','竺','权','逯','盖','益','桓','公','仉','督',
  '晋','楚','闫','法','汝','鄢','涂','钦','岳','帅',
  '缑','亢','况','后','有','琴','归','海','羊舌','微生',
  // 常见复姓
  '万俟','司马','上官','欧阳','夏侯','诸葛','闻人','东方',
  '赫连','皇甫','尉迟','公羊','澹台','公冶','宗政','濮阳',
  '淳于','单于','太叔','申屠','公孙','仲孙','轩辕','令狐',
  '钟离','宇文','长孙','慕容','鲜于','闾丘','司徒','司空',
  '亓官','司寇','仉督','子车','颛孙','端木','巫马','公西',
  '漆雕','乐正','壤驷','公良','拓跋','夹谷','宰父','谷梁',
  '段干','百里','东郭','南门','呼延','南宫','第五',
])

/** GB 11643 校验码算法：前 17 位 × 权重 mod 11 → 校验位 */
const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/** 常见塔吊/起重机械/土方机械型号词典 */
const EQUIPMENT_MODELS = new Set<string>([
  // 塔式起重机
  'QTZ40','QTZ50','QTZ63','QTZ80','QTZ100','QTZ125','QTZ160','QTZ200','QTZ250','QTZ300','QTZ400',
  // 中联/永茂/抚顺等厂家铭牌命名
  'TC5013','TC5610','TC5613','TC6015','TC6515','TC7035','TC7032','TC7052',
  'ST5515','ST7030','ST7027','ST6015',
  'D520','D800','D1100',
  'M900D','M1280D',
  // 汽车吊
  'QY8','QY12','QY16','QY20','QY25','QY50','QY70','QY100','QY130',
  // 履带吊
  'QUY50','QUY80','QUY100','QUY150','QUY200','QUY250','QUY350',
  'CC600','CC1000','CC2000','CC2600','CC2800',
  // 挖掘机
  'PC60','PC100','PC200','PC300','PC400','PC800',
  'SY75','SY135','SY200','SY215','SY335',
  'CAT320','CAT330','CAT336','CAT340',
  // 装载机
  'ZL30','ZL40','ZL50','ZL60','ZL80',
  // 推土机
  'SD16','SD22','SD32','D60','D65','D85','D155',
  // 压路机
  'XS143','XS163','XS203','YZ18','YZ20','YZ22',
])

/** 设备名称中文词典 */
const DEVICE_NAMES_CN = new Set<string>([
  '塔式起重机','塔吊','施工电梯','物料提升机','施工升降机',
  '履带起重机','履带吊',
  '汽车起重机','汽车吊',
  '挖掘机','装载机','推土机','压路机','平地机',
  '混凝土泵车','混凝土搅拌车','混凝土搅拌站','砂浆搅拌机',
  '渣土车','自卸汽车','运输车','载货汽车',
  '铲运机','铣刨机','摊铺机','稳定土拌合机',
  '发电机','空压机','电焊机','钢筋切断机','钢筋弯曲机',
  '钢筋调直机','木工圆锯','木工平刨','切割机',
])

/**
 * 校验姓名：姓氏必须在白名单中
 * 解决"张→妆""李→季"等字形相近误识
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.length < 2) {
    return { status: 'invalid', reason: '姓名长度不足' }
  }
  // 优先尝试复姓（2字，姓名总长 ≥ 3）
  if (name.length >= 3) {
    const twoCharSurname = name.substring(0, 2)
    if (COMMON_SURNAMES.has(twoCharSurname)) {
      return { status: 'valid' }
    }
  }
  // 单姓
  const oneCharSurname = name.substring(0, 1)
  if (COMMON_SURNAMES.has(oneCharSurname)) {
    return { status: 'valid' }
  }
  return {
    status: 'invalid',
    reason: `"${oneCharSurname}" 不是常见姓氏，可能识别错误`,
  }
}

/**
 * 校验身份证号：GB 11643 校验码算法
 * 可拦截 OCR 把 1 识成 7、把 0 识成 O 等错误
 */
export function validateIdCard(idNumber: string): ValidationResult {
  if (!idNumber) {
    return { status: 'invalid', reason: '身份证号为空' }
  }
  const cleaned = idNumber.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^\d{17}[\dX]$/.test(cleaned)) {
    return { status: 'invalid', reason: '身份证号格式不符（应为 17 位数字 + 1 位校验码）' }
  }
  // 计算校验码
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(cleaned[i], 10) * ID_CARD_WEIGHTS[i]
  }
  const expectedCheck = ID_CARD_CHECK_MAP[sum % 11]
  const actualCheck = cleaned[17]
  if (expectedCheck !== actualCheck) {
    return {
      status: 'invalid',
      reason: `校验码不匹配（应为 ${expectedCheck}，识别为 ${actualCheck}）`,
    }
  }
  return { status: 'valid' }
}

/** 56 个法定民族（含"汉族"全称） */
const NATIONS = new Set<string>([
  '汉','蒙古','回','藏','维吾尔','苗','彝','壮','布依','朝鲜',
  '满','侗','瑶','白','土家','哈尼','哈萨克','傣','黎','傈僳',
  '佤','畲','高山','拉祜','水','东乡','纳西','景颇','柯尔克孜',
  '土','达斡尔','仫佬','羌','布朗','撒拉','毛南','仡佬','锡伯',
  '阿昌','普米','塔吉克','怒','乌孜别克','俄罗斯','鄂温克',
  '德昂','保安','裕固','京','塔塔尔','独龙','鄂伦春','赫哲',
  '门巴','珞巴','基诺',
  '汉族','蒙古族','回族','藏族','壮族','满族',
])

/** 校验民族 */
export function validateNation(nation: string): ValidationResult {
  if (!nation) return { status: 'pending', reason: '民族为空' }
  if (NATIONS.has(nation)) return { status: 'valid' }
  // 去掉"族"字后匹配
  const stripped = nation.replace(/族$/, '')
  if (NATIONS.has(stripped)) return { status: 'valid' }
  return { status: 'invalid', reason: `"${nation}" 不是法定民族` }
}

/** 校验性别 */
export function validateGender(gender: string): ValidationResult {
  if (gender === '男' || gender === '女') return { status: 'valid' }
  return { status: 'invalid', reason: `"${gender}" 不是合法性别` }
}

/**
 * 校验设备型号：命中词典或符合命名规则
 * 词典命中 → valid
 * 符合 [2-4 字母]+[2-5 数字]+[可选字母] 规则 → valid
 */
export function validateEquipmentModel(model: string): ValidationResult {
  if (!model) return { status: 'invalid', reason: '型号为空' }
  const upper = model.toUpperCase().replace(/\s+/g, '')
  if (EQUIPMENT_MODELS.has(upper)) return { status: 'valid' }
  // 命名规则：2-4 字母 + 2-5 数字 + 可选字母（如 QTZ80B）
  if (/^[A-Z]{2,4}\d{2,5}[A-Z]?$/i.test(model)) return { status: 'valid' }
  return {
    status: 'invalid',
    reason: `"${model}" 不符合常见设备型号命名规则`,
  }
}

/**
 * 校验出厂编号：长度 4-20，字母数字+连字符，必须含数字
 */
export function validateFactoryNumber(serial: string): ValidationResult {
  if (!serial) return { status: 'invalid', reason: '出厂编号为空' }
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,18}[A-Za-z0-9]$/.test(serial)) {
    return {
      status: 'invalid',
      reason: '出厂编号格式不符（应为 4-20 位字母数字+连字符）',
    }
  }
  if (!/\d/.test(serial)) {
    return { status: 'invalid', reason: '出厂编号必须包含数字' }
  }
  return { status: 'valid' }
}

/**
 * 校验设备名称：在中文词典中，或包含词典中的某个名称
 */
export function validateDeviceName(name: string): ValidationResult {
  if (!name) return { status: 'invalid', reason: '设备名称为空' }
  if (DEVICE_NAMES_CN.has(name)) return { status: 'valid' }
  // 部分匹配（如 "塔式起重机（TC6015）"）
  for (const cn of DEVICE_NAMES_CN) {
    if (name.includes(cn)) return { status: 'valid' }
  }
  return {
    status: 'invalid',
    reason: `"${name}" 不在常见设备名称词典中`,
  }
}
