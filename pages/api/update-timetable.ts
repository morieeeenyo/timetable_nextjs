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

interface StationTimetables {
  weekdays: Timetable[];
  holidays: Timetable[];
}

interface Station {
  id: string;
  name: string;
  lineName: string;
  color: string;
  timetables: StationTimetables;
}

interface UpdateResponse {
  success: boolean;
  message: string;
  updatedStations?: number;
}

interface ErrorResponse {
  error: string;
}

// Yahoo Transit Station IDs and Direction GIDs
const STATION_CONFIG: Record<string, { id: string; directions: { name: string; gid: number }[] }> = {
  hankai_abikomichi: {
    id: '25809',
    directions: [
      { name: '天王寺駅前 方面', gid: 5690 },
      { name: '浜寺駅前 方面', gid: 5691 },
    ],
  },
  nankai_suminoe: {
    id: '25989',
    directions: [
      { name: 'なんば 方面', gid: 3950 },
      { name: '和歌山市 方面', gid: 3951 },
    ],
  },
  nankai_abikomae: {
    id: '25808',
    directions: [
      { name: 'なんば 方面', gid: 4010 },
      { name: '高野山 方面', gid: 4011 },
    ],
  },
  jr_sugimotocho: {
    id: '25988',
    directions: [
      { name: '天王寺 方面', gid: 1720 },
      { name: '和歌山 方面', gid: 1721 },
    ],
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting timetable data update...');

    const dataPath = path.join(process.cwd(), 'data', 'stations.json');
    const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const stations: Station[] = existingData.stations;

    let updatedCount = 0;
    for (const station of stations) {
      try {
        console.log(`Updating ${station.name}...`);

        const config = STATION_CONFIG[station.id];
        if (!config) {
          console.log(`No configuration found for ${station.id}, skipping.`);
          continue;
        }

        // Scrape Weekdays (kind=1)
        const weekdaysTimetables = await scrapeTimetablesForStation(config, 1);

        // Scrape Holidays (kind=4) - Sunday/Holiday
        const holidaysTimetables = await scrapeTimetablesForStation(config, 4);

        if (weekdaysTimetables.length > 0 && holidaysTimetables.length > 0) {
          station.timetables = {
            weekdays: weekdaysTimetables,
            holidays: holidaysTimetables,
          };
          updatedCount++;
          console.log(`Successfully updated ${station.name}`);
        }
      } catch (error) {
        console.error(`Error updating ${station.name}:`, error);
      }
    }

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

async function scrapeTimetablesForStation(
  config: { id: string; directions: { name: string; gid: number }[] },
  kind: number
): Promise<Timetable[]> {
  const timetables: Timetable[] = [];

  for (const direction of config.directions) {
    const url = `https://transit.yahoo.co.jp/timetable/${config.id}/${direction.gid}?kind=${kind}`;
    console.log(`Scraping ${url} for ${direction.name}...`);

    const departures = await scrapeYahooTimetable(url);
    if (departures.length > 0) {
      timetables.push({
        direction: direction.name,
        departures: departures,
      });
    }
  }

  return timetables;
}

async function scrapeYahooTimetable(url: string): Promise<Departure[]> {
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

    // Select the timetable rows
    // Yahoo Transit structure: #tab-1 > .tbl-dia > tr (hours) > td (minutes)
    // The minutes are inside <ul> <li> <a ...>minute</a> </li> </ul>
    // Or sometimes directly in td depending on the view.
    // Let's target the minute links which usually have class 'time' or similar, or just parse the text.

    // Yahoo Transit usually has a table with id="tbl-dia-detail" or class="tbl-dia"
    // Rows correspond to hours.

    $('.tbl-dia tr').each((i, row) => {
      // The first cell is the hour
      const hourText = $(row).find('.col-hour').text().trim();
      const hour = parseInt(hourText);

      if (!isNaN(hour)) {
        // The second cell contains the minutes
        $(row).find('.col-min li').each((j, minItem) => {
          // Extract minute. Sometimes it has destination info, e.g. "05[天]"
          // We just want the number.
          const minText = $(minItem).find('.time').text().trim(); // Usually inside .time class
          // If .time doesn't exist, try direct text or other structure
          const minuteStr = minText || $(minItem).text().trim().replace(/\D/g, ''); // Fallback

          // Yahoo Transit minutes are often wrapped in <dt> or just text in <a>
          // Let's look for the number at the start
          const match = $(minItem).text().trim().match(/^(\d+)/);

          if (match) {
            departures.push({
              hour: hour,
              minute: parseInt(match[1]),
            });
          }
        });
      }
    });

    // Sort departures just in case
    departures.sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    return departures;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}
