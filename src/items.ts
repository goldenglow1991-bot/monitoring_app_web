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
  { key: 'swallowing', label: '食事・嚥下機能' },
  { key: 'communication', label: '会話' },
  { key: 'cognitive', label: '認知機能' },
  { key: 'mental', label: '精神・心理面' },
  { key: 'condition', label: '体調・健康管理' },
  { key: 'social', label: '社会参加・活動' },
  { key: 'other', label: '生活支援・福祉用具' },
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
  // 運動
  { key: 'exercise_type', label: '運動の種類', categoryKey: 'exercise', options: [
    UNSET, '有酸素運動', '筋力トレーニング', 'バランス訓練', 'ストレッチ・体操', '複数種目を組み合わせて実施', '実施なし',
  ] },
  { key: 'exercise_count', label: '運動の数', categoryKey: 'exercise', options: [
    UNSET, '1種類', '2種類', '3種類', '4種類', '5種類以上',
  ] },
  { key: 'exercise_time', label: '運動の時間', categoryKey: 'exercise', options: [
    UNSET, '10分未満', '10〜20分程度', '20〜30分程度', '30〜40分程度', '40分以上',
  ] },
  { key: 'gait_training', label: '歩行訓練', categoryKey: 'exercise', options: [
    UNSET, '実施(自立で歩行)', '実施(見守りで歩行)', '実施(一部介助で歩行)', '実施なし',
  ] },
  { key: 'rehab_motivation', label: 'リハビリへの参加意欲', categoryKey: 'exercise', options: [
    UNSET, '意欲的に取り組めている', '概ね取り組めている', '声かけが必要', '消極的・拒否あり',
  ] },
  { key: 'exercise_condition', label: '運動時の様子', categoryKey: 'exercise', options: [
    UNSET, '疲労少なく取り組めている', 'やや疲労感がみられる', '痛みの訴えがある', '呼吸苦・体調不良の訴えがある',
  ] },

  // 日常生活動作(ADL)
  { key: 'transfer_movement', label: '移乗・移動動作', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '非該当(寝たきり等)',
  ] },
  { key: 'gait', label: '歩行', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '非該当(車椅子等)',
  ] },
  { key: 'balance_stability', label: '立位・バランス能力', categoryKey: 'adl', options: [
    UNSET, '安定', 'やや不安定', '不安定', '測定・実施できず',
  ] },
  { key: 'dressing', label: '更衣', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助',
  ] },
  { key: 'toileting', label: 'トイレ動作', categoryKey: 'adl', options: [
    UNSET, '自立(問題なし)', '声かけ・誘導が必要', '一部介助', '全介助(おむつ使用)', '失禁がみられる',
  ] },
  { key: 'bathing', label: '入浴・清潔維持', categoryKey: 'adl', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助', '拒否がみられる',
  ] },

  // 食事・嚥下機能
  { key: 'meal_independence', label: '食事の自立度', categoryKey: 'swallowing', options: [
    UNSET, '自立', '見守り', '一部介助', '全介助',
  ] },
  { key: 'meal_intake_amount', label: '摂取量・食欲', categoryKey: 'swallowing', options: [
    UNSET, '良好(全量摂取)', 'やや良好', '低下傾向', '低下(半量以下)', '拒否あり',
  ] },
  { key: 'choking_sign', label: 'むせ・誤嚥兆候', categoryKey: 'swallowing', options: [
    UNSET, 'なし', 'ときどきあり', '頻繁にあり',
  ] },
  { key: 'hydration', label: '水分摂取', categoryKey: 'swallowing', options: [
    UNSET, '良好', '促しが必要', '拒否あり',
  ] },
  { key: 'oral_condition', label: '口腔内の状態', categoryKey: 'swallowing', options: [
    UNSET, '良好', '乾燥がみられる', '口内炎・傷がある', '義歯が合っていない様子', '口腔ケアへの介助が必要',
  ] },
  { key: 'weight_change', label: '体重の変化', categoryKey: 'swallowing', options: [
    UNSET, '増加', '維持', '軽度の減少', '著明な減少', '未測定',
  ] },
  { key: 'meal_form', label: '食事形態', categoryKey: 'swallowing', options: [
    UNSET, '常食', '一口大', '刻み食', 'とろみ食', 'ミキサー食',
  ] },

  // 会話
  { key: 'communication', label: '会話', categoryKey: 'communication', options: [
    UNSET, '良好', 'やや良好', 'やや低下', '低下', '困難',
  ] },
  { key: 'facial_expression', label: '表情・感情表出', categoryKey: 'communication', options: [
    UNSET, '穏やか・明るい', 'やや乏しい', '硬い表情が多い', '感情の起伏が激しい',
  ] },
  { key: 'social_interaction', label: '他利用者・スタッフとの交流', categoryKey: 'communication', options: [
    UNSET, '積極的', '声かけには応じる', '受け身がち', '交流を避ける傾向',
  ] },
  { key: 'speech_clarity', label: '発話明瞭度', categoryKey: 'communication', options: [
    UNSET, '明瞭', 'やや不明瞭', '不明瞭', '発語がみられない',
  ] },

  // 認知機能
  { key: 'cognitive_function', label: '認知機能', categoryKey: 'cognitive', options: [
    UNSET, '良好', '維持', 'やや低下', '低下', '困難',
  ] },
  { key: 'orientation', label: '見当識', categoryKey: 'cognitive', options: [
    UNSET, '良好', 'やや低下(日時のあいまいさ)', '低下(場所の混乱あり)', '著しい低下',
  ] },
  { key: 'memory', label: '記憶力', categoryKey: 'cognitive', options: [
    UNSET, '良好', '物忘れがときどきみられる', '物忘れが頻繁にみられる', '記憶障害が進行している',
  ] },
  { key: 'bpsd', label: '周辺症状', categoryKey: 'cognitive', options: [
    UNSET, 'なし', '時々みられる(徘徊・不穏等)', '頻繁にみられる', '対応に苦慮するレベル',
  ] },
  { key: 'judgment', label: '判断力・意思決定', categoryKey: 'cognitive', options: [
    UNSET, '良好', 'やや低下', '低下', '判断が困難',
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
  { key: 'vitals', label: 'バイタル', categoryKey: 'condition', options: [
    UNSET, '良好', '最高血圧が高い', '最高血圧が低い', '最低血圧が高い', '最低血圧が低い',
    '脈拍が高い', '脈拍が低い',
  ] },
  { key: 'fall_injury', label: '転倒やけが', categoryKey: 'condition', options: [
    UNSET, 'なし', '軽微な転倒あり(けがなし)', '転倒・けがあり', 'ヒヤリハットあり',
  ] },
  { key: 'sleep_condition', label: '睡眠状況', categoryKey: 'condition', options: [
    UNSET, '良好', '中途覚醒がみられる', '不眠傾向', '昼夜逆転がみられる',
  ] },
  { key: 'medication_management', label: '服薬', categoryKey: 'condition', options: [
    UNSET, '自己管理できている', '声かけが必要', '一部介助(配薬等)', '全介助', '服薬拒否・飲み忘れあり',
  ] },
  { key: 'medical_treatment', label: '医療処置', categoryKey: 'condition', options: [
    UNSET, '特記事項なし', '処置を実施(経過良好)', '処置を実施(経過観察中)', '状態変化あり(要報告)',
  ] },
  { key: 'skin_condition', label: '皮膚状態', categoryKey: 'condition', options: [
    UNSET, '異常なし', '発赤あり(観察継続)', '褥瘡あり(軽度)', '褥瘡あり(処置対応中)',
  ] },
  { key: 'pain', label: '疼痛の有無・程度', categoryKey: 'condition', options: [
    UNSET, 'なし', '軽度の訴えあり', '中等度の訴えあり', '強い訴えあり(対応が必要)',
  ] },

  // 社会参加・活動
  { key: 'recreation_participation', label: 'レクリエーション・行事への参加', categoryKey: 'social', options: [
    UNSET, '積極的に参加', '声かけで参加', '見学が多い', '参加を拒否する傾向',
  ] },
  { key: 'role_purpose', label: '役割保持・生きがい活動', categoryKey: 'social', options: [
    UNSET, 'あり(継続できている)', 'あり(やや消極的)', '特になし', '本人の希望を聴取中',
  ] },

  // 生活支援・福祉用具
  { key: 'mobility_aid', label: '杖・歩行器・装具等の使用状況', categoryKey: 'other', options: [
    UNSET, '使用なし', '杖を使用', '歩行器を使用', '車椅子を使用', '装具を使用',
  ] },
  { key: 'outing', label: '外出の有無', categoryKey: 'other', options: [
    UNSET, '積極的に外出している', '声かけで外出する', '外出の機会は少ない', '外出はほとんどない',
  ] },
  { key: 'community_activity', label: '地域活動・交流状況', categoryKey: 'other', options: [
    UNSET, '積極的に参加', 'たまに参加', '参加はほとんどない', '該当なし',
  ] },
  { key: 'home_environment_burden', label: '居宅環境・介護者(家族)の負担感', categoryKey: 'other', options: [
    UNSET, '特に問題なし', '軽度の負担感あり', '中等度の負担感あり', '強い負担感・支援が必要',
  ] },
];

// モード選択画面のカテゴリー表示順(itemCategoriesの並び→カテゴリー内は
// itemCatalogの登録順)に合わせてkeysを並べ替える。新規登録時の初期値や
// 施設種別プリセットを適用した直後など、まだユーザーが並び替えていない
// 状態の並び順をこれで統一する(ユーザーが一度でも並び替えた後の順序や、
// 既に有効になっている項目に個別に追加する際の挿入位置には影響しない)。
export function canonicalItemOrder(keys: string[]): string[] {
  const categoryIndex = new Map(itemCategories.map((c, i) => [c.key, i] as const));
  const itemIndex = new Map(itemCatalog.map((item, i) => [item.key, i] as const));
  return [...keys].sort((a, b) => {
    const itemA = itemCatalog.find((i) => i.key === a);
    const itemB = itemCatalog.find((i) => i.key === b);
    const catA = itemA ? categoryIndex.get(itemA.categoryKey) ?? 999 : 999;
    const catB = itemB ? categoryIndex.get(itemB.categoryKey) ?? 999 : 999;
    if (catA !== catB) return catA - catB;
    return (itemIndex.get(a) ?? 999) - (itemIndex.get(b) ?? 999);
  });
}

// 表示項目の設定(config.enabled_items)が未設定のときのデフォルト。
// 既存10項目のみ、モード選択画面のカテゴリー表示順に整列。
export const defaultEnabledItemKeys: string[] = canonicalItemOrder([
  'exercise_type',
  'exercise_time',
  'gait_training',
  'gait',
  'vitals',
  'communication',
  'cognitive_function',
  'fall_injury',
  'meal_intake_amount',
  'toileting',
]);

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
    'exercise_type', 'exercise_time', 'gait_training', 'gait',
    'vitals', 'communication', 'cognitive_function',
    'fall_injury', 'rehab_motivation', 'balance_stability',
    'recreation_participation', 'motivation_activity', 'facial_expression',
    'social_interaction', 'meal_intake_amount',
  ] },
  { key: 'home_care', label: '訪問介護', itemKeys: [
    'outing', 'transfer_movement', 'dressing', 'toileting', 'bathing',
    'communication', 'vitals', 'fall_injury', 'home_environment_burden',
    'medication_management', 'meal_intake_amount',
  ] },
  { key: 'home_nursing', label: '訪問看護・訪問リハビリ', itemKeys: [
    'vitals', 'medical_treatment', 'medication_management', 'skin_condition',
    'sleep_condition', 'meal_intake_amount', 'weight_change', 'choking_sign',
    'hydration', 'fall_injury', 'cognitive_function', 'orientation',
    'communication', 'home_environment_burden', 'pain', 'balance_stability',
  ] },
  { key: 'facility', label: '施設系(特養・老健・介護医療院・短期入所)', itemKeys: [
    'transfer_movement', 'dressing', 'toileting', 'bathing', 'meal_form',
    'choking_sign', 'hydration', 'meal_intake_amount', 'weight_change', 'vitals',
    'fall_injury', 'skin_condition', 'sleep_condition', 'medication_management',
    'medical_treatment', 'cognitive_function', 'orientation', 'bpsd', 'judgment',
    'communication', 'emotional_stability', 'anxiety_depression',
    'recreation_participation', 'role_purpose', 'pain',
  ] },
  { key: 'group_home', label: 'グループホーム・認知症対応型通所', itemKeys: [
    'cognitive_function', 'orientation', 'bpsd', 'judgment', 'communication',
    'facial_expression', 'social_interaction', 'motivation_activity',
    'emotional_stability', 'anxiety_depression', 'memory', 'meal_intake_amount',
    'hydration', 'sleep_condition', 'fall_injury', 'recreation_participation',
    'role_purpose',
  ] },
  { key: 'residential', label: '特定施設・小規模多機能型(入居・複合型)', itemKeys: [
    'transfer_movement', 'toileting', 'bathing', 'meal_intake_amount', 'hydration',
    'vitals', 'fall_injury', 'medication_management', 'cognitive_function',
    'orientation', 'communication', 'emotional_stability', 'recreation_participation',
    'mobility_aid', 'sleep_condition',
  ] },
  { key: 'care_manager', label: '居宅介護支援(ケアマネ)・福祉用具貸与など', itemKeys: [
    'outing', 'communication', 'home_environment_burden', 'fall_injury',
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
