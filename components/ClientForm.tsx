import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import useSitemap from '../hooks/useSitemap';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client, externalSitemapUrls: string[], sitemapLoading: boolean, sitemapError: string | null) => void; // Modified
  existingClient: Client | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, onSave, existingClient }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    industry: '',
    websiteUrl: '',
    sitemapUrl: '', // Added
    uniqueValueProp: '',
    brandVoice: '',
    contentStrategy: '',
    wp: { url: '', username: '', appPassword: '' },
  });

  useEffect(() => {
    console.log("DEBUG: ClientForm.tsx - useEffect - existingClient ID:", existingClient?.id, "sitemapUrl from existingClient:", existingClient?.sitemapUrl); // Added log
    if (existingClient) {
      setFormData({
        ...existingClient,
        sitemapUrl: existingClient.sitemapUrl || '', // Added
        contentStrategy: existingClient.contentStrategy || '',
        wp: { ...existingClient.wp, appPassword: '' }
      });
    } else {
      setFormData({
        name: '', industry: '', websiteUrl: '', sitemapUrl: '', uniqueValueProp: '', brandVoice: '', contentStrategy: '',
        wp: { url: '', username: '', appPassword: '' },
      });
    }
    console.log("DEBUG: ClientForm.tsx - useEffect - formData.sitemapUrl after setFormData:", formData.sitemapUrl); // Added log
  }, [existingClient, isOpen]);

  const { urls: sitemapUrls, loading: sitemapLoading, error: sitemapError } = useSitemap(formData.sitemapUrl); // Added

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('wp.')) {
      const wpField = name.split('.')[1];
      setFormData(prev => ({ ...prev, wp: { ...prev.wp, [wpField]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DEBUG: ClientForm.tsx - handleSubmit - formData.sitemapUrl:", formData.sitemapUrl); // Added log
    console.log("DEBUG: ClientForm.tsx - handleSubmit - sitemapUrls from useSitemap:", sitemapUrls); // Added log
    if (!formData.name || !formData.industry) {
        alert("Client Name and Industry are required.");
        return;
    }
    // Add validation for sitemap loading/error if needed, or handle it in ClientManager
    if (sitemapLoading) {
      alert("Sitemap is still loading. Please wait.");
      return;
    }
    if (sitemapError) {
      alert(`Sitemap error: ${sitemapError}. Please check the URL.`);
      return;
    }

    const clientToSave: Client = {
      ...formData,
      id: existingClient?.id || crypto.randomUUID(),
      wp: {
        ...formData.wp,
        appPassword: formData.wp.appPassword || existingClient?.wp.appPassword,
      },
      externalSitemapUrls: sitemapUrls, // Changed to externalSitemapUrls
    };
    onSave(clientToSave, sitemapUrls, sitemapLoading, sitemapError); // Modified
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingClient ? 'Edit Client' : 'Add New Client'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="name" name="name" label="Client Name*" value={formData.name} onChange={handleChange} required />
          <Input id="industry" name="industry" label="Industry*" value={formData.industry} onChange={handleChange} required />
        </div>
        <Input id="websiteUrl" name="websiteUrl" label="Website URL" value={formData.websiteUrl} onChange={handleChange} />
        <Input id="sitemapUrl" name="sitemapUrl" label="Sitemap URL" value={formData.sitemapUrl || ''} onChange={handleChange} placeholder="https://example.com/sitemap.xml" />
        <Textarea id="uniqueValueProp" name="uniqueValueProp" label="Unique Value Proposition" value={formData.uniqueValueProp} onChange={handleChange} rows={3} />
        <Textarea id="brandVoice" name="brandVoice" label="Brand Voice Description" value={formData.brandVoice} onChange={handleChange} rows={3} />
        <Textarea id="contentStrategy" name="contentStrategy" label="Content Strategy" value={formData.contentStrategy} onChange={handleChange} rows={3} />
        
        <h3 className="text-lg font-semibold border-t border-slate-700 pt-4 mt-4 text-slate-300">WordPress Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="wp.url" name="wp.url" label="WordPress Site URL" value={formData.wp.url} onChange={handleChange} placeholder="https://example.com" />
          <Input id="wp.username" name="wp.username" label="WP Username" value={formData.wp.username} onChange={handleChange} />
        </div>
        <Input id="wp.appPassword" name="wp.appPassword" label="WP Application Password" value={formData.wp.appPassword || ''} onChange={handleChange} type="password" placeholder={existingClient ? 'Leave blank to keep existing' : ''} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Client</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientForm;