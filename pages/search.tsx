import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { useState } from 'react';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Station {
  id: string;
  name: string;
  lineName: string;
  color: string;
}

interface SearchPageProps {
  stations: Station[];
}

export const getStaticProps: GetStaticProps<SearchPageProps> = async () => {
  const dataPath = path.join(process.cwd(), 'data', 'stations.json');
  const json = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(json);
  return { props: { stations: data.stations } };
};

export default function SearchPage({ stations }: InferGetStaticPropsType<typeof getStaticProps>) {
  const [destination, setDestination] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    if (!destination) {
      return;
    }
    setShowResults(true);
  };

  const generateYahooTransitUrl = (from: string, to: string) => {
    const url = new URL('https://transit.yahoo.co.jp/search/result');
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);
    url.searchParams.append('type', '1'); // 到着が早い順
    url.searchParams.append('ticket', 'ic'); // IC優先
    return url.toString();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 3, mb: 3 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            駅別経路比較
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            4つの駅からYahoo!乗換案内で経路を検索
          </Typography>
        </Container>
      </Box>

      {/* Search Form */}
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Destination Input */}
            <TextField
              label="目的地"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="例: なんば駅、梅田駅、大阪駅"
              sx={{ flex: 1, minWidth: '250px' }}
              variant="outlined"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />

            {/* Search Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!destination}
              sx={{ py: 1.5, px: 4 }}
            >
              経路を検索
            </Button>
          </Box>

          {/* Station List */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              検索対象の駅:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {stations.map((station) => (
                <Chip
                  key={station.id}
                  label={station.name}
                  size="small"
                  sx={{
                    bgcolor: `${station.color}20`,
                    borderColor: station.color,
                    border: 1,
                    fontWeight: 'bold',
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Paper>

        {/* Search Results */}
        {showResults && destination && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
              検索結果
            </Typography>

            <Stack spacing={2}>
              {stations.map((station) => (
                <Card
                  key={station.id}
                  sx={{
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexWrap: { xs: 'wrap', md: 'nowrap' },
                      }}
                    >
                      {/* Station Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '250px', flex: '0 0 auto' }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: station.color,
                            mr: 2,
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {station.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {station.lineName}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

                      {/* Route Description */}
                      <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
                        <Typography variant="body1" color="text.secondary">
                          <strong>{station.name}</strong> から <strong>{destination}</strong> への経路
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ※ Yahoo!乗換案内で最新の経路情報を確認できます
                        </Typography>
                      </Box>

                      {/* Open Yahoo Transit Button */}
                      <Box sx={{ minWidth: { xs: '100%', md: '280px' }, flex: '0 0 auto' }}>
                        <Button
                          variant="contained"
                          fullWidth
                          size="large"
                          endIcon={<OpenInNewIcon />}
                          href={generateYahooTransitUrl(station.name, destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            bgcolor: station.color,
                            py: 1.5,
                            fontWeight: 'bold',
                            '&:hover': {
                              bgcolor: station.color,
                              opacity: 0.9,
                            },
                          }}
                        >
                          Yahoo!乗換案内で確認
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Information Box */}
            <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>使い方：</strong>
                各駅のボタンをクリックすると、Yahoo!乗換案内で経路を確認できます。
                所要時間、料金、乗換回数などの最新情報をご確認ください。
              </Typography>
            </Paper>
          </Box>
        )}

        {/* No Results Message */}
        {!showResults && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              目的地を入力して検索ボタンを押してください
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
