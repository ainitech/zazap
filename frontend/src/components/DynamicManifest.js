import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

export const DynamicManifest = () => {
  const { getSetting, getLogoUrl } = useSettings();

  useEffect(() => {
    const updateManifest = () => {
      const companyName = getSetting('company_name', 'Zazap');
      const systemTitle = getSetting('system_title', 'Zazap - Sistema de Atendimento');
      const logoUrl = getLogoUrl();

      // Atualizar manifest link
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }

      // Criar manifest dinâmico
      const manifest = {
        name: systemTitle,
        short_name: companyName,
        description: `${companyName} - Sistema completo de atendimento via WhatsApp`,
        start_url: "/",
        display: "standalone",
        theme_color: getSetting('primary_color', '#1e293b'),
        background_color: "#1e293b",
        orientation: "portrait-primary",
        categories: ["business", "productivity"],
        lang: "pt-BR",
        icons: []
      };

      // Se tiver logo customizado, usar ele como ícone
      if (logoUrl) {
        const sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"];
        manifest.icons = sizes.map(size => ({
          src: logoUrl,
          sizes: size,
          type: "image/png",
          purpose: "any maskable"
        }));
      } else {
        // Usar ícones padrão
        const sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"];
        manifest.icons = sizes.map(size => ({
          src: `/icons/icon-${size}.png`,
          sizes: size,
          type: "image/png",
          purpose: "any maskable"
        }));
      }

      // Converter para blob URL
      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestUrl = URL.createObjectURL(manifestBlob);
      
      // Revogar URL anterior se existir
      if (manifestLink.href && manifestLink.href.startsWith('blob:')) {
        URL.revokeObjectURL(manifestLink.href);
      }
      
      manifestLink.href = manifestUrl;

      // Atualizar título da página
      document.title = systemTitle;

      // Atualizar meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.content = `${companyName} - Sistema completo de atendimento WhatsApp`;
      }

      // Atualizar apple-mobile-web-app-title
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) {
        appleTitle.content = companyName;
      }

      // Atualizar theme-color se necessário
      const primaryColor = getSetting('primary_color', '#1e293b');
      let themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor && themeColor.content !== primaryColor) {
        themeColor.content = primaryColor;
      }
    };

    // Atualizar manifest quando as configurações mudarem
    updateManifest();
  }, [getSetting, getLogoUrl]);

  return null; // Este componente não renderiza nada
};

export default DynamicManifest;
