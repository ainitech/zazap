import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export default function LocationModal({ isOpen, onClose, onSend, isLoading = false }) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada neste navegador');
      return;
    }

    setIsGettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Permissão de geolocalização negada');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Localização não disponível');
            break;
          case error.TIMEOUT:
            setError('Timeout ao obter localização');
            break;
          default:
            setError('Erro desconhecido ao obter localização');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude deve ser um número entre -90 e 90');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude deve ser um número entre -180 e 180');
      return;
    }

    onSend(lat, lng, description.trim());
  };

  const handleClose = () => {
    setLatitude('');
    setLongitude('');
    setDescription('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <MapPinIcon className="h-5 w-5 text-red-500" />
            <span>Enviar Localização</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current Location Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation || isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GlobeAltIcon className="h-4 w-4" />
              <span>{isGettingLocation ? 'Obtendo localização...' : 'Usar minha localização atual'}</span>
            </button>
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Ex: -23.5505199"
                step="any"
                min="-90"
                max="90"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Ex: -46.6333094"
                step="any"
                min="-180"
                max="180"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Minha casa, Escritório, etc."
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Preview */}
          {latitude && longitude && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Prévia:</strong><br />
                Lat: {latitude}, Lng: {longitude}
                {description && <><br />Descrição: {description}</>}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <a 
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Ver no Google Maps
                </a>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !latitude || !longitude}
            >
              {isLoading ? 'Enviando...' : 'Enviar Localização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
