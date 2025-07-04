// Controlador para seleção de biblioteca WhatsApp

let selectedLibrary = null;

const selectLibrary = (req, res) => {
  const { library } = req.body;
  if (library !== 'baileys' && library !== 'whatsappjs') {
    return res.status(400).json({ error: 'Biblioteca inválida. Use "baileys" ou "whatsappjs".' });
  }
  selectedLibrary = library;
  res.json({ message: `Biblioteca ${library} selecionada.` });
};

const getSelectedLibrary = (req, res) => {
  res.json({ selectedLibrary });
};

export default {
  selectLibrary,
  getSelectedLibrary,
};
