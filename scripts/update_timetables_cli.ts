// @ts-nocheck
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Yahoo Transit Station IDs and Direction GIDs
const STATION_CONFIG = {
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

async function main() {
 try {
  console.log('Starting timetable data update...');

  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const stations = existingData.stations;

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
 } catch (error) {
  console.error('Timetable update error:', error);
 }
}

async function scrapeTimetablesForStation(config, kind) {
 const timetables = [];

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

async function scrapeYahooTimetable(url) {
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
  const departures = [];

  console.log(`Debug: Found ${$('table').length} tables on ${url}`);
  $('table').each((i, table) => {
   console.log(`Table ${i}: id="${$(table).attr('id')}", class="${$(table).attr('class')}"`);
  });

  // Try to find the timetable table
  // Usually it has class 'tbl-dia' or id starting with 'dt'
  let timetableRows = $('.tbl-dia tr');
  if (timetableRows.length === 0) {
   console.log('Debug: .tbl-dia not found, trying generic table search');
   timetableRows = $('table tr');
  }

  console.log(`Debug: Found ${timetableRows.length} rows`);

  timetableRows.each((i, row) => {
   const hourText = $(row).find('.col-hour').text().trim(); // Try .col-hour
   let hour = parseInt(hourText);

   // If .col-hour not found, try first cell
   if (isNaN(hour)) {
    const firstCell = $(row).find('td, th').first().text().trim();
    hour = parseInt(firstCell);
   }

   if (!isNaN(hour)) {
    // console.log(`Debug: Found hour ${hour}`);
    $(row).find('.col-min li, td li, td span').each((j, minItem) => {
     // Try various selectors for minute
     let minText = $(minItem).find('.time').text().trim();
     if (!minText) minText = $(minItem).text().trim();

     const match = minText.match(/^(\d+)/);

     if (match) {
      departures.push({
       hour: hour,
       minute: parseInt(match[1]),
      });
     }
    });
   }
  });

  console.log(`Debug: Extracted ${departures.length} departures`);

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

main();
