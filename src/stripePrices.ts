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
  // 年間プラン(15%オフ)用の価格ID。月額と同じ商品に対して、Stripe側で
  // 別途「year」間隔の価格を作成し、そのIDをここに設定する。
  annualStripePriceId: string | null;
}

export const planTiers: PlanTier[] = [
  { key: 'tier1', label: '〜20人', maxResidents: 20, priceYen: 980, stripePriceId: 'price_1UA2jYJT7jCdXWW2nbohoA4K', annualStripePriceId: 'price_1UCIsFJT7jCdXWW2NT7BQ479' },
  { key: 'tier2', label: '〜40人', maxResidents: 40, priceYen: 1980, stripePriceId: 'price_1UA2kCJT7jCdXWW2AAsbwJXi', annualStripePriceId: 'price_1UCIv7JT7jCdXWW289x1Xrod' },
  { key: 'tier3', label: '〜70人', maxResidents: 70, priceYen: 2980, stripePriceId: 'price_1UA2mKJT7jCdXWW2w2AiDrjs', annualStripePriceId: 'price_1UCIvfJT7jCdXWW203YVBqQf' },
  { key: 'tier4', label: '〜110人', maxResidents: 110, priceYen: 3980, stripePriceId: 'price_1UA2maJT7jCdXWW2rh6JPYGI', annualStripePriceId: 'price_1UCIwAJT7jCdXWW2tqKcJBQp' },
  { key: 'tier5', label: '〜150人', maxResidents: 150, priceYen: 4980, stripePriceId: 'price_1UA2moJT7jCdXWW2OR6bNBfT', annualStripePriceId: 'price_1UCIwfJT7jCdXWW2hAQRSfMa' },
];

export const freeGenerationLimit = 10;

// 年間プランの割引率(15%オフ)。
export const annualDiscountRate = 0.15;

// 年間プランの割引前の年額(月額×12)。
export function annualOriginalPriceFor(tier: PlanTier): number {
  return tier.priceYen * 12;
}

// 年間プランの割引後の年額(15%オフ、円未満は四捨五入)。
export function annualPriceFor(tier: PlanTier): number {
  return Math.round(annualOriginalPriceFor(tier) * (1 - annualDiscountRate));
}
