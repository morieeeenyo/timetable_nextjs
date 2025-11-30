import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { useState, useEffect, useRef } from 'react';
import path from 'path';
import fs from 'fs';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrainIcon from '@mui/icons-material/Train';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

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

interface CombinedDeparture {
  station: Station;
  timetable: Timetable;
  departure: Departure;
  timeInMinutes: number;
}

interface AllTimetablePageProps {
  stations: Station[];
}

export const getStaticProps: GetStaticProps<AllTimetablePageProps> = async () => {
  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const json = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(json);
  return { props: { stations: data.stations } };
};

export default function AllTimetablePage({ stations }: InferGetStaticPropsType<typeof getStaticProps>) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const nextTrainRef = useRef<HTMLLIElement>(null);

  // 現在時刻を1秒ごとに更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 全ての発車時刻を収集してソート
  const getAllDepartures = (): { northbound: CombinedDeparture[], southbound: CombinedDeparture[] } => {
    const all: CombinedDeparture[] = [];

    stations.forEach((station) => {
      station.timetables.forEach((timetable) => {
        timetable.departures.forEach((departure) => {
          all.push({
            station,
            timetable,
            departure,
            timeInMinutes: departure.hour * 60 + departure.minute,
          });
        });
      });
    });

    // 時刻順にソート
    all.sort((a, b) => a.timeInMinutes - b.timeInMinutes);

    // 方向別に分類
    // 北向き: なんば、天王寺方面
    // 南向き: 和歌山、高野山、浜寺方面
    const northbound = all.filter((d) => {
      const dir = d.timetable.direction;
      return dir.includes('なんば') || dir.includes('天王寺');
    });

    const southbound = all.filter((d) => {
      const dir = d.timetable.direction;
      return dir.includes('和歌山') || dir.includes('高野山') || dir.includes('浜寺');
    });

    return { northbound, southbound };
  };

  const { northbound, southbound } = getAllDepartures();
  const currentList = selectedTab === 0 ? northbound : southbound;

  // 次の発車時刻を見つける
  const findNextTrain = (list: CombinedDeparture[]) => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return list.find((dep) => dep.timeInMinutes >= currentMinutes);
  };

  const nextTrain = findNextTrain(currentList);

  // 次の発車時刻までスクロール
  useEffect(() => {
    if (nextTrainRef.current) {
      nextTrainRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const renderList = (list: CombinedDeparture[]) => {
    if (list.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            データがありません
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ px: 2 }}>
        {list.map((item, index) => {
          const isNext = item === nextTrain;
          const timeStr = `${String(item.departure.hour).padStart(2, '0')}:${String(item.departure.minute).padStart(2, '0')}`;

          return (
            <ListItem
              key={`${item.station.id}-${item.timetable.direction}-${index}`}
              ref={isNext ? nextTrainRef : null}
              sx={{
                my: 0.5,
                px: { xs: 1.5, sm: 2.5 },
                py: 2,
                bgcolor: isNext ? item.station.color : 'grey.100',
                borderRadius: 1,
                border: isNext ? `2px solid ${item.station.color}` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                flexWrap: { xs: 'wrap', md: 'nowrap' },
              }}
            >
              {/* Time display */}
              <Box
                sx={{
                  minWidth: { xs: 75, sm: 90 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isNext ? 'white' : `${item.station.color}20`,
                  borderRadius: 1,
                  border: isNext ? 'none' : `2px solid ${item.station.color}`,
                  px: { xs: 1, sm: 2 },
                  py: 1,
                  flexShrink: 0,
                }}
              >
                <AccessTimeIcon
                  sx={{
                    color: isNext ? item.station.color : item.station.color,
                    fontSize: { xs: 18, sm: 20 },
                    mr: 0.5,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 'bold',
                    color: isNext ? item.station.color : item.station.color,
                    letterSpacing: 1,
                  }}
                >
                  {timeStr}
                </Typography>
              </Box>

              {/* Station and direction info */}
              <Box sx={{ flex: 1, minWidth: { xs: '150px', sm: '200px' } }}>
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    fontSize: { xs: 14, sm: 16 },
                    color: isNext ? 'white' : 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {item.station.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 12, sm: 14 },
                    color: isNext ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary',
                  }}
                >
                  {item.station.lineName} - {item.timetable.direction}
                </Typography>
              </Box>

              {/* Train icon and next badge wrapper */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexShrink: 0,
                }}
              >
                {/* Train icon */}
                <TrainIcon
                  sx={{
                    color: isNext ? 'white' : item.station.color,
                    fontSize: { xs: 24, sm: 28 },
                  }}
                />

                {/* Next train badge */}
                {isNext && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      bgcolor: 'white',
                      borderRadius: 1.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: 12, sm: 14 },
                        fontWeight: 'bold',
                        color: item.station.color,
                      }}
                    >
                      次の発車
                    </Typography>
                  </Box>
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', pb: 0 }}>
        <Container maxWidth="lg">
          <Box sx={{ pt: 2, pb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              全駅時刻表
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              全ての駅の発車時刻を統合表示
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                fontSize: '1rem',
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.3s',
              },
              '& .Mui-selected': {
                color: 'primary.dark',
                bgcolor: 'white',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
                height: 4,
              },
            }}
          >
            <Tab label={`北向き (なんば・天王寺) - ${northbound.length}本`} />
            <Tab label={`南向き (和歌山・高野山・浜寺) - ${southbound.length}本`} />
          </Tabs>
        </Container>
      </Box>

      {/* Timetable list */}
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {renderList(currentList)}
      </Container>
    </Box>
  );
}
