// Controlador para seleção de biblioteca WhatsApp

export default {
  selectLibrary: (req, res) => res.status(410).json({ error: 'Seleção de biblioteca descontinuada. Baileys é padrão.' }),
  getSelectedLibrary: (req, res) => res.json({ selectedLibrary: 'baileys' })
};
