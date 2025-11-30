import type { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface Departure {
  hour: number;
  minute: number;
}

interface Timetable {
  direction: string;
  departures: Departure[];
}

interface Station {
  id: string;
  name: string;
  lineName: string;
  color: string;
  timetables: Timetable[];
}

interface UpdateResponse {
  success: boolean;
  message: string;
  updatedStations?: number;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting timetable data update...');

    // 既存のデータを読み込む
    const dataPath = path.join(process.cwd(), 'data', 'stations.json');
    const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const stations: Station[] = existingData.stations;

    // 各駅のデータを更新
    let updatedCount = 0;
    for (const station of stations) {
      try {
        console.log(`Updating ${station.name}...`);

        // 各駅のスクレイピングを実行
        const updatedTimetables = await scrapeTimetableForStation(station);

        if (updatedTimetables && updatedTimetables.length > 0) {
          station.timetables = updatedTimetables;
          updatedCount++;
          console.log(`Successfully updated ${station.name}`);
        }
      } catch (error) {
        console.error(`Error updating ${station.name}:`, error);
        // 個別の駅のエラーはスキップして続行
      }
    }

    // データをファイルに保存
    const updatedData = {
      stations: stations,
    };

    fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2), 'utf8');

    console.log(`Update completed. ${updatedCount} stations updated.`);

    return res.status(200).json({
      success: true,
      message: `時刻表データを更新しました（${updatedCount}駅）`,
      updatedStations: updatedCount,
    });
  } catch (error) {
    console.error('Timetable update error:', error);
    return res.status(500).json({
      error: '時刻表データの更新中にエラーが発生しました',
    });
  }
}

/**
 * 駅の時刻表をスクレイピングで取得する
 *
 * 注意: この実装は例示用です。実際には各鉄道会社の公式サイトや
 * 時刻表サイトから適切にデータを取得する必要があります。
 */
async function scrapeTimetableForStation(station: Station): Promise<Timetable[]> {
  // ここでは、各駅に応じた時刻表サイトからスクレイピングを行います
  // 実装例として、駅名に基づいてスクレイピング先を決定

  console.log(`Scraping timetable for ${station.name}...`);

  // 駅別のスクレイピングロジック
  switch (station.id) {
    case 'hankai_abikomichi':
      return await scrapeHankaiTimetable(station);
    case 'nankai_suminoe':
      return await scrapeNankaiTimetable(station, '住之江');
    case 'nankai_abikomae':
      return await scrapeNankaiTimetable(station, '我孫子前');
    case 'jr_sugimotocho':
      return await scrapeJRTimetable(station);
    default:
      console.log(`No scraper implemented for ${station.id}`);
      return station.timetables; // 既存データを維持
  }
}

/**
 * 阪堺電車の時刻表をスクレイピング
 */
async function scrapeHankaiTimetable(station: Station): Promise<Timetable[]> {
  // 実装例: 阪堺電車の公式サイトからスクレイピング
  // ここでは既存データを返す（実際のスクレイピングは鉄道会社のサイト構造に依存）
  console.log('Hankai timetable scraping not implemented yet');
  return station.timetables;
}

/**
 * 南海電鉄の時刻表をスクレイピング
 */
async function scrapeNankaiTimetable(station: Station, stationName: string): Promise<Timetable[]> {
  // 実装例: 南海電鉄の公式サイトからスクレイピング
  console.log(`Nankai timetable scraping for ${stationName} not implemented yet`);
  return station.timetables;
}

/**
 * JR西日本の時刻表をスクレイピング
 */
async function scrapeJRTimetable(station: Station): Promise<Timetable[]> {
  // 実装例: JR西日本の公式サイトからスクレイピング
  console.log('JR timetable scraping not implemented yet');
  return station.timetables;
}

/**
 * 汎用的な時刻表スクレイピング関数
 * Yahoo!路線情報などの時刻表ページからデータを取得する例
 */
async function scrapeGenericTimetable(url: string): Promise<Departure[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const departures: Departure[] = [];

    // 時刻表の要素を探してパース
    // 実際のサイト構造に応じて適切なセレクタを使用
    $('.time, .departure-time').each((index, element) => {
      const text = $(element).text().trim();
      const match = text.match(/(\d{1,2}):(\d{2})/);

      if (match) {
        departures.push({
          hour: parseInt(match[1]),
          minute: parseInt(match[2]),
        });
      }
    });

    return departures;
  } catch (error) {
    console.error('Generic scraping error:', error);
    return [];
  }
}
