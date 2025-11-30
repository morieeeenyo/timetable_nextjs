import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
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
  Badge,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

interface StationPageProps {
  station: Station | null;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const json = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(json);
  const paths = data.stations.map((s: Station) => ({ params: { id: s.id } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<StationPageProps> = async (context) => {
  const { id } = context.params as { id: string };
  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const json = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(json);
  const station = data.stations.find((s: Station) => s.id === id) || null;
  return { props: { station } };
};

export default function StationPage({ station }: InferGetStaticPropsType<typeof getStaticProps>) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const nextTrainRef = useRef<HTMLLIElement>(null);

  if (!station) return <Typography>Station not found</Typography>;

  // 現在時刻を1秒ごとに更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // 選択されたタブの時刻表を取得
  const currentTimetable = station.timetables[selectedTab];

  // 次の発車時刻を見つける
  const findNextTrain = () => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return currentTimetable.departures.find((dep) => {
      const depMinutes = dep.hour * 60 + dep.minute;
      return depMinutes >= currentMinutes;
    });
  };

  const nextTrain = findNextTrain();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Back button - outside the header for better visibility */}
      <Container maxWidth="lg">
        <Box sx={{ pt: 2, pb: 1 }}>
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{
              borderColor: station.color,
              color: station.color,
              fontWeight: 'bold',
              '&:hover': {
                borderColor: station.color,
                bgcolor: `${station.color}10`,
              },
            }}
          >
            駅一覧に戻る
          </Button>
        </Box>
      </Container>

      {/* Header with station color */}
      <Box sx={{ bgcolor: station.color, color: 'white', pb: 0 }}>
        <Container maxWidth="lg">
          <Box sx={{ pt: 2, pb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {station.name}
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              {station.lineName}
            </Typography>
          </Box>

          {/* Tabs integrated in header */}
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
                color: station.color,
                bgcolor: 'white',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
                height: 4,
              },
            }}
          >
            {station.timetables.map((tt, idx) => (
              <Tab key={idx} label={tt.direction} />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* Timetable list */}
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <List sx={{ px: 2 }}>
          {currentTimetable.departures.map((departure, index) => {
            const isNext = departure === nextTrain;
            const timeStr = `${String(departure.hour).padStart(2, '0')}:${String(departure.minute).padStart(2, '0')}`;

            return (
              <ListItem
                key={index}
                ref={isNext ? nextTrainRef : null}
                sx={{
                  my: 0.5,
                  px: 2.5,
                  py: 2,
                  bgcolor: isNext ? station.color : 'grey.100',
                  borderRadius: 1,
                  border: isNext ? `2px solid ${station.color}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AccessTimeIcon
                  sx={{
                    color: isNext ? 'white' : 'text.secondary',
                    fontSize: 24,
                    mr: 2,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 24,
                    fontWeight: isNext ? 'bold' : 500,
                    color: isNext ? 'white' : 'text.primary',
                    letterSpacing: 1.2,
                  }}
                >
                  {timeStr}
                </Typography>
                {isNext && (
                  <Box
                    sx={{
                      ml: 'auto',
                      px: 1.5,
                      py: 0.75,
                      bgcolor: 'white',
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: station.color,
                      }}
                    >
                      次の発車
                    </Typography>
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      </Container>
    </Box>
  );
}
