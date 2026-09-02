export const UNSET = '未選択';
export const MODEL_NAME = 'claude-sonnet-5';

export interface ItemCategory {
  key: string;
  label: string;
}

// 設定画面で項目をグループ分けして表示するためのカテゴリ一覧。
export const itemCategories: ItemCategory[] = [
  { key: 'exercise', label: '運動' },
  { key: 'adl', label: '日常生活動作' },
  { key: 'swallowing', label: '嚥下機能' },
  { key: 'communication', label: '会話' },
  { key: 'cognitive', label: '認知機能' },
  { key: 'mental', label: '精神・心理面' },
  { key: 'condition', label: '体調' },
  { key: 'social', label: '社会参加・活動' },
  { key: 'other', label: 'その他' },
];

export interface ItemDef {
  key: string;
  label: string;
  options: string[];
  categoryKey: string;
}

// 施設が設定画面(項目のON/OFF)で選べる項目のマスタカタログ。
// key(保存キー)は既存データとの互換性のため変更しないこと。
export const itemCatalog: ItemDef[] = [
  { key: 'machine_training_count', label: 'マシンの数', categoryKey: 'exercise', options: [
    UNSET, '上半身', '下半身', '4種類', '5種類', '6種類',
  ] },
  { key: 'machine_training_time', label: 'マシンの時間', categoryKey: 'exercise', options: [
    UNSET, '各1分', '各2分', '各3分', '各4分', '各5分', '各6分', '各7分', '各8分',
  ] },
  { key: 'parallel_bars', label: '平行棒運動', categoryKey: 'exercise', options: [
    UNSET, 'なし', '各10回', '各15回', '各20回',
  ] },
  { key: 'gait', label: '歩行', categoryKey: 'exercise', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '非該当(車椅子等)',
  ] },
  { key: 'vitals', label: 'バイタル', categoryKey: 'condition', options: [
    UNSET, '良好', '最高血圧が高い', '最高血圧が低い', '最低血圧が高い', '最低血圧が低い',
    '脈拍が高い', '脈拍が低い',
  ] },
  { key: 'communication', label: '会話等', categoryKey: 'communication', options: [
    UNSET, '良好', 'やや良好', 'やや低下', '低下', '困難',
  ] },
  { key: 'transport_condition', label: '送迎中の様子', categoryKey: 'other', options: [
    UNSET, '良好', 'やや良好', 'やや不安定', '不安定',
  ] },
  { key: 'cognitive_function', label: '認知機能', categoryKey: 'cognitive', options: [
    UNSET, '良好', '維持', 'やや低下', '低下', '困難',
  ] },
  { key: 'daily_life', label: '日常生活', categoryKey: 'adl', options: [
    UNSET, '安定', '概ね安定', 'やや不安定', '不安定',
  ] },
  { key: 'fall_injury', label: '転倒やけが', categoryKey: 'condition', options: [
    UNSET, 'なし', '軽微な転倒あり(けがなし)', '転倒・けがあり', 'ヒヤリハットあり',
  ] },
  // 嚥下機能: 新規追加(たたき台。臨床的な文言・選択肢は要レビュー)。
  { key: 'meal_form', label: '食事形態', categoryKey: 'swallowing', options: [
    UNSET, '常食', '一口大', '刻み食', 'とろみ食', 'ミキサー食',
  ] },
  { key: 'choking_sign', label: 'むせ・誤嚥兆候', categoryKey: 'swallowing', options: [
    UNSET, 'なし', 'ときどきあり', '頻繁にあり',
  ] },
  { key: 'hydration', label: '水分摂取', categoryKey: 'swallowing', options: [
    UNSET, '良好', '促しが必要', '拒否あり',
  ] },

  // 以下、デイサービス以外(訪問系・施設系・地域密着型など)の業務も見据えた
  // 追加項目。すべてたたき台であり、臨床的な文言・選択肢は要レビュー。
  // 運動機能
  { key: 'balance_stability', label: '立位・バランス能力', categoryKey: 'exercise', options: [
    UNSET, '安定', 'やや不安定', '不安定', '測定・実施できず',
  ] },
  { key: 'rom_change', label: '関節可動域(ROM)の変化', categoryKey: 'exercise', options: [
    UNSET, '維持', '改善傾向', '軽度の制限あり', '中等度以上の制限あり',
  ] },
  { key: 'rehab_motivation', label: 'リハビリへの参加意欲・自主トレの実施状況', categoryKey: 'exercise', options: [
    UNSET, '意欲的に取り組めている', '概ね取り組めている', '声かけが必要', '消極的・拒否あり',
  ] },
  // 日常生活動作(ADL)
  { key: 'transfer_movement', label: '移乗・移動動作', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '非該当(寝たきり等)',
  ] },
  { key: 'dressing', label: '更衣動作', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助',
  ] },
  { key: 'toileting', label: '排泄の状況', categoryKey: 'adl', options: [
    UNSET, '自立(問題なし)', '声かけ・誘導が必要', '一部介助', '全介助(おむつ使用)', '失禁がみられる',
  ] },
  { key: 'bathing', label: '入浴・清潔保持の様子', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '拒否がみられる',
  ] },
  // 嚥下・栄養機能
  { key: 'meal_intake_amount', label: '食事摂取量・食欲', categoryKey: 'swallowing', options: [
    UNSET, '良好(全量摂取)', 'やや良好', '低下傾向', '低下(半量以下)', '拒否あり',
  ] },
  { key: 'weight_change', label: '体重の変化', categoryKey: 'swallowing', options: [
    UNSET, '増加', '維持', '軽度の減少', '著明な減少', '未測定',
  ] },
  // 認知機能
  { key: 'orientation', label: '見当識', categoryKey: 'cognitive', options: [
    UNSET, '良好', 'やや低下(日時のあいまいさ)', '低下(場所の混乱あり)', '著しい低下',
  ] },
  { key: 'bpsd', label: '周辺症状(BPSD)', categoryKey: 'cognitive', options: [
    UNSET, 'なし', '時々みられる(徘徊・不穏等)', '頻繁にみられる', '対応に苦慮するレベル',
  ] },
  { key: 'judgment', label: '判断力・意思決定の様子', categoryKey: 'cognitive', options: [
    UNSET, '良好', 'やや低下', '低下', '判断が困難',
  ] },
  // 会話・コミュニケーション
  { key: 'facial_expression', label: '表情・感情表出', categoryKey: 'communication', options: [
    UNSET, '穏やか・明るい', 'やや乏しい', '硬い表情が多い', '感情の起伏が激しい',
  ] },
  { key: 'social_interaction', label: '他利用者・スタッフとの交流状況', categoryKey: 'communication', options: [
    UNSET, '積極的', '声かけには応じる', '受け身がち', '交流を避ける傾向',
  ] },
  // 精神・心理面
  { key: 'motivation_activity', label: '意欲・活動性', categoryKey: 'mental', options: [
    UNSET, '意欲的', 'やや低下', '低下', '無気力な様子がみられる',
  ] },
  { key: 'emotional_stability', label: '情緒の安定度', categoryKey: 'mental', options: [
    UNSET, '安定', 'やや不安定', '不安定', '興奮・混乱がみられる',
  ] },
  { key: 'anxiety_depression', label: '不安・抑うつ傾向', categoryKey: 'mental', options: [
    UNSET, 'なし', '時々みられる', '頻繁にみられる', '強い不安・抑うつ症状あり',
  ] },
  // 体調・健康管理
  { key: 'skin_condition', label: '皮膚状態(褥瘡の有無)', categoryKey: 'condition', options: [
    UNSET, '異常なし', '発赤あり(観察継続)', '褥瘡あり(軽度)', '褥瘡あり(処置対応中)',
  ] },
  { key: 'sleep_condition', label: '睡眠状況', categoryKey: 'condition', options: [
    UNSET, '良好', '中途覚醒がみられる', '不眠傾向', '昼夜逆転がみられる',
  ] },
  { key: 'medication_management', label: '服薬状況・管理', categoryKey: 'condition', options: [
    UNSET, '自己管理できている', '声かけが必要', '一部介助(配薬等)', '全介助', '服薬拒否・飲み忘れあり',
  ] },
  { key: 'medical_treatment', label: '医療処置の実施状況', categoryKey: 'condition', options: [
    UNSET, '特記事項なし', '処置を実施(経過良好)', '処置を実施(経過観察中)', '状態変化あり(要報告)',
  ] },
  // 社会参加・活動
  { key: 'recreation_participation', label: 'レクリエーション・行事への参加状況', categoryKey: 'social', options: [
    UNSET, '積極的に参加', '声かけで参加', '見学が多い', '参加を拒否する傾向',
  ] },
  { key: 'role_purpose', label: '役割保持・生きがい活動', categoryKey: 'social', options: [
    UNSET, 'あり(継続できている)', 'あり(やや消極的)', '特になし', '本人の希望を聴取中',
  ] },
  // その他
  { key: 'home_environment_burden', label: '居宅環境・介護者(家族)の負担感', categoryKey: 'other', options: [
    UNSET, '特に問題なし', '軽度の負担感あり', '中等度の負担感あり', '強い負担感・支援が必要',
  ] },
];

// 表示項目の設定(config.enabled_items)が未設定のときのデフォルト。
// 既存10項目のみ、既存の並び順のまま。
export const defaultEnabledItemKeys: string[] = [
  'machine_training_count',
  'machine_training_time',
  'parallel_bars',
  'gait',
  'vitals',
  'communication',
  'transport_condition',
  'cognitive_function',
  'daily_life',
  'fall_injury',
];

export interface FacilityTypePreset {
  key: string;
  label: string;
  itemKeys: string[];
}

// 「所見の項目を選択」画面で施設種別を選んだ際に、一括でチェックを
// 入れ替えるためのプリセット。たたき台であり、実際の運用に合わせて
// 過不足があれば個別にチェックを調整することを前提にしている。
export const facilityTypePresets: FacilityTypePreset[] = [
  { key: 'day_service', label: '通所介護・通所リハビリ(デイサービス/デイケア)', itemKeys: [
    'machine_training_count', 'machine_training_time', 'parallel_bars', 'gait',
    'vitals', 'communication', 'transport_condition', 'cognitive_function',
    'daily_life', 'fall_injury', 'rehab_motivation', 'balance_stability',
    'recreation_participation', 'motivation_activity', 'facial_expression',
    'social_interaction',
  ] },
  { key: 'home_care', label: '訪問介護', itemKeys: [
    'daily_life', 'transfer_movement', 'dressing', 'toileting', 'bathing',
    'communication', 'vitals', 'fall_injury', 'home_environment_burden',
    'medication_management', 'meal_intake_amount',
  ] },
  { key: 'home_nursing', label: '訪問看護・訪問リハビリ', itemKeys: [
    'vitals', 'medical_treatment', 'medication_management', 'skin_condition',
    'sleep_condition', 'meal_intake_amount', 'weight_change', 'choking_sign',
    'hydration', 'fall_injury', 'cognitive_function', 'orientation',
    'communication', 'home_environment_burden', 'rom_change', 'balance_stability',
  ] },
  { key: 'facility', label: '施設系(特養・老健・介護医療院・短期入所)', itemKeys: [
    'transfer_movement', 'dressing', 'toileting', 'bathing', 'meal_form',
    'choking_sign', 'hydration', 'meal_intake_amount', 'weight_change', 'vitals',
    'fall_injury', 'skin_condition', 'sleep_condition', 'medication_management',
    'medical_treatment', 'cognitive_function', 'orientation', 'bpsd', 'judgment',
    'communication', 'emotional_stability', 'anxiety_depression',
    'recreation_participation', 'role_purpose', 'daily_life',
  ] },
  { key: 'group_home', label: 'グループホーム・認知症対応型通所', itemKeys: [
    'cognitive_function', 'orientation', 'bpsd', 'judgment', 'communication',
    'facial_expression', 'social_interaction', 'motivation_activity',
    'emotional_stability', 'anxiety_depression', 'daily_life', 'meal_intake_amount',
    'hydration', 'sleep_condition', 'fall_injury', 'recreation_participation',
    'role_purpose',
  ] },
  { key: 'residential', label: '特定施設・小規模多機能型(入居・複合型)', itemKeys: [
    'transfer_movement', 'toileting', 'bathing', 'meal_intake_amount', 'hydration',
    'vitals', 'fall_injury', 'medication_management', 'cognitive_function',
    'orientation', 'communication', 'emotional_stability', 'recreation_participation',
    'daily_life', 'sleep_condition',
  ] },
  { key: 'care_manager', label: '居宅介護支援(ケアマネ)・福祉用具貸与など', itemKeys: [
    'daily_life', 'communication', 'home_environment_burden', 'fall_injury',
    'cognitive_function', 'vitals',
  ] },
];

export interface TonePreset {
  key: string;
  label: string;
}

export const tonePresets: TonePreset[] = [
  { key: 'polite', label: '丁寧(標準)' },
  { key: 'soft', label: '柔らかい' },
  { key: 'concise', label: '簡潔' },
  { key: 'bullet', label: '箇条書き' },
];

export const defaultTonePresetKey = 'polite';

// 各プリセットの方針本文。'polite'は元の固定systemPromptと同じ文言にし、
// 既存利用者の生成結果の質を変えないようにする。
const rulePoliteBody =
  '- 文体は「です・ます調」の丁寧な報告文にするが、堅苦しくなりすぎないようにする\n' +
  '- 「〜てまいります」「〜られております」のような謙譲語・二重敬語は使わない\n' +
  '- 入力された事実のみをもとに記述し、入力にない内容を推測で付け加えない\n' +
  '- 過去の記録がある場合は、状態の変化や継続している課題があれば触れる\n' +
  '- 留意点が渡された場合は、それを踏まえた記述にするが、留意点の文言をそのまま繰り返さない\n' +
  '- 出力は報告文の本文のみとし、見出しや前置きの説明文、箇条書き記号は付けない\n' +
  '- 文と文の間に空行を入れず、改行のみで区切って続けて記述する\n' +
  '- 重要: 文中や文末に「努めてまいります」「注意してまいります」という言葉を' +
  '絶対に使わないこと。「注意していきます」と書くこと\n' +
  '- 重要: 「○○様の状況をご報告いたします」のような書き出しの前置き文は一切書かず、' +
  '1行目から直接、運動や状態に関する具体的な内容で始めること\n';

const ruleSoftBody =
  '- 文体は「です・ます調」を保ちつつ、柔らかく親しみやすい言い回しにする' +
  '(専門用語や堅苦しい言い回しは避ける)\n' +
  '- 「〜てまいります」「〜られております」のような謙譲語・二重敬語は使わない\n' +
  '- 入力された事実のみをもとに記述し、入力にない内容を推測で付け加えない\n' +
  '- 過去の記録がある場合は、状態の変化や継続している課題があれば触れる\n' +
  '- 留意点が渡された場合は、それを踏まえた記述にするが、留意点の文言をそのまま繰り返さない\n' +
  '- 出力は報告文の本文のみとし、見出しや前置きの説明文、箇条書き記号は付けない\n' +
  '- 文と文の間に空行を入れず、改行のみで区切って続けて記述する\n' +
  '- 重要: 文中や文末に「努めてまいります」「注意してまいります」という言葉を' +
  '絶対に使わないこと。「注意していきます」と書くこと\n' +
  '- 重要: 「○○様の状況をご報告いたします」のような書き出しの前置き文は一切書かず、' +
  '1行目から直接、運動や状態に関する具体的な内容で始めること\n';

const ruleBulletBody =
  '- 文体は「です・ます調」の丁寧な報告文にする\n' +
  '- 「〜てまいります」「〜られております」のような謙譲語・二重敬語は使わない\n' +
  '- 出力は項目ごとに「・」で始まる箇条書きにし、1項目1〜2文程度で簡潔にまとめる\n' +
  '- 箇条書きの行と行の間に空行を入れない\n' +
  '- 入力された事実のみをもとに記述し、入力にない内容を推測で付け加えない\n' +
  '- 過去の記録がある場合は、状態の変化や継続している課題があれば触れる\n' +
  '- 留意点が渡された場合は、それを踏まえた記述にするが、留意点の文言をそのまま繰り返さない\n' +
  '- 重要: 文中や文末に「努めてまいります」「注意してまいります」という言葉を' +
  '絶対に使わないこと。「注意していきます」と書くこと\n' +
  '- 重要: 「○○様の状況をご報告いたします」のような書き出しの前置き文は一切書かず、' +
  '1行目から直接、運動や状態に関する具体的な内容で始めること\n';

const ruleConciseBody =
  '- 文体は「です・ます調」の丁寧な報告文にするが、簡潔に要点だけをまとめる\n' +
  '- 「〜てまいります」「〜られております」のような謙譲語・二重敬語は使わない\n' +
  '- 一文を短くし、修飾語や重複した言い回しを避けて簡潔に記述する\n' +
  '- 入力された事実のみをもとに記述し、入力にない内容を推測で付け加えない\n' +
  '- 過去の記録がある場合は、状態の変化や継続している課題があれば触れる\n' +
  '- 留意点が渡された場合は、それを踏まえた記述にするが、留意点の文言をそのまま繰り返さない\n' +
  '- 出力は報告文の本文のみとし、見出しや前置きの説明文、箇条書き記号は付けない\n' +
  '- 文と文の間に空行を入れず、改行のみで区切って続けて記述する\n' +
  '- 重要: 文中や文末に「努めてまいります」「注意してまいります」という言葉を' +
  '絶対に使わないこと。「注意していきます」と書くこと\n' +
  '- 重要: 「○○様の状況をご報告いたします」のような書き出しの前置き文は一切書かず、' +
  '1行目から直接、運動や状態に関する具体的な内容で始めること\n';

// facilityTypePresetsのkeyに対応する、AIへの立場設定(書き出し文)。
// サインアップ時に選んだ施設種別を反映し、常にデイサービス職員視点で
// 書かせてしまう(訪問系・施設系等で実態と食い違う)ことを防ぐ。
const facilityRoleSentences: Record<string, string> = {
  day_service: 'あなたは通所介護・通所リハビリ(デイサービス/デイケア)の機能訓練指導員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  home_care: 'あなたは訪問介護のサービス提供責任者・訪問介護員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  home_nursing: 'あなたは訪問看護師・訪問リハビリ職員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  facility: 'あなたは介護施設(特養・老健・介護医療院・短期入所)の介護職員・生活相談員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  group_home: 'あなたはグループホーム・認知症対応型通所介護の職員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  residential: 'あなたは特定施設・小規模多機能型居宅介護の職員が作成する、ケアマネージャー向け月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
  care_manager: 'あなたは居宅介護支援事業所のケアマネージャーが作成する、利用者の居宅サービス計画に関する月次モニタリング報告書の下書き作成を手伝うアシスタントです。',
};

/// [toneKey]はtonePresetsのいずれかのkey(不明な値の場合は'polite'扱い)。
/// [facilityTypeKey]はfacilityTypePresetsのいずれかのkey。未設定・不明な値の
/// 場合はデイサービス職員視点(従来通り)を既定値とする。
export function systemPromptFor(toneKey: string, facilityTypeKey?: string): string {
  const body =
    toneKey === 'soft' ? ruleSoftBody :
    toneKey === 'bullet' ? ruleBulletBody :
    toneKey === 'concise' ? ruleConciseBody :
    rulePoliteBody;
  const roleSentence = (facilityTypeKey && facilityRoleSentences[facilityTypeKey]) || facilityRoleSentences.day_service;
  return (
    roleSentence + '\n' +
    '以下の方針を必ず守ってください。\n' +
    body
  );
}
