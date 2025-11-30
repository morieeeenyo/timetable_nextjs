import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';
import ViewListIcon from '@mui/icons-material/ViewList';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (router.pathname === '/') {
      setValue(0);
    } else if (router.pathname === '/all-timetable') {
      setValue(1);
    } else if (router.pathname === '/search') {
      setValue(2);
    } else {
      setValue(-1); // For other pages like station details
    }
  }, [router.pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <TrainIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            住吉区時刻表
          </Typography>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flexGrow: 1, py: 4, pb: 10 }}>
        {children}
      </Container>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            if (newValue === 0) {
              router.push('/');
            } else if (newValue === 1) {
              router.push('/all-timetable');
            } else if (newValue === 2) {
              router.push('/search');
            }
          }}
        >
          <BottomNavigationAction label="駅一覧" icon={<TrainIcon />} />
          <BottomNavigationAction label="全駅時刻表" icon={<ViewListIcon />} />
          <BottomNavigationAction label="経路比較" icon={<CompareArrowsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
