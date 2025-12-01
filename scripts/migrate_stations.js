const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'data', 'stations.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

const updatedStations = data.stations.map(station => {
 // Check if already migrated
 if (station.timetables && !Array.isArray(station.timetables) && station.timetables.weekdays) {
  return station;
 }

 const originalTimetables = station.timetables || [];

 return {
  ...station,
  timetables: {
   weekdays: originalTimetables,
   holidays: JSON.parse(JSON.stringify(originalTimetables)) // Deep copy for now
  }
 };
});

const updatedData = { stations: updatedStations };

fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 1), 'utf8'); // Using 1 space indentation to keep file size reasonable but readable
console.log('Migration completed successfully.');
