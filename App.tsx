
// Placemarker: NO_BLEED_FIX_COMPLETE
// This marks the completion of the "No Bleed" fix.

import React, { useState, useMemo, useEffect } from 'react';
import { Client, BlogPost } from './types';
import ClientManager from './components/ClientManager';
import GenerationWorkflow from './components/GenerationWorkflow';
import ContentEditor from './components/ContentEditor';




import { BrainCircuitIcon } from './components/icons/BrainCircuitIcon';

export default function App(): React.ReactNode {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentBlogPost, setCurrentBlogPost] = useState<BlogPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedClient = useMemo(() => {
    const client = clients.find(c => c.id === selectedClientId) ?? null;
    console.log("DEBUG: App.tsx - Selected Client ID:", client?.id, "External Sitemap URLs:", client?.externalSitemapUrls, "Generated Blog Post URLs:", client?.generatedBlogPostUrls); // Updated log message
    return client;
  }, [clients, selectedClientId]);

  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    setCurrentBlogPost(null);
  };
  
  const resetToWorkflow = () => {
    setCurrentBlogPost(null);
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/clients`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (selectedClientId) {
      const fetchSitemapUrls = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/clients/${selectedClientId}/sitemap-urls`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const generatedBlogPostUrls = await response.json();
          
          setClients(prevClients => {
            const updatedClients = prevClients.map(client => 
              client.id === selectedClientId 
                ? { ...client, generatedBlogPostUrls: generatedBlogPostUrls } 
                : client
            );
            console.log("DEBUG: App.tsx - Updated Clients after fetching generated blog post URLs:", updatedClients); // Changed log message
            return updatedClients;
          });
        } catch (error) {
          console.error("Failed to fetch sitemap URLs:", error);
        }
      };
      fetchSitemapUrls();
    }
  }, [selectedClientId, setClients]);

  

  const handleClientChange = async (action: 'save' | 'delete', clientData?: Client) => {
    try {
      if (action === 'save' && clientData) {
        const method = clients.some(c => c.id === clientData.id) ? 'PUT' : 'POST';
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/clients${method === 'PUT' ? '/' + clientData.id : ''}`;
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else if (action === 'delete' && clientData?.id) {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/clients/${clientData.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      fetchClients(); // Refresh clients after change
    } catch (error) {
      console.error(`Failed to ${action} client:`, error);
    }
  };

  return (
    <div className="flex h-screen font-sans bg-slate-900 text-slate-200">
      <aside className="w-1/4 max-w-sm h-full bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
            <BrainCircuitIcon className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-100">Blog MONKEE</h1>
        </div>
        <ClientManager
          clients={clients}
          onClientChange={handleClientChange} // Changed prop
          selectedClientId={selectedClientId}
          onSelectClient={handleSelectClient}
          isGenerating={isGenerating}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedClient ? (
          currentBlogPost ? (
            <ContentEditor
              client={selectedClient}
              blogPost={currentBlogPost}
              setBlogPost={setCurrentBlogPost}
              onBack={resetToWorkflow}
            />
          ) : (
            <GenerationWorkflow
              client={selectedClient}
              onGenerationStart={() => setIsGenerating(true)}
              onGenerationComplete={(post) => {
                setCurrentBlogPost(post);
                setIsGenerating(false);
              }}
            />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <BrainCircuitIcon className="w-24 h-24 text-slate-700 mb-4" />
            <h2 className="text-2xl font-bold text-slate-400">Welcome to Blog MONKEE</h2>
            <p className="text-slate-500 mt-2">Please select a client from the sidebar, or add a new one to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
