import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

// Hook para aplicar cores dinâmicas baseadas nas configurações
export const useDynamicColors = () => {
  const { getSetting } = useSettings();
  
  useEffect(() => {
    const primaryColor = getSetting('primary_color', '#eab308');
    
    if (primaryColor) {
      // Aplicar cor primária como variável CSS
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      
      // Gerar variações da cor primária
      const rgb = hexToRgb(primaryColor);
      if (rgb) {
        // Versões com transparência
        document.documentElement.style.setProperty('--primary-color-10', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
        document.documentElement.style.setProperty('--primary-color-20', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
        document.documentElement.style.setProperty('--primary-color-30', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
        document.documentElement.style.setProperty('--primary-color-40', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        document.documentElement.style.setProperty('--primary-color-50', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
        
        // Versões mais escuras
        document.documentElement.style.setProperty('--primary-color-dark', darkenColor(primaryColor, 10));
        document.documentElement.style.setProperty('--primary-color-darker', darkenColor(primaryColor, 20));
        
        // Versões mais claras
        document.documentElement.style.setProperty('--primary-color-light', lightenColor(primaryColor, 10));
        document.documentElement.style.setProperty('--primary-color-lighter', lightenColor(primaryColor, 20));
      }
      
      console.log('🎨 Cores dinâmicas aplicadas:', primaryColor);
    }
  }, [getSetting]);
  
  return {
    primaryColor: getSetting('primary_color', '#eab308')
  };
};

// Função auxiliar para converter hex para rgb
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Função auxiliar para escurecer cor
const darkenColor = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = (100 - percent) / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Função auxiliar para clarear cor
const lightenColor = (hex, percent) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export default useDynamicColors;
