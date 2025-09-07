import { useState, useEffect } from 'react';
import AuthService from '../services/authService.js';
import { apiUrl } from '../utils/apiClient';

export function useTicketTags(ticketId) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ticketId) {
      fetchTags();
    } else {
      setTags([]);
    }
  }, [ticketId]);

  const fetchTags = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await AuthService.get(apiUrl(`/api/tags/ticket/${ticketId}`));
      
      if (response.ok) {
        const data = await response.json();
        const ticketTags = data.map(item => item.tag).filter(Boolean);
        setTags(ticketTags);
      } else {
        throw new Error('Erro ao carregar tags');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching ticket tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (tagId) => {
    if (!ticketId) return false;
    
    try {
      const response = await AuthService.post(apiUrl(`/api/tags/ticket/${ticketId}/tag/${tagId}`));

      if (response.ok) {
        await fetchTags(); // Refresh tags
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao adicionar tag');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error adding tag:', err);
      return false;
    }
  };

  const removeTag = async (tagId) => {
    if (!ticketId) return false;
    
    try {
      const response = await AuthService.delete(apiUrl(`/api/tags/ticket/${ticketId}/tag/${tagId}`));

      if (response.ok) {
        await fetchTags(); // Refresh tags
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover tag');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error removing tag:', err);
      return false;
    }
  };

  const updateTags = (newTags) => {
    setTags(newTags);
  };

  return {
    tags,
    loading,
    error,
    addTag,
    removeTag,
    updateTags,
    refetch: fetchTags
  };
}
