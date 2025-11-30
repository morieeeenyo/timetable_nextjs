import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { useState } from 'react';
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
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleUpdateData = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/update-timetable', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('データ更新に失敗しました');
      }

      const result = await response.json();
      setSnackbar({
        open: true,
        message: result.message || 'データを更新しました',
        severity: 'success',
      });

      // ページをリロードしてデータを再取得
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'エラーが発生しました',
        severity: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
        時刻表アプリ
      </Typography>

      {/* Update Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={updating ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleUpdateData}
          disabled={updating}
          sx={{
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          {updating ? '更新中...' : '時刻表データを更新'}
        </Button>
      </Box>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        駅一覧
      </Typography>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

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
