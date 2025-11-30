import type { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';

interface RouteDetail {
  line: string;
  from: string;
  to: string;
  time: number;
  type: 'train' | 'walk';
}

interface TransitSearchResponse {
  totalTime: number;
  totalCost: number;
  transferCount: number;
  distance: number;
  route: RouteDetail[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransitSearchResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: '出発地と目的地を指定してください' });
  }

  try {
    // Yahoo!乗換案内のURLを構築
    const url = new URL('https://transit.yahoo.co.jp/search/result');
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);
    url.searchParams.append('flatlon', '');
    url.searchParams.append('tlatlon', '');
    url.searchParams.append('type', '1'); // 1: 到着が早い順
    url.searchParams.append('ticket', 'ic'); // IC優先
    url.searchParams.append('expkind', '1'); // 有料特急利用
    url.searchParams.append('userpass', '1'); // 定期券利用
    url.searchParams.append('ws', '3'); // 歩く速度：普通
    url.searchParams.append('s', '0'); // 終電・始発検索：現在時刻
    url.searchParams.append('al', '1'); // 空路使用
    url.searchParams.append('shin', '1'); // 新幹線使用
    url.searchParams.append('ex', '1'); // 特急使用
    url.searchParams.append('hb', '1'); // 高速バス使用
    url.searchParams.append('lb', '1'); // 路線バス使用
    url.searchParams.append('sr', '1'); // 有料特急使用

    console.log('Fetching URL:', url.toString());

    // Yahoo!乗換案内のページを取得
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      throw new Error('Yahoo!乗換案内のページ取得に失敗しました');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 経路リストを探す - より柔軟な検索
    let routeSection = $('.route.detail').first();
    if (routeSection.length === 0) {
      routeSection = $('.routeSummary').first();
    }
    if (routeSection.length === 0) {
      routeSection = $('[class*="route"]').first();
    }

    if (routeSection.length === 0) {
      console.error('Route section not found');
      return res.status(400).json({ error: '経路が見つかりませんでした。駅名を正確に入力してください。' });
    }

    // 所要時間を取得 - 複数のパターンを試す
    let totalTime = 0;

    // パターン1: .time要素から取得
    let timeElement = routeSection.find('.time').first();
    if (timeElement.length === 0) {
      timeElement = routeSection.find('[class*="time"]').first();
    }

    const timeText = timeElement.text().trim();
    console.log('Time text:', timeText);

    // 時間のパースを改善
    const hourMinMatch = timeText.match(/(\d+)\s*時間\s*(\d+)\s*分/);
    const minMatch = timeText.match(/(\d+)\s*分/);

    if (hourMinMatch) {
      totalTime = parseInt(hourMinMatch[1]) * 60 + parseInt(hourMinMatch[2]);
    } else if (minMatch) {
      totalTime = parseInt(minMatch[1]);
    }

    console.log('Total time (minutes):', totalTime);

    // 料金を取得 - 複数のパターンを試す
    let totalCost = 0;

    let fareElement = routeSection.find('.fare').first();
    if (fareElement.length === 0) {
      fareElement = routeSection.find('[class*="fare"]').first();
    }
    if (fareElement.length === 0) {
      fareElement = routeSection.find('[class*="cost"]').first();
    }

    const fareText = fareElement.text().trim();
    console.log('Fare text:', fareText);

    const fareMatch = fareText.match(/(\d{1,3}(?:,\d{3})*)/);
    if (fareMatch) {
      totalCost = parseInt(fareMatch[1].replace(/,/g, ''));
    }

    console.log('Total cost:', totalCost);

    // 乗換回数を取得 - 複数のパターンを試す
    let transferCount = 0;

    // パターン1: .transfer要素から取得
    let transferElement = routeSection.find('.transfer').first();
    if (transferElement.length === 0) {
      transferElement = routeSection.find('[class*="transfer"]').first();
    }

    let transferText = transferElement.text().trim();
    console.log('Transfer text:', transferText);

    // 「乗換X回」のパターンをマッチ
    let transferMatch = transferText.match(/乗換\s*(\d+)\s*回/);
    if (!transferMatch) {
      // 「X回」のパターンをマッチ
      transferMatch = transferText.match(/(\d+)\s*回/);
    }

    if (transferMatch) {
      transferCount = parseInt(transferMatch[1]);
    } else {
      // 経路詳細から乗換回数を計算
      const trainSections = routeSection.find('[class*="route"] li').filter((i, el) => {
        const text = $(el).text();
        return !text.includes('徒歩') && text.length > 0;
      });
      if (trainSections.length > 1) {
        transferCount = trainSections.length - 1;
      }
    }

    console.log('Transfer count:', transferCount);

    // 距離を取得
    let distance = 0;
    const distanceElement = routeSection.find('[class*="distance"]');
    const distanceText = distanceElement.text().trim();
    const distanceMatch = distanceText.match(/(\d+(?:\.\d+)?)\s*km/);
    if (distanceMatch) {
      distance = parseFloat(distanceMatch[1]) * 1000;
    }

    // 経路詳細を取得
    const route: RouteDetail[] = [];

    // ルートの詳細リストを取得
    const routeList = routeSection.find('li, .routeDetail li, [class*="route"] li');

    console.log('Route list items found:', routeList.length);

    routeList.each((index, element) => {
      const item = $(element);
      const text = item.text().trim();

      console.log(`Route item ${index}:`, text);

      // 徒歩区間の判定
      if (text.includes('徒歩')) {
        const walkTimeMatch = text.match(/(\d+)\s*分/);
        const time = walkTimeMatch ? parseInt(walkTimeMatch[1]) : 0;

        route.push({
          line: '徒歩',
          from: '',
          to: '',
          time,
          type: 'walk',
        });
      } else if (text.length > 0) {
        // 電車区間
        // 路線名を抽出
        const lineNameElement = item.find('[class*="line"]');
        let lineName = lineNameElement.text().trim();

        if (!lineName || lineName.length === 0) {
          // 要素全体から路線名を抽出
          const lines = text.split(/\s+/);
          lineName = lines[0] || '不明';
        }

        // 駅名を抽出
        const stationElements = item.find('[class*="station"]');
        const fromStation = stationElements.first().text().trim();
        const toStation = stationElements.last().text().trim();

        // 時間を抽出
        const timeMatch = text.match(/(\d+)\s*分/);
        const time = timeMatch ? parseInt(timeMatch[1]) : 0;

        if (lineName && lineName.length > 0) {
          route.push({
            line: lineName,
            from: fromStation || '',
            to: toStation || '',
            time,
            type: 'train',
          });
        }
      }
    });

    console.log('Extracted route details:', route);

    // 経路詳細が取得できなかった場合の代替処理
    if (route.length === 0) {
      // より広範囲に検索
      const allText = routeSection.text();
      console.log('Fallback: analyzing full text');

      // 最低限の情報として、出発地と目的地を設定
      route.push({
        line: '経路詳細取得中',
        from: from,
        to: to,
        time: totalTime,
        type: 'train',
      });
    }

    return res.status(200).json({
      totalTime,
      totalCost,
      transferCount,
      distance,
      route,
    });
  } catch (error) {
    console.error('Yahoo transit scraping error:', error);
    return res.status(500).json({
      error: '経路検索中にエラーが発生しました。出発地と目的地の名称を正確に入力してください。',
    });
  }
}
