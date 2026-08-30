// 料金プランの定義。Stripe側で作成した価格(Price)のIDをここに設定する。
// Price IDは秘密情報ではないため、コードにそのまま書いてよい
// (Stripeの秘密鍵はサーバー側の環境変数のみに置き、ここには書かない)。

export interface PlanTier {
  key: string;
  label: string;
  maxResidents: number;
  priceYen: number;
  // Stripeダッシュボードで作成した価格のID(price_で始まる文字列)。
  // 未設定の間はプラン選択画面に「準備中」と表示される。
  stripePriceId: string | null;
}

export const planTiers: PlanTier[] = [
  { key: 'tier1', label: '〜20人', maxResidents: 20, priceYen: 980, stripePriceId: 'price_1UA2jYJT7jCdXWW2nbohoA4K' },
  { key: 'tier2', label: '〜40人', maxResidents: 40, priceYen: 1980, stripePriceId: 'price_1UA2kCJT7jCdXWW2AAsbwJXi' },
  { key: 'tier3', label: '〜70人', maxResidents: 70, priceYen: 2980, stripePriceId: 'price_1UA2mKJT7jCdXWW2w2AiDrjs' },
  { key: 'tier4', label: '〜120人', maxResidents: 120, priceYen: 3980, stripePriceId: 'price_1UA2maJT7jCdXWW2rh6JPYGI' },
  { key: 'tier5', label: '〜150人', maxResidents: 150, priceYen: 4980, stripePriceId: 'price_1UA2moJT7jCdXWW2OR6bNBfT' },
];

export const freeGenerationLimit = 10;
