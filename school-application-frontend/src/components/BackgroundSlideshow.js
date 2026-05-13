import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const BackgroundSlideshow = ({ children }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const backgroundImages = [
    '/images/Zizamele.jpg',
    '/images/Banqobile.jpg',
    /*'/images/Masijabule.jpg',*/
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % backgroundImages.length
      );
    }, 10000); // Change image every 10 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
        backgroundSize: 'fillscreen',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'relative',
        transition: 'background-image 1s ease-in-out',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 26, 26, 0)',
          
          zIndex: 1,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default BackgroundSlideshow; 

