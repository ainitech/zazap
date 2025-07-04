import React from 'react';
import { 
  VideoCameraIcon,
  PhoneIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function ContactInfo({ selectedTicket, showContactInfo }) {
  const getAvatarInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getRandomAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!showContactInfo || !selectedTicket) {
    return null;
  }

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Contact Header */}
      <div className="p-6 border-b border-slate-700 text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-lg font-medium ${getRandomAvatarColor(selectedTicket.contact)}`}>
          {getAvatarInitials(selectedTicket.contact)}
        </div>
        <h3 className="text-white text-lg font-medium mb-1">{selectedTicket.contact}</h3>
        <p className="text-slate-400 text-sm mb-4">
          {selectedTicket.contact.includes('@') ? selectedTicket.contact : `+${selectedTicket.contact}`}
        </p>
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-3">
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <VideoCameraIcon className="w-5 h-5" />
          </button>
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="p-6 border-b border-slate-700">
        <h4 className="text-white font-medium mb-4">Attachment</h4>
        <div className="grid grid-cols-3 gap-2">
          {/* Mock attachment images */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square bg-slate-700 rounded-lg"></div>
          ))}
          <div className="aspect-square bg-slate-700 rounded-lg flex items-center justify-center">
            <span className="text-slate-400 text-sm">More+</span>
          </div>
        </div>
      </div>

      {/* Files Section */}
      <div className="p-6">
        <div className="space-y-3">
          {[
            { name: 'Office Data.doc', date: '20 February 2022', size: '12 MB', type: 'doc' },
            { name: 'Schedule.pdf', date: '24 February 2022', size: '8.5 MB', type: 'pdf' },
            { name: 'Package Design.xls', date: '17 January 2022', size: '12 MB', type: 'xls' }
          ].map((file, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">{file.type.toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{file.name}</p>
                <p className="text-slate-400 text-xs">{file.date} • {file.size}</p>
              </div>
              <button className="text-slate-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
