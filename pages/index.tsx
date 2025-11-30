import { GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import DirectionsIcon from '@mui/icons-material/Directions';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface Station {
  id: string;
  name: string;
  lineName: string;
  color: string;
}

interface IndexProps {
  stations: Station[];
}

export const getStaticProps: GetStaticProps<IndexProps> = async () => {
  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const json = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(json);
  return { props: { stations: data.stations } };
};

export default function Home({ stations }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        時刻表アプリ
      </Typography>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        駅一覧
      </Typography>

      <Grid container spacing={3}>
        {stations.map((station) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={station.id}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea
                component={Link}
                href={`/station/${station.id}`}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: station.color,
                      mr: 2,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="h6" component="div">
                    {station.name}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 0, width: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    {station.lineName}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
