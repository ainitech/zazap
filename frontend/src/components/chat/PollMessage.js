import React from 'react';

const PollMessage = ({ message, isUser }) => {
  // Função para detectar se a mensagem é uma enquete
  const isPollMessage = (message) => {
    return message.messageType === 'poll' || (message.pollData && message.content);
  };

  // Função para detectar se a mensagem é uma resposta de enquete
  const isPollResponse = (message) => {
    return message.messageType === 'poll_response' || (message.pollResponse !== null && message.pollResponse !== undefined);
  };

  // Função para extrair dados da enquete
  const extractPollData = (message) => {
    if (message.pollData) {
      try {
        return JSON.parse(message.pollData);
      } catch {
        // Fallback para dados antigos
        return {
          question: message.content,
          options: [],
          allowMultipleAnswers: false
        };
      }
    }

    // Fallback para dados antigos no content
    try {
      const pollData = JSON.parse(message.content);
      if (pollData.type === 'poll' || (pollData.question && pollData.options)) {
        return pollData;
      }
    } catch {
      // Fallback: tentar extrair de texto formatado
      const lines = message.content.split('\n');
      if (lines.length > 1) {
        const question = lines[0].replace(/^(📊|Enquete:|Poll:)\s*/, '');
        const options = lines.slice(1).filter(line => line.trim().startsWith('•') || line.trim().match(/^\d+\./));

        return {
          question,
          options: options.map(opt => opt.replace(/^•\s*|\d+\.\s*/, '').trim()),
          allowMultipleAnswers: false
        };
      }
    }

    return null;
  };

  // Se for resposta de enquete
  if (isPollResponse(message)) {
    return (
      <div className="poll-response bg-gradient-to-br from-green-50/20 to-emerald-50/20 border border-green-200/30 rounded-lg p-3 my-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-green-300">Resposta da Enquete</span>
        </div>
        <div className="text-sm text-slate-200">
          Opção selecionada: <span className="font-medium text-green-300">{message.pollResponse !== null ? `Opção ${message.pollResponse + 1}` : 'N/A'}</span>
        </div>
        {message.content && (
          <div className="text-xs text-slate-400 mt-1">
            {message.content}
          </div>
        )}
      </div>
    );
  }

  // Se não for enquete, não renderizar
  if (!isPollMessage(message)) {
    return null;
  }

  const pollData = extractPollData(message);

  if (!pollData) {
    return null; // Não conseguiu extrair dados da enquete
  }

  return (
    <div className="poll-message bg-gradient-to-br from-blue-50/20 to-indigo-50/20 border border-blue-200/30 rounded-lg p-4 my-2 backdrop-blur-sm">
      {/* Ícone e título da enquete */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-blue-300">Enquete</span>
      </div>

      {/* Pergunta da enquete */}
      <div className="mb-3">
        <h4 className="text-white font-medium text-sm leading-relaxed">
          {pollData.question}
        </h4>
      </div>

      {/* Opções da enquete */}
      <div className="space-y-2">
        {pollData.options && pollData.options.map((option, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 bg-black/10 rounded-lg border border-white/5 hover:bg-black/20 transition-colors duration-200"
          >
            <div className="w-4 h-4 bg-slate-600/50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-slate-400">{index + 1}</span>
            </div>
            <span className="text-sm text-slate-200 flex-1">{option}</span>
            {isUser && (
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Informações adicionais */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {pollData.allowMultipleAnswers ? 'Múltiplas respostas permitidas' : 'Uma resposta por pessoa'}
          </span>
          <span>
            {pollData.options ? pollData.options.length : 0} opção{pollData.options && pollData.options.length !== 1 ? 'ões' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PollMessage;
